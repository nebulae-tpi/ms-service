'use strict'


const { of, interval, forkJoin, empty, merge } = require("rxjs");
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
    handleShiftStateChanged$({ aid, data, user }) {
        //console.log(`ShiftES.handleShiftStateChanged: ${JSON.stringify({ aid, data })}`); //DEBUG: DELETE LINE
        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }

        return ShiftDA.updateShiftStateAndGetOnlineFlag$(aid, data.state).pipe(
            filter(shift => shift && !shift.online),
            filter(shift => ["AVAILABLE", "NO_AVAILABLE", "BUSY"].includes(data.state)),//filter by the only states that can asure the device is online
            mergeMapTo(eventSourcing.eventStore.emitEvent$(this.buildShiftConnectedEsEvent(aid, user))), //Build and send ShiftConnected event (event-sourcing)
        );
    }

    /**
     * Persists the shift online state on the materialized view according to the received data from the event store.
     * @param {Event} shiftConnectedEvt
     */
    handleShiftConnected$({ aid }) {
        //console.log(`ShiftES.handleShiftConnected: ${JSON.stringify({ aid })}`); //DEBUG: DELETE LINE

        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }

        return ShiftDA.updateShiftOnlineFlag$(aid, true);
    }

    /**
     * Persists the shift online state on the materialized view according to the received data from the event store.
     * @param {Event} shiftDisconnectedEvt
     */
    handleShiftDisconnected$({ aid }) {
        //console.log(`ShiftES.handleShiftDisconnected: ${JSON.stringify({ aid })}`); //DEBUG: DELETE LINE

        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }

        return ShiftDA.updateShiftOnlineFlag$(aid, false);
    }

    /**
     * closes the Shift at the mat. view
     * @param {Event} shiftStoppedEvt
     */
    handleShiftStopped$({ aid }) {
        //console.log(`ShiftES.handleShiftStopped: ${JSON.stringify({ aid })}`); //DEBUG: DELETE LINE

        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }

        return ShiftDA.updateShiftStateAndUnsetLocation$(aid, 'CLOSED');
    }

    /**
     * remove a vehicle block from a Shift 
     * @param {Event} shiftVehicleBlockRemovedEvt
     */
    handleShiftVehicleBlockRemoved$({ aid, data, user }) {
        //console.log(`ShiftES.handleShiftVehicleBlockRemoved: ${JSON.stringify({ aid, data })}`); //DEBUG: DELETE LINE

        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }

        return ShiftDA.updateOpenShiftVehicleBlock$(aid, false, data.block).pipe(
            filter(shift => shift),
            mergeMap(shift => this.blockOrUnblockShiftStateIfNeeded$(shift, user))
        );
    }

    /**
     * adds a vehicle block from a Shift 
     * @param {Event} shiftVehicleBlockAddedEvt
     */
    handleShiftVehicleBlockAdded$({ aid, data, user }) {
        //console.log(`ShiftES.handleShiftVehicleBlockAdded: ${JSON.stringify({ aid, data })}`); //DEBUG: DELETE LINE


        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }

        return ShiftDA.updateOpenShiftVehicleBlock$(aid, true, data.block).pipe(
            filter(shift => shift),
            mergeMap(shift => this.blockOrUnblockShiftStateIfNeeded$(shift, user))
        );
    }

    /**
    * remove a vehicle block from a Shift 
    * @param {Event} shiftDriverBlockRemovedEvt
    */
    handleShiftDriverBlockRemoved$({ aid, data, user }) {
        //console.log(`ShiftES.handleShiftDriverBlockRemoved: ${JSON.stringify({ aid, data })}`); //DEBUG: DELETE LINE

        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }

        return ShiftDA.updateOpenShiftDriverBlock$(aid, false, data.block).pipe(
            filter(shift => shift),
            mergeMap(shift => this.blockOrUnblockShiftStateIfNeeded$(shift, user))
        );
    }

    /**
     * adds a vehicle block from a Shift 
     * @param {Event} shiftDriverBlockAddedEvt
     */
    handleShiftDriverBlockAdded$({ aid, data, user }) {
        //console.log(`ShiftES.handleShiftDriverBlockAdded: ${JSON.stringify({ aid, data })}`); //DEBUG: DELETE LINE

        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }

        return ShiftDA.updateOpenShiftDriverBlock$(aid, true, data.block).pipe(
            filter(shift => shift),
            mergeMap(shift => this.blockOrUnblockShiftStateIfNeeded$(shift, user))
        );
    }

    /**
     * updates shift current location
     * @param {Event} shiftLocationReportedEvt
     */
    handleShiftLocationReported$({ aid, data, user }) {
        if (aid === undefined) return of({});//DEBUG: DELETE LINE

        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }
        //console.log(`ShiftES.handleShiftLocationReported: ${JSON.stringify({ aid, data })}`); //DEBUG: DELETE LINE

        return ShiftDA.updateShiftLocationAndGetOnlineFlag$(aid, data.location).pipe(
            filter(shift => shift && !shift.online),
            mergeMap(shift => iif(() => shift.serviceId, eventSourcing.eventStore.emitEvent$(this.buildServiceLocationReportedEsEvent(shift.serviceId, data.location))), of('')),
            mergeMapTo(eventSourcing.eventStore.emitEvent$(this.buildShiftConnectedEsEvent(aid, user))), //Build and send ShiftConnected event (event-sourcing)
        );
    }

    /**
     * Verifies if the shift should be blocked or unblocked and emits the ShiftStateChanged event if neccesary
     * @param {*} shift 
     */
    blockOrUnblockShiftStateIfNeeded$(shift, user) {
        const shouldBeBlocked = shift.vehicle.blocks.length > 0 || shift.driver.blocks.length > 0;
        const isCurrentlyBlocked = shift.state === 'BLOCKED';
        return (isCurrentlyBlocked === shouldBeBlocked)
            ? empty()
            : (!shouldBeBlocked)
                ? eventSourcing.eventStore.emitEvent$(this.buildShiftStateChangedEsEvent(shift._id, 'AVAILABLE', shift.businessId, shift.driver.username, user))
                : (shift.state !== 'BUSY')
                    ? eventSourcing.eventStore.emitEvent$(this.buildShiftStateChangedEsEvent(shift._id, 'BLOCKED', shift.businessId, shift.driver.username, user))
                    : empty();
    }


    //#region Object builders

    /**
     * Builds a Event-Sourcing Event of type ShiftConnected
     * @param {*} shiftId 
     * @returns {Event}
     */
    buildServiceLocationReportedEsEvent(serviceId, location) {
        return new Event({
            aggregateType: 'Service',
            aggregateId: serviceId,
            eventType: 'ServiceLocationReported',
            eventTypeVersion: 1,
            user,
            data: {
                serviceId: serviceId,
                location: location
            }
        });
    }

    /**
     * Builds a Event-Sourcing Event of type ShiftConnected
     * @param {*} shiftId 
     * @returns {Event}
     */
    buildShiftConnectedEsEvent(shiftId, user = 'SYSTEM') {
        return new Event({
            aggregateType: 'Shift',
            aggregateId: shiftId,
            eventType: 'ShiftConnected',
            eventTypeVersion: 1,
            user,
            data: {}
        });
    }

    /**
     * Builds a Event-Sourcing Event of type ShiftStateChanged
     * @param {*} shiftId 
     * @returns {Event}
     */
    buildShiftStateChangedEsEvent(shiftId, state, businessId, driverUsername, user = 'SYSTEM') {
        return new Event({
            aggregateType: 'Shift',
            aggregateId: shiftId,
            eventType: 'ShiftStateChanged',
            eventTypeVersion: 1,
            user,
            data: {
                businessId, driverUsername, state
            }
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