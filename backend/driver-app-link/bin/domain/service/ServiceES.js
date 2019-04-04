'use strict'


const { of, timer, forkJoin, Observable, iif, from, empty } = require("rxjs");
const { toArray, mergeMap, map, tap, filter, delay, mapTo, switchMap } = require('rxjs/operators');
const dateFormat = require('dateformat');

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
        //console.log(`ServiceES: handleServiceRequested: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE

        const localDate = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
        const localHour = localDate.getHours();
        const extendedDistanceHours = (process.env.SERVICE_OFFER_EXTENDED_DISTANCE_HOURS || "22_23_0_1_2_3_4").split('_').map(h => parseInt(h));
        let maxDistance = data.client.offerMaxDistance || parseInt(process.env.SERVICE_OFFER_MAX_DISTANCE);
        if (extendedDistanceHours.includes(localHour)) {
            let extendedDistance = parseInt(process.env.SERVICE_OFFER_EXTENDED_DISTANCE || "1500");
            if (extendedDistance && extendedDistance > maxDistance) {
                maxDistance = extendedDistance;
            }
        }

        const minDistance = data.client.offerMinDistance || parseInt(process.env.SERVICE_OFFER_MIN_DISTANCE);
        const serviceId = aid;
        const referrerDriverDocumentId = data.client.referrerDriverDocumentId;

        return Observable.create(obs => {
            this.imperativeServiceOfferAlgorithm$(serviceId, minDistance, maxDistance, referrerDriverDocumentId).subscribe(
                (evt) => {
                    //console.log(`${dateFormat(new Date(), "isoDateTime")} imperativeServiceOfferAlgorithm(serviceId=${serviceId}) EVT: ${evt}`);
                },
                (error) => console.error(`${dateFormat(new Date(), "isoDateTime")} imperativeServiceOfferAlgorithm(serviceId=${serviceId}) ERROR: ${error}`),
                () => {
                    //console.error(`${dateFormat(new Date(), "isoDateTime")} imperativeServiceOfferAlgorithm(serviceId=${serviceId}) COMPL: COMPLETED\n`);
                },
            );
            obs.next(`ServiceES: handleServiceRequested: created subscription for imperativeServiceOfferAlgorithm(serviceId=${serviceId})`);
            obs.complete;
        });
    }

    imperativeServiceOfferAlgorithm$(serviceId, minDistance, maxDistance, referrerDriverDocumentId) {
        return Observable.create(async obs => {

            const offerTotalSpan = parseInt(process.env.SERVICE_OFFER_TOTAL_SPAN);
            const offerSearchSpan = parseInt(process.env.SERVICE_OFFER_SEARCH_SPAN);
            const offerShiftSpan = parseInt(process.env.SERVICE_OFFER_SHIFT_SPAN);
            const offerTotalThreshold = offerTotalSpan + Date.now();

            obs.next(`input params: ${JSON.stringify({ minDistance, maxDistance, offerTotalSpan, offerSearchSpan, offerShiftSpan, offerTotalThreshold, referrerDriverDocumentId })}`);

            let service = undefined;
            let retries = 0;
            while (!service && retries < 5) {
                retries++;
                await timer(200).toPromise();// time for the service to be persisted 
                service = await ServiceDA.updateOfferParamsAndfindById$(
                    serviceId,
                    {
                        offer: {
                            searchCount: 0,
                            shifts: {},
                            params: { minDistance, maxDistance, offerTotalSpan, offerSearchSpan, offerShiftSpan }
                        }
                    }).toPromise();
            }
            if (!service) {
                throw new Error(`Service not found when trying to offer at imperativeServiceOfferAlgorithm; serviceId=${serviceId}; retries=${retries}`);
            }

            obs.next(`queried Service: ${JSON.stringify({ state: service.state, minDistance: service.offer.params.minDistance })}`);

            let needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
            let needToBeCancelledBySystem = true;
            while (needToOffer) {

                //find available shifts
                let shifts = await ShiftDA.findServiceOfferCandidates$(
                    service.businessId,
                    service.pickUp.marker || service.pickUp.polygon,
                    service.requestedFeatures,
                    Object.keys(service.offer.shifts),
                    service.offer.params.maxDistance,
                    0,//min distance form mongo is always zero
                    { "driver": 1, "vehicle": 1 }
                ).toPromise();

                shifts = shifts.filter(s => !Object.keys(service.offer.shifts).includes(s._id));
                obs.next(`raw shift candidates: ${JSON.stringify(shifts.map(s => ({ driver: s.driver.username, distance: s.dist.calculated, documentId: s.driver.documentId })))} `);

                if (service.client && service.client.referrerDriverDocumentId) {
                    const priorityShift = shifts.filter(sh => sh.driver.documentId === service.client.referrerDriverDocumentId)[0];
                    if (priorityShift) {
                        shifts = shifts.filter(s => s.driver.documentId !== priorityShift.driver.documentId);
                        shifts.unshift({ ...priorityShift, referred: true });
                        obs.next(`referred found between candidates: ${JSON.stringify({ driver: priorityShift.driver.username, distance: priorityShift.dist.calculated, documentId: priorityShift.driver.documentId })} `);
                    }
                }

                shifts = shifts.filter(s => s.referred || (s.dist.calculated > service.offer.params.minDistance));
                obs.next(`filterd shift candidates: ${JSON.stringify(shifts.map(s => ({ driver: s.driver.username, distance: s.dist.calculated, documentId: s.driver.documentId })))} `);

                const offerSearchThreshold = offerSearchSpan + Date.now();

                if (shifts.length > 0) {
                    for (let i = 0, len = shifts.length; needToOffer && Date.now() < offerSearchThreshold && i < len; i++) {
                        const shift = shifts[i];
                        obs.next(`offering to shift: ${JSON.stringify({ driver: shift.driver.username, distance: shift.dist.calculated, documentId: shift.driver.documentId })}`);
                        await ServiceDA.addShiftToActiveOffers$(service._id, shift._id, shift.dist.calculated, shift.referred === true, shift.driver.id, shift.driver.username, shift.vehicle.licensePlate).toPromise();
                        await driverAppLinkBroker.sendServiceEventToDrivers$(
                            shift.businessId,
                            shift.driver.username,
                            'ServiceOffered', { _id: serviceId, timestamp: Date.now(), tip: service.tip, pickUp: { ...service.pickUp, location: undefined }, dropOffSpecialType: service.dropOffSpecialType, expirationTime: offerTotalThreshold }
                        ).toPromise();

                        await eventSourcing.eventStore.emitEvent$(
                            ServiceES.buildEventSourcingEvent(
                                'Service',
                                serviceId,
                                'ServiceOfferedToShift',
                                {
                                    distance: shift.dist.calculated,
                                    username: shift.driver.username,
                                    documentId: shift.driver.documentId,
                                    licensePlate: shift.vehicle.licensePlate,
                                },
                                'SYSTEM', 1, true
                            )
                        ).toPromise();

                        //re-eval service state\/
                        await timer(offerShiftSpan).toPromise();
                        service = await ServiceDA.updateOfferParamsAndfindById$(serviceId, undefined, { "offer.offerCount": 1 }).toPromise();
                        obs.next(`queried Service: ${JSON.stringify({ state: service.state, minDistance: service.offer.params.minDistance })}`);
                        needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
                        needToBeCancelledBySystem = service.state === 'REQUESTED';
                    }
                } else {
                    if (service.offer.params.minDistance !== 0) {
                        obs.next(`no shifts found on searched area, will remove minDistance on next search`);
                        service = await ServiceDA.updateOfferParamsAndfindById$(serviceId, { "offer.params.minDistance": 0 }, { "offer.searchCount": 1 }).toPromise();
                        obs.next(`queried Service: ${JSON.stringify({ state: service.state, minDistance: service.offer.params.minDistance })}`);
                        needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
                        needToBeCancelledBySystem = service.state === 'REQUESTED';
                    } else {
                        //re-eval service state
                        await timer(offerShiftSpan).toPromise();
                        service = await ServiceDA.updateOfferParamsAndfindById$(serviceId, undefined, { "offer.searchCount": 1 }).toPromise();
                        obs.next(`queried Service: ${JSON.stringify({ state: service.state, minDistance: service.offer.params.minDistance })}`);
                        needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
                        needToBeCancelledBySystem = service.state === 'REQUESTED';
                    }
                    await eventSourcing.eventStore.emitEvent$(
                        ServiceES.buildEventSourcingEvent(
                            'Service',
                            serviceId,
                            'ServiceOfferUpdated',
                            {
                                offer: { ...service.offer, shifts: undefined }
                            },
                            'SYSTEM', 1, true
                        )
                    ).toPromise();
                }

            }
            if (needToBeCancelledBySystem) {
                await eventSourcing.eventStore.emitEvent$(
                    ServiceES.buildEventSourcingEvent(
                        'Service',
                        serviceId,
                        'ServiceCancelledBySystem',
                        { reason: 'DRIVERS_NOT_AVAILABLE', notes: "" },
                        'SYSTEM'
                    )
                ).toPromise();
            }
            obs.complete();
        });

    }


    /**
     * Handles EventSourcing Event ServiceAssigned
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceAssigned$({ aid, data }) {
        //console.log(`ServiceES: handleServiceAssigned: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({})
            .pipe(
                delay(300),
                mergeMap(() => {
                    return ServiceDA.findById$(aid,
                        {
                            "timestamp": 1, "requestedFeatures": 1, "pickUp": 1, "dropOff": 1,
                            "verificationCode": 1, "fareDiscount": 1, "fare": 1, "state": 1, "tip": 1, "client": 1,
                            "driver.username": 1, "businessId": 1
                        });
                }),
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
        //console.log(`ServiceES: handleServiceArrived: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({}).pipe(
            delay(300),
            mergeMap(() => ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 })),
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
        //console.log(`ServiceES: handleServicePassengerBoarded: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({}).pipe(
            delay(300),
            mergeMap(() => ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 })),
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
        //console.log(`ServiceES: handleServiceCompleted: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({}).pipe(
            delay(300),
            mergeMap(() => ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 })),
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
        //console.log(`ServiceES: handleServiceCancelledByDriver: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({}).pipe(
            delay(300),
            mergeMap(() => ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 })),
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
        //console.log(`ServiceES: handleServiceCancelledByClient: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({}).pipe(
            delay(300),
            mergeMap(() => ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 })),
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
        //console.log(`ServiceES: handleServiceCancelledByOperator: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({}).pipe(
            delay(300),
            mergeMap(() => ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 })),
            filter(service => service.driver && service.driver.username),
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceCancelledByOperator', { ...data, _id: service._id, state: 'CANCELLED_OPERATOR' })),
        );
    }

    /**
     * Handles message driver sent
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceMessageSent$({ aid, data }) {
        console.log(`ServiceES: handleServiceMessageSent: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({}).pipe(
            filter(() => data.type === 'DRIVER'),
            mergeMap(() => ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 })),
            filter(service => service.driver && service.driver.username),
            mergeMap(service =>
                driverAppLinkBroker.sendServiceMessageToDrivers$(
                    service.businessId, service.driver.username, 'ServiceMessageSent', data
                )
            ),
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
     * Generates an EventSourcing Event
     * @param {*} aggregateType 
     * @param {*} aggregateId defaults to generated DateBased Uuid
     * @param {*} eventType 
     * @param {*} data defaults to {}
     * @param {*} authToken 
     * @param {*} eventTypeVersion defaults to 1
    */
    static buildEventSourcingEvent(aggregateType, aggregateId, eventType, data = {}, user, eventTypeVersion = 1, ephemeral = false) {
        return new Event({
            aggregateType,
            aggregateId,
            eventType,
            eventTypeVersion,
            user,
            data,
            ephemeral
        });
    }

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