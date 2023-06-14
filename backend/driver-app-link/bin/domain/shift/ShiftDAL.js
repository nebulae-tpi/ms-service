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
const { ERROR_23003, ERROR_23212 } = require('../../tools/customError');

const { ShiftDA } = require('./data-access')

/**
 * Singleton instance
 */
let instance;

class ShiftDAL {

    constructor() {
        this.handlers = {
            "ShiftLocationReported": this.handleShiftLocationReported$,
            "ShiftDisconnected": this.handleShiftDisconnected$
        };
    }

    /**
     * Starts drivers event listener
     */
    start$() {
        return Observable.create(obs => {
            this.subscription = driverAppLinkBroker.listenShiftEventsFromDrivers$().pipe(
                mergeMap(evt => Observable.create(evtObs => {
                    of(evt).pipe(
                        map(e => ({ authToken: jsonwebtoken.verify(e.jwt, jwtPublicKey), ...e })),
                        catchError(error =>
                            throwError(ERROR_23003(error.toString()))
                        ),
                        mergeMap(e => this.handlers[e.t](e)),
                    ).subscribe(
                        (handlerEvt) => {
                            //console.log(`ShiftDAL.handlerEvt[${evt.t}]: ${JSON.stringify(handlerEvt)}`);
                        },
                        async (handlerErr) => {
                            console.error(`ShiftDAL.handlerErr[${evt.t}]( ${JSON.stringify(evt.data)} ): ${handlerErr}`);
                            ShiftDAL.logError(handlerErr);
                            await driverAppLinkBroker.sendErrorEventToDrivers$(evt.topic.split('/')[0], evt.att.un, 'Error', { code: handlerErr.code, msg: handlerErr.message, rejectedEventType: evt.t, rejectedMessageId: evt.id }).toPromise();
                        },
                        () => {
                            //console.log(`ShiftDAL.handlerCompleted[${evt.t}]`);
                        },
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
     * @param {Event} ShiftDisconnected
     */
    handleShiftDisconnected$({ data, authToken }) {
        if (!data._id) throw new Error(`Driver-app sent ShiftDisconnected without _id:  ${JSON.stringify(data)}`);

        return eventSourcing.eventStore.emitEvent$(
            ShiftDAL.generateEventStoreEvent$("ShiftDisconnected", 1, "Shift", data._id, {}, authToken.preferred_username)
        ).pipe(
            mapTo(` - Sent ShiftDisconnected for shift._id=${data._id}: ${JSON.stringify(data)}`)
        );
    }


    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftStartedEvt
     */
    handleShiftLocationReported$({ data, authToken }) {
        if (!data._id) throw new Error(`Driver-app sent ShiftLocationReported without _id:  ${JSON.stringify(data)}`);
        if (!data.location.lng || !data.location.lat) throw new Error(`Driver-app sent ShiftLocationReported without valid location:  ${JSON.stringify(data)}`);

        //Check if the location is in the Colombian territory,otherwise the location is not going to be processed and an error will be thrown.
        if (
            (data.location.lat < -3.867790 || data.location.lat > 12.373907) ||
            (data.location.lng < -78.793839 || data.location.lng > -66.965140)) {
            console.log(`WARNING - handleShiftLocationReported (Invalid location reported): ${JSON.stringify(data)} `);
            return throwError(ERROR_23212(data.location));
        }

        const location = { type: "Point", coordinates: [data.location.lng, data.location.lat] };


        return eventSourcing.eventStore.emitEvent$(ShiftDAL.buildShiftLocationReportedEsEvent(data._id, location, data.serviceId, authToken, data.onBoardTraveledDistance)).pipe(
            mapTo(` - Sent ShiftLocationReported for shift._id=${data._id}: ${JSON.stringify(data)}`)
        );
    }


    //#region Object builders & formatters

    /**
     * Builds a Event-Sourcing Event of type LocationResported
     * @param {*} shiftId 
     * @returns {Event}
     */
    static buildShiftLocationReportedEsEvent(aid, location, serviceId, authToken, onBoardTraveledDistance) {
        return new Event({
            aggregateType: 'Shift',
            aggregateId: aid,
            eventType: 'ShiftLocationReported',
            eventTypeVersion: 1,
            user: authToken.preferred_username,
            data: {
                location,
                serviceId,
                onBoardTraveledDistance
            },
            ephemeral: true,
        });
    }

    static generateEventStoreEvent$(eventType, eventVersion, aggregateType, aggregateId, data, user) {
        return of(new Event({
            eventType: eventType,
            eventTypeVersion: eventVersion,
            aggregateType: aggregateType,
            aggregateId: aggregateId,
            data: data,
            user: user
        }))
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