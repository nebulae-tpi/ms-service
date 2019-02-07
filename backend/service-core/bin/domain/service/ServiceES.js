'use strict'


const { of, interval, forkJoin, Observable } = require("rxjs");
const { mapTo, mergeMap, mergeMapTo, map, toArray, filter } = require('rxjs/operators');

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();

const { ServiceDA } = require('./data-access')

/**
 * Singleton instance
 */
let instance;

class ServiceES {

    constructor() {
    }

    /**
     * Handles EventSourcing Event ServiceRequested
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceRequested$({ data }) {
        return ServiceDA.insertService$(data);
    }


    /**
     * Handles EventSourcing Event ServiceAssigned
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceAssigned$({ aid, data }) {
        const { shiftId, driver, vehicle, skipPersist } = data;


        if (skipPersist) {
            return of({}).pipe(
                mergeMap(service =>
                    eventSourcing.eventStore.emitEvent$(
                        ServiceES.buildEventSourcingEvent(
                            'Shift',
                            shiftId,
                            'ShiftStateChanged',
                            { _id: shiftId, state: 'BUSY' }
                        )
                    )
                )
            );
        } else {
            return ServiceDA.assignServiceNoRules$(aid, shiftId, driver, vehicle).pipe(
                mergeMap(service =>
                    eventSourcing.eventStore.emitEvent$(
                        ServiceES.buildEventSourcingEvent(
                            'Shift',
                            shiftId,
                            'ShiftStateChanged',
                            { _id: shiftId, state: 'BUSY' }
                        )
                    )
                ),
                mapTo(` - Sent ShiftStateChanged for service._id=${shiftId}: ${JSON.stringify(data)}`)
            );
        }

    }

    /**
     * Handles EventSourcing Event ServicePickUpETAReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServicePickUpETAReported$({ aid, data }) {
        const { eta } = data;
        return ServiceDA.setPickUpETA$(aid, eta);
    }

    /**
     * Handles EventSourcing Event ServiceLocationReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceLocationReported$({ aid, data }) {
        const { location } = data;
        return ServiceDA.appendLocation$(aid, location);
    }

    /**
     * Handles EventSourcing Event ServiceArrived
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceArrived$({ aid, data }) {
        const { location, timestamp } = data;
        return ServiceDA.appendstate$(aid, 'ARRIVED', location, timestamp);
    }

    /**
     * Handles EventSourcing Event ServicePassengerBoarded
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServicePassengerBoarded$({ aid, data }) {
        const { location, timestamp } = data;
        return ServiceDA.appendstate$(aid, 'ON_BOARD', location, timestamp);
    }

    /**
     * Handles EventSourcing Event ServiceCompleted
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCompleted$({ aid, data }) {


        const { location, timestamp } = data;


        const sendEvt$ = mergeMap(shiftId => eventSourcing.eventStore.emitEvent$(ServiceES.buildEventSourcingEvent(
            'Shift',
            shiftId,
            'ShiftStateChanged',
            { _id: shiftId, state: 'AVAILABLE' }
        ))).pipe(
            mapTo(` - Sent ServicePickUpETAReported for service._id=${_id}: ${JSON.stringify(data)}`)
        );

        //MEJORAR ESTO; SE ESTA CONSULTANDO DOBLE
        //TODO: CRITICAL: EVALUAR SI PASA A AVAILABLE O BLOCKED
        return ServiceDA.appendstate$(aid, 'DONE', location, timestamp).pipe(
            mergeMapTo(ServiceDA.findById$(aid, { shiftId: 1 })),
            map(({ shiftId }) => shiftId),
            sendEvt$
        );


    }

    /**
     * Handles EventSourcing Event ServiceDropOffETAReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceDropOffETAReported$({ aid, data }) {
        const { eta } = data;
        return ServiceDA.setPickUpETA$(aid, eta);
    }

    /**
     * Handles EventSourcing Event ServiceCancelledByDriver
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByDriver$({ aid, data }) {
        const { reason, notes, location } = data;
        return ServiceDA.setCancelState$(aid, 'CANCELLED_DRIVER', location, reason, notes);
        //TODO: CRITICAL: EVALUAR SI PASA A AVAILABLE O BLOCKED
    }


    /**
     * Handles EventSourcing Event ServiceCancelledByClient
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByClient$({ aid, data }) {
        const { reason, notes, location } = data;
        return ServiceDA.setCancelState$(aid, 'CANCELLED_CLIENT', location, reason, notes);
        //TODO: CRITICAL: EVALUAR SI PASA A AVAILABLE O BLOCKED
    }

    /**
     * Handles EventSourcing Event ServiceCancelledByOperator
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByOperator$({ aid, data }) {
        const { reason, notes, location } = data;
        return ServiceDA.setCancelState$(aid, 'CANCELLED_OPERATOR', location, reason, notes);
        //TODO: CRITICAL: EVALUAR SI PASA A AVAILABLE O BLOCKED
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
    static buildEventSourcingEvent(aggregateType, aggregateId, eventType, data = {}, eventTypeVersion = 1) {
        return new Event({
            aggregateType,
            aggregateId,
            eventType,
            eventTypeVersion,
            user: 'SYSTEM',
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