'use strict'


const { of, interval, Observable, empty } = require("rxjs");
const { mergeMapTo, tap, mergeMap, catchError, map, toArray, filter } = require('rxjs/operators');

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
                mergeMap(evt => this.handlers[evt.t](evt)),
                catchError(_ => { this.logError(_); return of(_); }),
            ).subscribe(
                (evt) => console.log(`ShiftDAL.subscription: ${evt}`),
                (err) => { console.log(`ShiftDAL.subscription ERROR: ${err}`); process.exit(1); },
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
        return eventSourcing.eventStore.emitEvent$(ShiftDAL.buildShiftLocationReportedEsEvent(data._id, data.location)).pipe(

        ); //Build and send ShiftLocationReported event (event-sourcing)
    }


    //#region Object builders & formatters

    /**
     * Builds a Event-Sourcing Event of type LocationResported
     * @param {*} shiftId 
     * @returns {Event}
     */
    static buildShiftLocationReportedEsEvent(aid, location) {
        return new Event({
            aggregateType: 'Shift',
            aggregateId: aid,
            eventType: 'ShiftLocationReported',
            eventTypeVersion: 1,
            user: 'SYSTEM',
            data: {
                location
            }
        });
    }


    /**
     * Logs an error at the console.error printing only the message and the stack related to the project source code
     * @param {Error} error 
     */
    logError(error) {
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