'use strict'


const { of, interval, Observable, empty, throwError } = require("rxjs");
const { mergeMapTo, tap, mergeMap, catchError, map, mapTo, toArray, filter } = require('rxjs/operators');

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();
const driverAppLinkBroker = require("../../services/driver-app-link/DriverAppLinkBroker")();
const jsonwebtoken = require("jsonwebtoken");
const jwtPublicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");

const { ServiceDA } = require('./data-access')

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
                map(evt => ({ authToken: jsonwebtoken.verify(evt.jwt, jwtPublicKey), ...evt })),
                mergeMap(evt => Observable.create(evtObs => {
                    this.handlers[evt.t](evt).subscribe(
                        (handlerEvt) => { console.log(`ServiceDAL.handlerEvt[${evt.t}]: ${JSON.stringify(handlerEvt)}`); },
                        (handlerErr) => { console.error(`ServiceDAL.handlerErr[${evt.t}]( ${JSON.stringify(evt.data)} ): ${handlerErr}`); ServiceDAL.logError(handlerErr); },
                        () => console.log(`ServiceDAL.handlerCompleted[${evt.t}]`),
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
        console.log(`ServiceDAL: handleServicePickUpETAReported: ${JSON.stringify(data)} `); //TODO: DELETE LINE

        return ServiceDA.findById$(aid, { "_id": 1 }).pipe(
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
        console.log(`ServiceDAL: ServiceDropOffETAReported: ${JSON.stringify(data)} `); //TODO: DELETE LINE
        return ServiceDA.findById$(aid, { "_id": 1 }).pipe(
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

        //TODO: consultar estado del service y verificar si si se peude cambiar el estado, de lo contrario se manda al driver el ServiceStateChanged con la info actual

        const { _id, timestamp, location } = data;
        console.log(`ServiceDAL: handleServiceVehicleArrived: ${JSON.stringify(data)} `); //TODO: DELETE LINE
        return ServiceDA.findById$(aid, { "_id": 1 }).pipe(
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

        //TODO: consultar estado del service y verificar si si se peude cambiar el estado, de lo contrario se manda al driver el ServiceStateChanged con la info actual

        const { _id, timestamp, location } = data;
        console.log(`ServiceDAL: handleServiceClientPickedUp: ${JSON.stringify(data)} `); //TODO: DELETE LINE
        return ServiceDA.findById$(aid, { "_id": 1 }).pipe(
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

        //TODO: consultar estado del service y verificar si si se peude cambiar el estado, de lo contrario se manda al driver el ServiceStateChanged con la info actual

        const { _id, timestamp, location } = data;
        console.log(`ServiceDAL: handleServiceClientPickedUp: ${JSON.stringify(data)} `); //TODO: DELETE LINE
        return ServiceDA.findById$(aid, { "_id": 1 }).pipe(
            mergeMap(service => eventSourcing.eventStore.emitEvent$(ServiceDAL.buildEventSourcingEvent(
                'Service',
                _id,
                'ServiceCompleted',
                {
                    location: { type: 'Point', coordinates: [location.lng, location.lat] },
                    timestamp
                },
                authToken))), //Build and send event (event-sourcing)
            mapTo(` - Sent ServiceCompleted for service._id=${_id}: ${JSON.stringify(data)}`)
        );
    }


    /**
     * process event and forwards the right data to event-sourcing
     * @param {*} ServiceDropOffETAReported
     */
    handleServiceCancelledByDriver$({ data, authToken }) {


        //TODO: consultar estado del service y verificar si si se peude cambiar el estado, de lo contrario se manda al driver el ServiceStateChanged con la info actual

        const { _id, timestamp, location, reason, notes } = data;
        console.log(`ServiceDAL: handleServiceCancelledByDriver: ${JSON.stringify(data)} `); //TODO: DELETE LINE
        return ServiceDA.findById$(aid, { "_id": 1 }).pipe(
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