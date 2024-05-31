'use strict'


const { of, iif, Observable, empty, throwError, forkJoin } = require("rxjs");
const { mergeMapTo, tap, mergeMap, catchError, map, mapTo, first, filter, delay } = require('rxjs/operators');

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();
const driverAppLinkBroker = require("../../services/driver-app-link/DriverAppLinkBroker")();
const jsonwebtoken = require("jsonwebtoken");
const jwtPublicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");
const { ERROR_23003, ERROR_23223, ERROR_23230 } = require('../../tools/customError');

const { ServiceDA, BusinessDA } = require('./data-access');

/**
 * Singleton instance
 */
let instance;

class ServiceDAL {

    constructor() {
        this.handlers = {
            "ServicePickUpETAReported": this.handleServicePickUpETAReported$,
            "ServiceDropOffETAReported": this.handleServiceDropOffETAReported$,
            "ServiceVehicleArrived": this.handleServiceVehicleArrived$,
            "ServiceClientPickedUp": this.handleServiceClientPickedUp$,
            "ServiceCompleted": this.handleServiceCompleted$,
            "ServiceCancelledByDriver": this.handleServiceCancelledByDriver$,
        };
    }

    /**
     * Starts drivers event listener
     */
    start$() {
        return Observable.create(obs => {
            this.subscription = driverAppLinkBroker.listenServiceEventsFromDrivers$().pipe(
                mergeMap(evt => Observable.create(evtObs => {
                    of(evt).pipe(
                        map(e => ({ authToken: jsonwebtoken.verify(e.jwt, jwtPublicKey), ...e })),
                        catchError(error =>
                            throwError(ERROR_23003(error.toString()))
                        ),
                        mergeMap(e => this.handlers[e.t](e)),
                    ).subscribe(
                        (handlerEvt) => {
                            //console.log(`ServiceDAL.handlerEvt[${evt.t}]: ${JSON.stringify(handlerEvt)}`);
                        },
                        async (handlerErr) => {
                            console.error(`ServiceDAL.handlerErr[${evt.t}]( ${JSON.stringify(evt.data)} ): ${handlerErr}`);
                            ServiceDAL.logError(handlerErr);
                            const businessId = evt.topic.split('/')[0];
                            const driverUserName = evt.att.un;
                            const eventType = 'Error';
                            const body = { code: handlerErr.code, msg: handlerErr.message, rejectedEventType: evt.t, rejectedMessageId: evt.id };
                            await driverAppLinkBroker.sendErrorEventToDrivers$(businessId, driverUserName, eventType, body).toPromise();
                            console.error(`driverAppLinkBroker.sendErrorEventToDrivers: businessId=${businessId}; driverUserName=${driverUserName}; eventType=${eventType}; body=${JSON.stringify(body)}`);
                        },
                        () => {
                            //console.log(`ServiceDAL.handlerCompleted[${evt.t}]`);
                        },
                    );
                    evtObs.complete();
                }))
            ).subscribe(
                (evt) => console.log(`ServiceDAL.subscription: ${evt}`),
                (err) => { console.log(`ServiceDAL.subscription ERROR: ${err}`); process.exit(1) },
                () => { console.log(`ServiceDAL.subscription STOPPED`); process.exit(1); },
            );
            obs.next('ServiceDAL.subscription engine started');
            obs.complete();
        });
    }





    /**
     * process event and forwards the right data to event-sourcing
     * @param {*} ServicePickUpETAReported
     */
    handleServicePickUpETAReported$({ data, ts, authToken }) {
        const { _id, eta } = data;
        // console.log(`ServiceDAL: handleServicePickUpETAReported: ${JSON.stringify(data)}`); //DEBUG: DELETE LINE

        return ServiceDA.findById$(_id, { "_id": 1 }).pipe(
            mergeMap(service => eventSourcing.eventStore.emitEvent$(ServiceDAL.buildEventSourcingEvent(
                'Service',
                _id,
                'ServicePickUpETAReported',
                { eta },
                authToken))), //Build and send event (event-sourcing)
            mapTo(` - Sent ServicePickUpETAReported for service._id=${_id}: ${JSON.stringify(data)}`)
        );
    }

    /**
     * process event and forwards the right data to event-sourcing
     * @param {*} ServiceDropOffETAReported
     */
    handleServiceDropOffETAReported$({ data, ts, authToken }) {
        const { _id, eta } = data;
        //console.log(`ServiceDAL: ServiceDropOffETAReported: ${JSON.stringify(data)} `); //DEBUG: DELETE LINE
        return ServiceDA.findById$(_id, { "_id": 1 }).pipe(
            mergeMap(service => eventSourcing.eventStore.emitEvent$(ServiceDAL.buildEventSourcingEvent(
                'Service',
                _id,
                'ServiceDropOffETAReported',
                { eta },
                authToken))), //Build and send event (event-sourcing)
            mapTo(` - Sent ServiceDropOffETAReported for service._id=${_id}: ${JSON.stringify(data)}`)
        );
    }


    /**
     * process event and forwards the right data to event-sourcing
     * @param {*} ServiceDropOffETAReported
     */
    handleServiceVehicleArrived$({ data, authToken }) {
        const { _id, timestamp, location } = data;
        //console.log(`ServiceDAL: handleServiceVehicleArrived: ${JSON.stringify(data)} `); //DEBUG: DELETE LINE
        return ServiceDA.findById$(_id, { "_id": 1, state: 1 }).pipe(
            first(s => s, undefined),
            tap((service) => { if (!service) throw ERROR_23223; }),// service does not exists
            tap((service) => { if (service.state !== 'ASSIGNED') throw ERROR_23230; }),// Service state not allowed
            mergeMap(service => eventSourcing.eventStore.emitEvent$(ServiceDAL.buildEventSourcingEvent(
                'Service',
                _id,
                'ServiceArrived',
                {
                    location: { type: 'Point', coordinates: [location.lng, location.lat] },
                    timestamp
                },
                authToken))), //Build and send event (event-sourcing)
            mapTo(` - Sent ServiceVehicleArrived for service._id=${_id}: ${JSON.stringify(data)}`)
        );
    }


    /**
     * process event and forwards the right data to event-sourcing
     * @param {*} ServiceDropOffETAReported
     */
    handleServiceClientPickedUp$({ data, authToken }) {
        const { _id, timestamp, location } = data;
        //console.log(`ServiceDAL: handleServiceClientPickedUp: ${JSON.stringify(data)} `); //DEBUG: DELETE LINE
        return ServiceDA.findById$(_id, { "_id": 1, state: 1 }).pipe(
            first(s => s, undefined),
            tap((service) => { if (!service) throw ERROR_23223; }),// service does not exists
            tap((service) => { if (service.state !== 'ARRIVED') throw ERROR_23230; }),// Service state not allowed
            mergeMap(service => eventSourcing.eventStore.emitEvent$(ServiceDAL.buildEventSourcingEvent(
                'Service',
                _id,
                'ServicePassengerBoarded',
                {
                    location: { type: 'Point', coordinates: [location.lng, location.lat] },
                    timestamp
                },
                authToken))), //Build and send event (event-sourcing)
            mapTo(` - Sent ServicePassengerBoarded for service._id=${_id}: ${JSON.stringify(data)}`)
        );
    }

    /**
     * process event and forwards the right data to event-sourcing
     * @param {*} ServiceDropOffETAReported
     */
    handleServiceCompleted$({ data, authToken }) {
        const { _id, timestamp, location, taximeterFare } = data;
        //console.log(`ServiceDAL: handleServiceClientPickedUp: ${JSON.stringify(data)} `); //DEBUG: DELETE LINE
        return ServiceDA.findById$(_id, { "_id": 1, state: 1 }).pipe(
            first(s => s, undefined),
            tap((service) => { if (!service) throw ERROR_23223; }),// service does not exists
            tap((service) => { if (service.state !== 'ON_BOARD') throw ERROR_23230; }),// Service state not allowed
            mergeMap(service => {
                return BusinessDA.getBusiness$(service.businessId).pipe(
                    map(business => {
                        return [service, business]
                    })
                )
            }),
            mergeMap(([service, business]) => {
                const driverTaximeterAgreement = Number((business.attributes.find(a => a.key === "DRIVER_TAXIMETER_AGREEMENT") || {}).value || "0");
                if(taximeterFare){
                    const amount = (taximeterFare - (service.client.tip || 0)) * driverTaximeterAgreement;
                    return ServiceDA.updateTaximeterFare$(_id, taximeterFare, amount).pipe(
                        mergeMap(service => {
                            if(isNaN(driverTaximeterAgreement) || driverTaximeterAgreement <= 0 || driverTaximeterAgreement > 1){
                                return of({})
                            }
                            return eventSourcing.eventStore.emitEvent$(ServiceDAL.buildEventSourcingEvent(
                                'Wallet',
                                authToken.driverId,
                                'WalletTransactionCommited',
                                {
                                    _id: Crosscutting.generateDateBasedUuid(),
                                    businessId: service.businessId,
                                    type: "MOVEMENT",
                                    // notes: mba.notes,
                                    concept: "DRIVER_TAXIMETER_AGREEMENT",
                                    timestamp: timestamp || Date.now(),
                                    amount: Math.round(amount),
                                    fromId: service.driver.id,
                                    toId: service.businessId
                                },
                                authToken))
                        }),
                        mapTo(service)
                    )
                }
                else {
                    return of(service)
                }
                
            }),
            mergeMap(service => eventSourcing.eventStore.emitEvent$(ServiceDAL.buildEventSourcingEvent(
                'Service',
                _id,
                'ServiceCompleted',
                {
                    taximeterFare,
                    location: { type: 'Point', coordinates: [location.lng, location.lat] },
                    timestamp: timestamp || Date.now()
                },
                authToken))), //Build and send event (event-sourcing)
            mapTo(` - Sent ServiceCompleted for service._id=${_id}: ${JSON.stringify(data)}`)
        );
    }


    /**
     * process event and forwards the right data to event-sourcing
     * @param {*} ServiceDropOffETAReported
     */
    handleServiceCancelledByDriver$({aid, data, authToken }) {
        const { _id, timestamp, location, reason, notes } = data;
        //console.log(`ServiceDAL: handleServiceCancelledByDriver: ${JSON.stringify(data)} `); //DEBUG: DELETE LINE
        return ServiceDA.findById$(_id, { "_id": 1, state: 1 }).pipe(
            first(s => s, undefined),
            tap((service) => { if (!service) throw ERROR_23223; }),// service does not exists
            tap((service) => { if (!['ASSIGNED', 'ARRIVED', 'ON_BOARD'].includes(service.state)) throw ERROR_23230; }),// Service state not allowed            
            mergeMap(service => eventSourcing.eventStore.emitEvent$(ServiceDAL.buildEventSourcingEvent(
                'Service',
                _id,
                'ServiceCancelledByDriver',
                {
                    location: { type: 'Point', coordinates: [location.lng, location.lat] },
                    timestamp,
                    reason,
                    notes
                },
                authToken))), //Build and send event (event-sourcing)
            mapTo(` - Sent ServiceCancelledByDriver for service._id=${_id}: ${JSON.stringify(data)}`)
        );
    }


    //#region Object builders & formatters

    /**
     * Generates an EventSourcing Event
     * @param {*} aggregateType 
     * @param {*} aggregateId defaults to generated DateBased Uuid
     * @param {*} eventType 
     * @param {*} data defaults to {}
     * @param {*} authToken 
     * @param {*} eventTypeVersion defaults to 1
    */
    static buildEventSourcingEvent(aggregateType, aggregateId, eventType, data = {}, authToken, eventTypeVersion = 1) {
        return new Event({
            aggregateType,
            aggregateId,
            eventType,
            eventTypeVersion,
            user: authToken.preferred_username,
            data
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

    //#endregion
}

/**
 * @returns {ServiceDAL}
 */
module.exports = () => {
    if (!instance) {
        instance = new ServiceDAL();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};