'use strict'


const { of, iif, forkJoin, Observable, Subject, timer } = require("rxjs");
const { mapTo, mergeMap, tap, mergeMapTo, map, toArray, groupBy, debounceTime, filter, catchError, delay } = require('rxjs/operators');

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();

const { ServiceDA, ShiftDA, ClientDA, DriverDA } = require('./data-access');
const CLIENT_GATEWAY_MATERIALIZED_VIEW_TOPIC = "client-gateway-materialized-view-updates";

/**
 * Singleton instance
 */
let instance;

class ServiceES {

    constructor() {
        this.serviceClientUpdatedEventEmitter$ = new Subject();
        this.startServiceClientEventEmitter();
    }

    startServiceClientEventEmitter() {
        this.serviceClientUpdatedEventEmitter$
            .pipe(
                filter(serviceId => {
                    return serviceId != null;
                }),
                groupBy(serviceId => serviceId),
                mergeMap(group$ => group$.pipe(debounceTime(600))),
                mergeMap(serviceId => this.sendServiceUpdatedEvent$(serviceId)),
            ).subscribe(
                (result) => { },
                (err) => { console.log(err) },
                () => { }
            );
    }

    /**
     * Sends an event with the service data is updated.
     * @param {*} serviceId 
     */
    sendServiceUpdatedEvent$(serviceId) {
        return of(serviceId)
            .pipe(
                mergeMap(serviceId =>
                    // Error isolation: If an error ocurrs, it is not going to affect the stream
                    ServiceDA.findById$(serviceId)
                        .pipe(
                            filter(service => service),
                            map(service => this.formatServiceToGraphQLSchema(service)),
                            mergeMap(service => broker.send$(CLIENT_GATEWAY_MATERIALIZED_VIEW_TOPIC, 'ClientServiceUpdatedSubscription', service)),
                            catchError(error => {
                                console.log('An error ocurred while a service updated event was being processed: ', error);
                                return of('Error: ', error)
                            }),
                        )
                )
            );
    }

    /**
     * Queue the service events and group them by its id to reduce the 
     * amount of push data from the server to the clients
     * @param {*} service 
     */
    queueAndGroupServiceEvent(service) {
        this.serviceClientUpdatedEventEmitter$.next(service._id);
    }

    //#region GraphQL response formatters

    formatServiceToGraphQLSchema(service) {
        const marker = (!service || !service.pickUp || !service.pickUp.marker) ? undefined : { lng: service.pickUp.marker.coordinates[0], lat: service.pickUp.marker.coordinates[1] };
        const dropOffMarker = (!service || !service.dropOff || !service.dropOff.marker) ? undefined : { lng: service.dropOff.marker.coordinates[0], lat: service.dropOff.marker.coordinates[1] };
        const location = (!service || !service.location) ? undefined : { lng: service.location.coordinates[0], lat: service.location.coordinates[1] };

        return !service ? undefined : { ...service, vehicle: { plate: service.vehicle ? service.vehicle.licensePlate : '' }, dropOff: {...service.dropOff,marker: dropOffMarker},pickUp: { ...service.pickUp, marker }, route: undefined, id: service._id, location: location };
    }

    //#endregion

    /**
     * Handles EventSourcing Event ServiceRequested
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceRequested$({ data }) {
        //console.log(`*** ServiceES: handleServiceRequested: `, data); //DEBUG: DELETE LINE
        return ServiceDA.insertService$(data)
            .pipe(
                tap(result => {
                    const customRes = JSON.parse(JSON.stringify(result));
                    if (customRes && (customRes.upserted || []).length > 0) {
                        this.queueAndGroupServiceEvent(data)
                    }
                }),
                catchError(err => {
                    const errJson = JSON.parse(JSON.stringify(errJson));
                    if (!errJson || !errJson.code || errJson.code !== 11000) {
                        throw new Error(err)
                    }
                    else {
                        console.error("Llega error puro ====> ", err);
                        return of({});
                    }
                })
            );
    }


    /**
     * Handles EventSourcing Event ServiceAssigned
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceAssigned$({ aid, data, user }) {
        //console.log(`*** ServiceES: handleServiceAssigned: `, data); //DEBUG: DELETE LINE

        const { shiftId, driver, vehicle, skipPersist, client } = data;
        const walletTransactionId = Crosscutting.generateDateBasedUuid();
        return iif(() => skipPersist, of({}),
            //IF CQRS DID NOT PERSIST THE DATA, THEN WE ASSIGN THE DRIVER WITHIN THE SERVICE AND THEN SEND THE BUSY STATE TO THE SHIFT
            ServiceDA.assignServiceNoRules$(aid, shiftId, driver, vehicle)
        ).pipe(
            mergeMap(() => {
                return DriverDA.findById$(driver.id).pipe(
                    mergeMap(serviceDriver => {
                        return ServiceDA.assignReferredDriverToService$(driver.id, serviceDriver.referredCode)
                    })
                )
            }),
            tap(() => this.queueAndGroupServiceEvent({ _id: aid })),
            mergeMap(persistResult =>
                eventSourcing.eventStore.emitEvent$(
                    ServiceES.buildEventSourcingEvent(
                        'Shift',
                        shiftId,
                        'ShiftStateChanged',
                        { _id: shiftId, state: 'BUSY' },
                        user
                    ))
            ),
            // mergeMap(() => ServiceDA.findById$(aid, { "client.id": 1 } ) ),
            // mergeMap(service => ClientDA.findById$(service.client.id) ),
            // mergeMap( ({client}) => (client) 
            //     ? of({})
            //     : eventSourcing.eventStore.emitEvent$(
            //         ServiceES.buildEventSourcingEvent(
            //             'Wallet',
            //             walletTransactionId,
            //             'WalletTransactionCommited',
            //             {
            //                 _id: walletTransactionId,
            //                 type: 'MOVEMENT',
            //                 concept: 'CLIENT_AGREEMENT_PAYMENT',
            //                 amount: 0, // todo doorman tip
            //                 fromId: driver._id,
            //                 toId: client.id
            //             }
            //         )
            //     )
            // ),
            //IF CQRS DID PERSIST THE DATA, THEN THERE IS A POSSIBILITY THAT THE DRIVER HAD ACCEPTED THE SERVICE AT THE SAME TIME THE SERVICE IS CANCELLED.
            //  SO WE MUST CHECK IF THE SERVICE IS CANCELLED AND IF SO WE MUST FREE THE DRIVER (BUSY -> AVAILABLE)
            delay(5000),
            mergeMap(x => ServiceDA.findById$(aid, { state: 1 })),
            mergeMap(service => ["ASSIGNED", "ARRIVED", "ON_BOARD"].includes(service.state)
                ? of(` - Sent ShiftStateChanged for service._id=${shiftId} to BUSY`)
                : eventSourcing.eventStore.emitEvent$(
                    ServiceES.buildEventSourcingEvent(
                        'Shift',
                        shiftId,
                        'ShiftStateChanged',
                        { _id: shiftId, state: 'AVAILABLE' },
                        user
                    )
                ).pipe(mapTo(` - Sent ShiftStateChanged for service._id=${shiftId} to AVAILABLE`))
            )
        );
    }

    /**
     * Handles EventSourcing Event ServicePickUpETAReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServicePickUpETAReported$({ aid, data }) {
        //console.log(`*** ServiceES: handleServicePickUpETAReported: `, data); //DEBUG: DELETE LINE
        const { eta } = data;
        return ServiceDA.setPickUpETA$(aid, eta)
            .pipe(
                tap(() => this.queueAndGroupServiceEvent({ _id: aid }))
            );
    }

    /**
     * Handles EventSourcing Event ServiceLocationReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceLocationReported$({ aid, data }) {
        // console.log(`*** ServiceES: handleServiceLocationReported: `, aid, data); //DEBUG: DELETE LINE
        const { location } = data;
        return ServiceDA.appendLocation$(aid, location)
            .pipe(
                tap(result => {
                    // console.log('result.nModified => ', result.nModified);
                    //if(result.nModified > 0) {
                    this.queueAndGroupServiceEvent({ _id: aid });
                    //}                
                })
            );
    }

    /**
     * Handles EventSourcing Event ServiceArrived
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceArrived$({ aid, data }) {
        //console.log(`*** ServiceES: handleServiceArrived: `, aid, data); //DEBUG: DELETE LINE
        const { location, timestamp } = data;
        return ServiceDA.appendstate$(aid, 'ARRIVED', location, timestamp)
            .pipe(
                tap(() => this.queueAndGroupServiceEvent({ _id: aid }))
            );
    }

    /**
     * Handles EventSourcing Event ServicePassengerBoarded
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServicePassengerBoarded$({ aid, data }) {
        //console.log(`*** ServiceES: handleServicePassengerBoarded: `, data); //DEBUG: DELETE LINE
        const { location, timestamp } = data;
        return ServiceDA.appendstate$(aid, 'ON_BOARD', location, timestamp)
            .pipe(
                tap(() => this.queueAndGroupServiceEvent({ _id: aid }))
            );
    }

    /**
     * Handles EventSourcing Event ServiceCompleted
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCompleted$({ aid, data, user }) {
        //console.log(`*** ServiceES: handleServiceCompleted: `, data); //DEBUG: DELETE LINE
        const { location, timestamp } = data;
        return ServiceDA.appendstateAndReturnService$(aid, 'DONE', location, timestamp, { shiftId: 1 }).pipe(
            tap(({ shiftId }) => this.queueAndGroupServiceEvent({ _id: aid })),
            mergeMap(({ shiftId }) => ShiftDA.findById$(shiftId, { "driver.blocks": 1, "vehicle.blocks": 1 })),
            mergeMap(shift =>
                eventSourcing.eventStore.emitEvent$(
                    ServiceES.buildEventSourcingEvent(
                        'Shift',
                        shift._id,
                        'ShiftStateChanged',
                        { state: ((shift.driver.blocks && shift.driver.blocks.length > 0) || (shift.vehicle.blocks && shift.vehicle.blocks.length > 0)) ? 'BLOCKED' : 'AVAILABLE' },
                        user
                    )
                ).pipe(
                    map(evt => ` - Sent ShiftStateChanged for service._id=${shift._id}: ${JSON.stringify(evt)}`)
                )
            ),
        );
    }

    /**
     * Handles EventSourcing Event ServiceClosed.
     * @param {*} ServiceClosedEvt 
     */
    handleServiceClosed$({ aid }) {
        //console.log(`*** ServiceES: handleServiceClosed: `, aid); //DEBUG: DELETE LINE
        return ServiceDA.closeService$(aid)
            .pipe(
                tap(() => this.queueAndGroupServiceEvent({ _id: aid }))
            );
    }

    /**
     * Handles EventSourcing Event ServiceDropOffETAReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceDropOffETAReported$({ aid, data }) {
        //console.log(`*** ServiceES: handleServiceDropOffETAReported: `, data); //DEBUG: DELETE LINE
        const { eta } = data;
        return ServiceDA.setPickUpETA$(aid, eta)
            .pipe(
                tap(() => this.queueAndGroupServiceEvent({ _id: aid }))
            );
    }


    /**
     * Handles EventSourcing Event ServiceCancelledByOperator
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByOperator$({ aid, data, user }) {
        //console.log(`*** ServiceES: handleServiceCancelledByOperator: `, data); //DEBUG: DELETE LINE
        const { reason, notes, location } = data;
        return this.handleCancellation$(aid, "CANCELLED_OPERATOR", reason, notes, location, Date.now(), user);
    }

    /**
     * Handles EventSourcing Event ServiceCancelledByClient
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByClient$({ aid, data, user }) {
        //console.log(`*** ServiceES: handleServiceCancelledByClient: `, data); //DEBUG: DELETE LINE
        const { reason, notes, location } = data;
        return this.handleCancellation$(aid, "CANCELLED_CLIENT", reason, notes, location, Date.now(), user);
    }

    /**
     * Handles EventSourcing Event ServiceCancelledByDriver
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByDriver$({ aid, data, user }) {
        //console.log(`*** ServiceES: handleServiceCancelledByDriver: `, data); //DEBUG: DELETE LINE
        const { reason, notes, location } = data;
        return this.handleCancellation$(aid, "CANCELLED_DRIVER", reason, notes, location, Date.now(), user)
    }

    /**
     * Handles EventSourcing Event ServiceCancelledBySystem
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledBySystem$({ aid, data, user, av }) {
        //console.log(`*** ServiceES: handleServiceCancelledBySystem: `, data); //DEBUG: DELETE LINE
        const { reason, notes } = data;
        return ServiceDA.findById$(aid, { "driver.username": 1, "client": 1, "driver.id": 1, "businessId": 1 }).pipe(
            mergeMap(service => {
                if(service.client.tipType === "VIRTUAL_WALLET" && (service.driver || {}).id){
                    return eventSourcing.eventStore.emitEvent$(
                        new Event({
                            eventType: "WalletTransactionCommited",
                            eventTypeVersion: 1,
                            aggregateType: "Wallet",
                            aggregateId: service.client.tipClientId,
                            data: { 
                                _id: Crosscutting.generateDateBasedUuid(),
                                businessId: service.businessId,
                                sourceEvent: { aid, av },
                                type: "MOVEMENT",
                                // notes: mba.notes,
                                concept: "CLIENT_AGREEMENT_REFUND",
                                timestamp: Date.now(),
                                amount: service.client.tip,
                                fromId: service.client.tipClientId,
                                toId: service.driver.id
                            },
                            user: "SYSTEM"
                        })
                    )
                }else {
                    return of({})
                }
            }),
            mergeMap(() => {
                return this.handleCancellation$(aid, "CANCELLED_SYSTEM", reason, notes, undefined, Date.now(), user)
            })
        )
    }

    handleCancellation$(serviceId, cancelStateType, reason, notes, location, timestamp, user) {
        //console.log(`*** ServiceES: handleCancellation: `, serviceId, cancelStateType, timestamp); //DEBUG: DELETE LINE
        return ServiceDA.setCancelStateAndReturnService$(serviceId, cancelStateType, location, reason, notes, timestamp, { shiftId: 1 }, user).pipe(
            tap(service => this.queueAndGroupServiceEvent({ _id: serviceId })),
            filter(({ shiftId }) => shiftId),
            mergeMap(({ shiftId }) => ShiftDA.findById$(shiftId, { "driver.blocks": 1, "vehicle.blocks": 1 })),
            mergeMap(shift =>
                eventSourcing.eventStore.emitEvent$(
                    ServiceES.buildEventSourcingEvent(
                        'Shift',
                        shift._id,
                        'ShiftStateChanged',
                        { state: ((shift.driver.blocks && shift.driver.blocks.length > 0) || (shift.vehicle.blocks && shift.vehicle.blocks.length > 0)) ? 'BLOCKED' : 'AVAILABLE' },
                        user
                    )
                ).pipe(
                    map(evt => ` - Sent ShiftStateChanged for service._id=${shift._id}: ${JSON.stringify(evt)}`)
                )
            ),
        );

    }

    /**
     * Handles message client sent
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceMessageSent$({ aid, data }) {
        console.log(`ServiceES1: handleServiceMessageSent: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({}).pipe(
            filter(() => data.type === 'CLIENT'),
            mergeMap(() => ServiceDA.findById$(aid, { "client.username": 1, "businessId": 1, "driver": 1 })),
            filter(service => service.driver && service.client.username),
            mergeMap(service => broker.send$(CLIENT_GATEWAY_MATERIALIZED_VIEW_TOPIC, 'ServiceMessageSubscription', { ...data }))
        );
    }


    //#region Object builders


    /**
     * Generates an EventSourcing Event
     * @param {*} aggregateType 
     * @param {*} aggregateId defaults to generated DateBased Uuid
     * @param {*} eventType 
     * @param {*} data defaults to {}
     * @param {*} eventTypeVersion defaults to 1
    */
    static buildEventSourcingEvent(aggregateType, aggregateId, eventType, data = {}, user = "SYSTEM", eventTypeVersion = 1) {
        return new Event({
            aggregateType,
            aggregateId,
            eventType,
            eventTypeVersion,
            user,
            data
        });
    }

    //#endregion
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