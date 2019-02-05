'use strict'


const { of, interval, forkJoin } = require("rxjs");
const { mergeMapTo, tap, mergeMap, catchError, map, toArray, filter } = require('rxjs/operators');

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();

const { ShiftDA, VehicleDA, DriverDA, ServiceDA } = require('./data-access')

/**
 * Singleton instance
 */
let instance;

class ShiftES {

    constructor() {
    }

    /**
     * Persists the shift on the materialized view according to the received data from the event store.
     * @param {Event} shiftStartedEvt
     */
    handleShiftStarted$({ data }) {
        return ShiftDA.insertShift$(data);
    }

    /**
     * Persists the shift state changes on the materialized view according to the received data from the event store.
     * @param {Event} shiftStateChangedEvt 
     */
    handleShiftStateChanged$({ aid, data }) {
        return ShiftDA.updateShiftStateAndGetOnlineFlag$(aid, data.state).pipe(
            filter(shift => !shift.online),
            mergeMapTo(eventSourcing.eventStore.emitEvent$(this.buildShiftConnectedEsEvent(aid))), //Build and send ShiftConnected event (event-sourcing)
        );
    }

    /**
     * Persists the shift online state on the materialized view according to the received data from the event store.
     * @param {Event} shiftConnectedEvt
     */
    handleShiftConnected$({ aid }) {
        return ShiftDA.updateShiftOnlineFlag$(aid, true);
    }

    /**
     * Persists the shift online state on the materialized view according to the received data from the event store.
     * @param {Event} shiftDisconnectedEvt
     */
    handleShiftDisconnected$({ aid }) {
        return ShiftDA.updateShiftOnlineFlag$(aid, false);
    }

    /**
     * closes the Shift at the mat. view
     * @param {Event} shiftStoppedEvt
     */
    handleShiftStopped$({ aid }) {
        return ShiftDA.updateShiftState$(aid, 'CLOSED');
    }

    /**
     * remove a vehicle block from a Shift 
     * @param {Event} shiftVehicleBlockRemovedEvt
     */
    handleShiftVehicleBlockRemoved$({ aid, data }) {
        return ShiftDA.updateOpenShiftVehicleBlock$(aid, false, data.blockKey);
    }

    /**
     * adds a vehicle block from a Shift 
     * @param {Event} shiftVehicleBlockAddedEvt
     */
    handleShiftVehicleBlockAdded$({ aid, data }) {
        return ShiftDA.updateOpenShiftVehicleBlock$(aid, true, data.blockKey);
    }

    /**
    * remove a vehicle block from a Shift 
    * @param {Event} shiftDriverBlockRemovedEvt
    */
    handleShiftDriverBlockRemoved$({ aid, data }) {
        return ShiftDA.updateOpenShiftDriverBlock$(aid, false, data.blockKey);
    }

    /**
     * adds a vehicle block from a Shift 
     * @param {Event} shiftDriverBlockAddedEvt
     */
    handleShiftDriverBlockAdded$({ aid, data }) {
        return ShiftDA.updateOpenShiftDriverBlock$(aid, true, data.blockKey);
    }

    /**
     * updates shift current location
     * @param {Event} shiftLocationReportedEvt
     */
    handleShiftLocationReported$({ aid, data }) {
        return ShiftDA.updateShiftLocation$(aid, data.location);
    }


    //#region Object builders

    /**
     * Builds a Event-Sourcing Event of type ShiftConnected
     * @param {*} shiftId 
     * @returns {Event}
     */
    buildShiftConnectedEsEvent(shiftId) {
        return new Event({
            aggregateType: 'Shift',
            aid: shiftId,
            eventType: 'ShiftConnected',
            eventTypeVersion: 1,
            user: 'SYSTEM',
            data: {}
        });
    }

    //#endregion
}

/**
 * @returns {ShiftES}
 */
module.exports = () => {
    if (!instance) {
        instance = new ShiftES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};