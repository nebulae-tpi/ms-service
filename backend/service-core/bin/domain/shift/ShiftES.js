'use strict'


const { of, interval, forkJoin, empty,merge } = require("rxjs");
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
        console.log(`ShiftES.handleShiftStarted: ${JSON.stringify({ data })}`); //DEBUG: DELETE LINE
        return ShiftDA.insertShift$(data);
    }

    /**
     * Persists the shift state changes on the materialized view according to the received data from the event store.
     * @param {Event} shiftStateChangedEvt 
     */
    handleShiftStateChanged$({ aid, data }) {
        console.log(`ShiftES.handleShiftStateChanged: ${JSON.stringify({ aid, data })}`); //DEBUG: DELETE LINE
        if(!aid){ console.log(`WARNING:   not aid detected`); return of({})}
        
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
        console.log(`ShiftES.handleShiftConnected: ${JSON.stringify({ aid })}`); //DEBUG: DELETE LINE

        if(!aid){ console.log(`WARNING:   not aid detected`); return of({})}

        return ShiftDA.updateShiftOnlineFlag$(aid, true);
    }

    /**
     * Persists the shift online state on the materialized view according to the received data from the event store.
     * @param {Event} shiftDisconnectedEvt
     */
    handleShiftDisconnected$({ aid }) {
        console.log(`ShiftES.handleShiftDisconnected: ${JSON.stringify({ aid })}`); //DEBUG: DELETE LINE

        if(!aid){ console.log(`WARNING:   not aid detected`); return of({})}

        return ShiftDA.updateShiftOnlineFlag$(aid, false);
    }

    /**
     * closes the Shift at the mat. view
     * @param {Event} shiftStoppedEvt
     */
    handleShiftStopped$({ aid }) {
        console.log(`ShiftES.handleShiftStopped: ${JSON.stringify({ aid })}`); //DEBUG: DELETE LINE

        if(!aid){ console.log(`WARNING:   not aid detected`); return of({})}

        return ShiftDA.updateShiftState$(aid, 'CLOSED');
    }

    /**
     * remove a vehicle block from a Shift 
     * @param {Event} shiftVehicleBlockRemovedEvt
     */
    handleShiftVehicleBlockRemoved$({ aid, data }) {
        console.log(`ShiftES.handleShiftVehicleBlockRemoved: ${JSON.stringify({ aid,data })}`); //DEBUG: DELETE LINE

        if(!aid){ console.log(`WARNING:   not aid detected`); return of({})}

        return ShiftDA.updateOpenShiftVehicleBlock$(aid, false, data.blockKey).pipe(
            filter(shift => shift),
            mergeMap(shift => blockOrUnblockShiftStateIfNeeded$(shift))
        );
    }

    /**
     * adds a vehicle block from a Shift 
     * @param {Event} shiftVehicleBlockAddedEvt
     */
    handleShiftVehicleBlockAdded$({ aid, data }) {
        console.log(`ShiftES.handleShiftVehicleBlockAdded: ${JSON.stringify({ aid,data })}`); //DEBUG: DELETE LINE


        if(!aid){ console.log(`WARNING:   not aid detected`); return of({})}

        return ShiftDA.updateOpenShiftVehicleBlock$(aid, true, data.blockKey).pipe(
            filter(shift => shift),
            mergeMap(shift => blockOrUnblockShiftStateIfNeeded$(shift))
        );
    }

    /**
    * remove a vehicle block from a Shift 
    * @param {Event} shiftDriverBlockRemovedEvt
    */
    handleShiftDriverBlockRemoved$({ aid, data }) {
        console.log(`ShiftES.handleShiftDriverBlockRemoved: ${JSON.stringify({ aid,data })}`); //DEBUG: DELETE LINE

        if(!aid){ console.log(`WARNING:   not aid detected`); return of({})}

        return ShiftDA.updateOpenShiftDriverBlock$(aid, false, data.blockKey).pipe(
            filter(shift => shift),
            mergeMap(shift => blockOrUnblockShiftStateIfNeeded$(shift))
        );
    }

    /**
     * adds a vehicle block from a Shift 
     * @param {Event} shiftDriverBlockAddedEvt
     */
    handleShiftDriverBlockAdded$({ aid, data }) {
        console.log(`ShiftES.handleShiftDriverBlockAdded: ${JSON.stringify({ aid,data })}`); //DEBUG: DELETE LINE

        if(!aid){ console.log(`WARNING:   not aid detected`); return of({})}

        return ShiftDA.updateOpenShiftDriverBlock$(aid, true, data.blockKey).pipe(
            filter(shift => shift),
            mergeMap(shift => blockOrUnblockShiftStateIfNeeded$(shift))
        );
    }

    /**
     * updates shift current location
     * @param {Event} shiftLocationReportedEvt
     */
    handleShiftLocationReported$({ aid, data }) {
        if(aid === undefined) return of({});//DEBUG: DELETE LINE

        if(!aid){ console.log(`WARNING:   not aid detected`); return of({})}
        //TODO: CRITICO: agregar rutas en el service
        console.log(`ShiftES.handleShiftLocationReported: ${JSON.stringify({ aid,data })}`); //DEBUG: DELETE LINE
         

        return merge(
            ShiftDA.updateShiftLocation$(aid, data.location),
            data.serviceId ? ServiceDA.appendLocation$(data.serviceId, data.location ) : of({})
        );
    }

    /**
     * Verifies if the shift should be blocked or unblocked and emits the ShiftStateChanged event if neccesary
     * @param {*} shift 
     */
    blockOrUnblockShiftStateIfNeeded$(shift) {
        const shouldBeBlocked = shift.vehicle.blocks.length > 0 || shift.driver.blocks.length > 0;
        const isCurrentlyBlocked = shift.state === 'BLOCKED';
        return (isCurrentlyBlocked === shouldBeBlocked)
            ? empty()
            : (!shouldBeBlocked)
                ? eventSourcing.eventStore.emitEvent$(this.buildShiftStateChangedEsEvent(shift._id, 'AVAILABLE', shift.businessId, shift.driver.username))
                : (shift.state !== 'BUSY')
                    ? eventSourcing.eventStore.emitEvent$(this.buildShiftStateChangedEsEvent(shift._id, 'BLOCKED', shift.businessId, shift.driver.username))
                    : empty();
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

    /**
     * Builds a Event-Sourcing Event of type ShiftStateChanged
     * @param {*} shiftId 
     * @returns {Event}
     */
    buildShiftStateChangedEsEvent(shiftId, state, businessId, driverUsername) {
        return new Event({
            aggregateType: 'Shift',
            aid: shiftId,
            eventType: 'ShiftStateChanged',
            eventTypeVersion: 1,
            user: 'SYSTEM',
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