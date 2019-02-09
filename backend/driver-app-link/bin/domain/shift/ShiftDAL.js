'use strict'


const { of, interval, Observable, empty, throwError } = require("rxjs");
const { mergeMapTo, mapTo, tap, mergeMap, catchError, map, toArray, filter } = require('rxjs/operators');
const jsonwebtoken = require("jsonwebtoken");
const jwtPublicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();
const driverAppLinkBroker = require("../../services/driver-app-link/DriverAppLinkBroker")();

const { ShiftDA } = require('./data-access')

/**
 * Singleton instance
 */
let instance;

class ShiftDAL {

    constructor() {
        this.handlers = {
            "ShiftLocationReported": this.handleShiftLocationReported$
        };
    }

    /**
     * Starts drivers event listener
     */
    start$() {
        return Observable.create(obs => {
            this.subscription = driverAppLinkBroker.listenShiftEventsFromDrivers$().pipe(
                map(evt => ({ authToken: jsonwebtoken.verify(evt.jwt, jwtPublicKey), ...evt })),
                mergeMap(evt => Observable.create(evtObs => {
                    this.handlers[evt.t](evt).subscribe(
                        (handlerEvt) => { console.log(`ShiftDAL.handlerEvt[${evt.t}]: ${JSON.stringify(handlerEvt)}`); },
                        (handlerErr) => { console.error(`ShiftDAL.handlerErr[${evt.t}]( ${JSON.stringify(evt.data)} ): ${handlerErr}`); ShiftDAL.logError(handlerErr); },
                        () => console.log(`ShiftDAL.handlerCompleted[${evt.t}]`),
                    );
                    evtObs.complete();
                }))
            ).subscribe(
                (evt) => console.log(`ShiftDAL.subscription: ${evt}`),
                (err) => { console.log(`ShiftDAL.subscription ERROR: ${err}`); process.exit(1) },
                () => { console.log(`ShiftDAL.subscription STOPPED`); process.exit(1); },
            );
            obs.next('ShiftDAL.subscription engine started');
            obs.complete();
        });
    }



    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftStartedEvt
     */
    handleShiftLocationReported$({ data }) {
        if(!data._id) throw new Error(`Driver-app sent ShiftLocationReported without _id:  ${JSON.stringify(data)}`);

        const location = {type:"Point", coordinates: [data.location.lng,data.location.lat]};

        return eventSourcing.eventStore.emitEvent$(ShiftDAL.buildShiftLocationReportedEsEvent(data._id, location, data.serviceId)).pipe(
            mapTo(` - Sent ShiftLocationReported for shift._id=${data._id}: ${JSON.stringify(data)}`)
        );
    }


    //#region Object builders & formatters

    /**
     * Builds a Event-Sourcing Event of type LocationResported
     * @param {*} shiftId 
     * @returns {Event}
     */
    static buildShiftLocationReportedEsEvent(aid, location,serviceId) {
        return new Event({
            aggregateType: 'Shift',
            aggregateId: aid,
            eventType: 'ShiftLocationReported',
            eventTypeVersion: 1,
            user: 'SYSTEM',
            data: {
                location,
                serviceId
            }
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
 * @returns {ShiftDAL}
 */
module.exports = () => {
    if (!instance) {
        instance = new ShiftDAL();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};