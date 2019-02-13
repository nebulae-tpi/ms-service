'use strict'


const { of, timer, forkJoin, Observable, iif, from, empty } = require("rxjs");
const { toArray, mergeMap, map, tap, filter, delay, mapTo, switchMap } = require('rxjs/operators');

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();
const driverAppLinkBroker = require("../../services/driver-app-link/DriverAppLinkBroker")();

const { ServiceDA, ShiftDA } = require('./data-access')

/**
 * Singleton instance
 */
let instance;

class ServiceES {

    constructor() {
    }

        /**
     * Handles EventSourcing Event ServiceRequested.
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceRequested$({ aid, data }) {
        console.log(`ServiceES: handleServiceRequested: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE

        const { pickUp, client, businessId, timestamp } = data;

        const maxDistance = client.offerMaxDistance || parseInt(process.env.SERVICE_OFFER_MAX_DISTANCE);
        const minDistance = client.offerMinDistance || parseInt(process.env.SERVICE_OFFER_MIN_DISTANCE);
        const clientLocation = pickUp.marker;
        const priorityDriver = client.referrerDriverDocumentId;
        const projection = { "driver.username": 1, "driver.documentID": 1, "businessId": 1, "timestamp": 1 };


        console.log(`===== OFFERING ${JSON.stringify({ maxDistance, minDistance, clientLocation, priorityDriver, client })}==========`);

        if (!clientLocation || clientLocation.type !== 'Point'
            || !clientLocation.coordinates || clientLocation.coordinates.length !== 2
            || clientLocation.coordinates[0] === 0 || clientLocation.coordinates[1] === 0) {
            console.error(`WARNING: ServiceES.handleServiceRequested: received an offer with an invalid client location ${JSON.stringify({ aid, ...data })} `);
            return of({});
        }

        return ShiftDA.findServiceOfferCandidates$(businessId, clientLocation, maxDistance, minDistance, projection).pipe(
            tap(shift => console.log(`===== OFFERING ${aid} To shift ${shift._id}==========`)),
            delay(200),
            mergeMap(shift => ServiceDA.addShiftToActiveOffers$(aid, shift._id).pipe(mapTo(shift))),
            mergeMap(shift => driverAppLinkBroker.sendServiceEventToDrivers$(
                shift.businessId,
                shift.driver.username,
                'ServiceOffered', { _id: aid, timestamp: Date.now(), pickUp: { ...pickUp, location: undefined } }
            ))
        );
    }

    /**
     * Handles EventSourcing Event ServiceRequested
     * @param {Event} evt 
     * @returns {Observable}
     */
    // handleServiceRequested$({ aid, data }) {
    //     console.log(`ServiceES: handleServiceRequested: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE

    //     return Observable.create(obs => {
    //         const { pickUp, client, businessId, timestamp } = data;

    //         const maxDistance = client.offerMaxDistance || parseInt(process.env.SERVICE_OFFER_MAX_DISTANCE);
    //         const minDistance = client.offerMinDistance || parseInt(process.env.SERVICE_OFFER_MIN_DISTANCE);
    //         const clientLocation = pickUp.marker;
    //         const priorityDriver = client.referrerDriverDocumentId;
    //         const offerTotalSpan = parseInt(process.env.SERVICE_OFFER_TOTAL_SPAN);
    //         const offerSearchSpan = parseInt(process.env.SERVICE_OFFER_SEARCH_SPAN);
    //         const offerShiftSpan = parseInt(process.env.SERVICE_OFFER_SHIFT_SPAN);

    //         console.log(`===== WILL OFFER ${JSON.stringify({ maxDistance, minDistance, clientLocation, priorityDriver, client })}==========`);

    //         if (!clientLocation || clientLocation.type !== 'Point'
    //             || !clientLocation.coordinates || clientLocation.coordinates.length !== 2
    //             || clientLocation.coordinates[0] === 0 || clientLocation.coordinates[1] === 0) {
    //             console.error(`WARNING: ServiceES.handleServiceRequested: received an offer with an invalid client location ${JSON.stringify({ aid, ...data })} `);
    //             return of({});
    //         }

    //         timer(200, offerTotalSpan).pipe(
    //             switchMap(firstTime =>
    //                 iif(() => !firstTime,
    //                     this.searchAndOfferService$({ serviceId: aid, maxDistance, minDistance, clientLocation, priorityDriver, offerSearchSpan, offerShiftSpan, pickUp }),
    //                     this.onServiceTotalSpanCompleted$(aid)
    //                 )
    //             )
    //         ).subscribe(
    //             (evt) => { console.log(`ServiceES.handleServiceRequested.obs.evt:[${evt.t}]: ${JSON.stringify(evt)}`); },
    //              (handlerErr) => {
    //                 console.error(`ServiceES.handleServiceRequested.obs.error[${evt.t}]( ${JSON.stringify(evt.data)} ): ${handlerErr}`);
    //                 ServiceES.logError(handlerErr);
    //             },
    //             () => console.log(`ServiceES.handleServiceRequested.obs.completed[${aid}]`),
    //         );
    //         obs.next(`ServiceES: handleServiceRequested: subscription for service ${aid} started`);
    //         obs.complete();
    //     });


    // }

    searchAndOfferService$({ serviceId, maxDistance, minDistance, clientLocation, priorityDriver, offerSearchSpan, offerShiftSpan, pickUp }) {

        return timer(0, offerSearchSpan).pipe(
            tap(x => {
                console.log('+++++++++++');
                console.log('+++++++++++');
                console.log('+++++++++++');
            }),
            tap(x => console.log(` =================> searchAndOfferService ${x}  `)),
            switchMap(i => ServiceDA.findById$(serviceId, { "businessId": 1, "timestamp": 1, "offers": 1 })),
            mergeMap(service => ShiftDA.findServiceOfferCandidates$(service.businessId, clientLocation, maxDistance, minDistance, { "driver.username": 1, "businessId": 1, "driver.documentId": 1 }).pipe(toArray(), map(shifts => ({ shifts, service })))),
            map(({ service, shifts }) => this.sortAndFilterShifts(service, shifts, priorityDriver)),
            mergeMap(shifts => from(shifts)),

            mergeMap(shift => {
                const delayVal = shift.first ? 0 : offerShiftSpan;
                return of(shift).pipe(
                    delay(delayVal),
                    mergeMap(() => ServiceDA.addShiftToActiveOffers$(serviceId, shift._id)),
                    mergeMap(() => driverAppLinkBroker.sendServiceEventToDrivers$(
                        shift.businessId,
                        shift.driver.username,
                        'ServiceOffered', { _id: serviceId, timestamp: Date.now(), pickUp: { ...pickUp, location: undefined } }
                    ))
                )
            }),
        );
    }

    sortAndFilterShifts(service, shifts, priorityDriver = undefined) {
        const shiftsToIgnore = service.offers ? Object.keys(service.offers) : [];
        let filteredShifts = shifts.filter(s => !shiftsToIgnore.includes(s._id));

        console.log("!!!!!!!!!!!!!!!!");
        console.log("!!!!!!!!!!!!!!!!");
        console.log(JSON.stringify(filteredShifts));
        console.log("!!!!!!!!!!!!!!!!");
        console.log("!!!!!!!!!!!!!!!!");

        const priorityShift = !priorityDriver ? undefined : filteredShifts.filter(s => s.driver.documentId === priorityDriver)[0];
        if (priorityShift) {
            filteredShifts = filteredShifts.filter(s => s.driver.documentId !== priorityDriver);
            filteredShifts.unshift(priorityShift);
        }
        if (filteredShifts.length > 0) {
            filteredShifts[0].first = true;
        }
        console.log(` Shift Candidates : ${filteredShifts.map(s => s._id + " / " + s.driver.username)} `);
        return filteredShifts;
    }

    onServiceTotalSpanCompleted$(serviceId) {

        return of(`INFO: Total offer span exceded for service ${serviceId}`).pipe(
            tap(x => {
                console.log('^^^^^^^^^^^^^^');
                console.log('^^^^^^^^^^^^^^');
                console.log('^^^^^^^^^^^^^^');
                console.log('^^^^^^^^^^^^^^');
            }),
            mergeMap(x => empty())
        );
    }

    /**
     * Handles EventSourcing Event ServiceAssigned
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceAssigned$({ aid, data }) {
        console.log(`ServiceES: handleServiceAssigned: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return ServiceDA.findById$(
            aid,
            {
                "timestamp": 1, "requestedFeatures": 1, "pickUp": 1, "dropOff": 1,
                "verificationCode": 1, "fareDiscount": 1, "fare": 1, "state": 1, "tip": 1, "client": 1,
                "driver.username": 1, "businessId": 1
            }).pipe(
                map(dbService =>
                    (
                        {
                            dbService,
                            formattedService: {
                                ...dbService,
                                pickUp: this.formatPickUpDropOff(dbService.pickUp),
                                dropOff: this.formatPickUpDropOff(dbService.dropOff),
                                state: 'ASSIGNED' // the state might not be persisted yet
                            }
                        }
                    )
                ),
                mergeMap(({ dbService, formattedService }) => {
                    return forkJoin(
                        //Send ServiceAssigned to the winner
                        driverAppLinkBroker.sendServiceEventToDrivers$(
                            dbService.businessId, dbService.driver.username, 'ServiceAssigned', formattedService),
                        //Send ServiceOfferWithdraw to the losers
                        driverAppLinkBroker.sendServiceEventToDrivers$(
                            dbService.businessId, 'all', 'ServiceOfferWithdraw', { _id: formattedService._id }),
                    );
                }),

            );
    }

    /**
     * Handles EventSourcing Event ServiceArrived
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceArrived$({ aid, data }) {
        console.log(`ServiceES: handleServiceArrived: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 }).pipe(
            filter(service => service.driver && service.driver.username),
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceStateChanged', { _id: service._id, state: 'ARRIVED' })),
        );
    }

    /**
     * Handles EventSourcing Event ServicePassengerBoarded
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServicePassengerBoarded$({ aid, data }) {
        console.log(`ServiceES: handleServicePassengerBoarded: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 }).pipe(
            filter(service => service.driver && service.driver.username),
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceStateChanged', { _id: service._id, state: 'ON_BOARD' })),
        );
    }

    /**
     * Handles EventSourcing Event ServiceCompleted
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCompleted$({ aid, data }) {
        console.log(`ServiceES: handleServiceCompleted: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 }).pipe(
            filter(service => service.driver && service.driver.username),
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceStateChanged', { _id: service._id, state: 'DONE' })),
        );
    }



    /**
     * Handles EventSourcing Event ServiceCancelledByDriver
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByDriver$({ aid, data }) {
        console.log(`ServiceES: handleServiceCancelledByDriver: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 }).pipe(
            filter(service => service.driver && service.driver.username),
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceStateChanged', { _id: service._id, state: 'CANCELLED_DRIVER' })),
        );
    }

    /**
     * Handles EventSourcing Event ServiceCancelledByClient
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByClient$({ aid, data }) {
        console.log(`ServiceES: handleServiceCancelledByClient: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 }).pipe(
            filter(service => service.driver && service.driver.username),
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceCancelledByClient', { ...data, _id: service._id, state: 'CANCELLED_CLIENT' })),
        );
    }

    /**
     * Handles EventSourcing Event ServiceCancelledByOperator
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByOperator$({ aid, data }) {
        console.log(`ServiceES: handleServiceCancelledByOperator: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 }).pipe(
            filter(service => service.driver && service.driver.username),
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceCancelledByOperator', { ...data, _id: service._id, state: 'CANCELLED_OPERATOR' })),
        );
    }


    //#region Object builders

    /**
     * Transforms an Mongo/Event location format to a GraphQL-like format
     * @param {*} location 
     */
    formatPickUpDropOff(location) {
        return !location
            ? undefined
            : {
                ...location,
                marker: !location.marker
                    ? undefined
                    : { lng: location.marker.coordinates[0], lat: location.marker.coordinates[1] },
                polygon: !location.polygon
                    ? undefined
                    : location.polygon.coordinates[0].map(([lng, lat]) => ({ lng, lat }))
            };
    }


    //#endregion





    //#region NOT BEING CALLED AT THE MOMENT



    /**
     * Handles EventSourcing Event ServicePickUpETAReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServicePickUpETAReported$(evt) {
        //NOT BEING CALLED FROM EVENT-STORE SERVICE
        return of({});
    }

    /**
     * Handles EventSourcing Event ServiceLocationReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceLocationReported$(evt) {
        //NOT BEING CALLED FROM EVENT-STORE SERVICE
        return of({});
    }

    /**
     * Handles EventSourcing Event ServiceDropOffETAReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceDropOffETAReported$(evt) {
        //NOT BEING CALLED FROM EVENT-STORE SERVICE
        return of({});
    }

    //#endregion


    /**
     * Logs an error at the console.error printing only the message and the stack related to the project source code
     * @param {Error} error 
     */
    static logError(error) {
        if (!error.stack) {
            console.error(error);
            return;
        }
        try {
            const stackLines = error.stack.split('\n');
            console.error(
                new Date().toString() + ': ' + stackLines[0] + '\n' + stackLines.filter(line => line.includes('driver-app-link/bin')).join('\n') + '\n'
            );
        }
        catch (e) {
            console.error(e);
            console.error(error);
        }
    }
}

/**
 * @returns {ServiceES}
 */
module.exports = () => {
    if (!instance) {
        instance = new ServiceES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};