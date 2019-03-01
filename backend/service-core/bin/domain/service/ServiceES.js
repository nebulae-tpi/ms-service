'use strict'


const { of, iif, forkJoin, Observable } = require("rxjs");
const { mapTo, mergeMap, mergeMapTo, map, toArray, filter } = require('rxjs/operators');

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();

const { ServiceDA, ShiftDA } = require('./data-access')

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
        //console.log(`*** ServiceES: handleServiceRequested: `, data); //DEBUG: DELETE LINE
        return ServiceDA.insertService$(data);
    }


    /**
     * Handles EventSourcing Event ServiceAssigned
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceAssigned$({ aid, data, user }) {
        //console.log(`*** ServiceES: handleServiceAssigned: `, data); //DEBUG: DELETE LINE
        const { shiftId, driver, vehicle, skipPersist } = data;
        return iif(() => skipPersist, of({}), ServiceDA.assignServiceNoRules$(aid, shiftId, driver, vehicle)).pipe(
            mergeMap(persistResult =>
                eventSourcing.eventStore.emitEvent$(
                    ServiceES.buildEventSourcingEvent(
                        'Shift',
                        shiftId,
                        'ShiftStateChanged',
                        { _id: shiftId, state: 'BUSY' },
                        user
                    )
                )
            ),
            mapTo(` - Sent ShiftStateChanged for service._id=${shiftId}: state: BUSY`)
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
        return ServiceDA.setPickUpETA$(aid, eta);
    }

    /**
     * Handles EventSourcing Event ServiceLocationReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceLocationReported$({ aid, data }) {
        //console.log(`*** ServiceES: handleServiceLocationReported: `, aid, data); //DEBUG: DELETE LINE
        const { location } = data;
        return ServiceDA.appendLocation$(aid, location);
    }

    /**
     * Handles EventSourcing Event ServiceArrived
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceArrived$({ aid, data }) {
        //console.log(`*** ServiceES: handleServiceArrived: `, aid, data); //DEBUG: DELETE LINE
        const { location, timestamp } = data;
        return ServiceDA.appendstate$(aid, 'ARRIVED', location, timestamp);
    }

    /**
     * Handles EventSourcing Event ServicePassengerBoarded
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServicePassengerBoarded$({ aid, data }) {
        //console.log(`*** ServiceES: handleServicePassengerBoarded: `, data); //DEBUG: DELETE LINE
        const { location, timestamp } = data;
        return ServiceDA.appendstate$(aid, 'ON_BOARD', location, timestamp);
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
        return ServiceDA.closeService$(aid);
    }

    /**
     * Handles EventSourcing Event ServiceDropOffETAReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceDropOffETAReported$({ aid, data }) {
        //console.log(`*** ServiceES: handleServiceDropOffETAReported: `, data); //DEBUG: DELETE LINE
        const { eta } = data;
        return ServiceDA.setPickUpETA$(aid, eta);
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
    handleServiceCancelledBySystem$({ aid, data, user }) {
        //console.log(`*** ServiceES: handleServiceCancelledBySystem: `, data); //DEBUG: DELETE LINE
        const { reason, notes } = data;
        return this.handleCancellation$(aid, "CANCELLED_SYSTEM", reason, notes, undefined, Date.now(), user)
    }

    handleCancellation$(serviceId, cancelStateType, reason, notes, location, timestamp, user) {
        //console.log(`*** ServiceES: handleCancellation: `, serviceId, cancelStateType, timestamp); //DEBUG: DELETE LINE
        return ServiceDA.setCancelStateAndReturnService$(serviceId, cancelStateType, location, reason, notes, timestamp, { shiftId: 1 }).pipe(
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