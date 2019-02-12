'use strict'


const { of, interval, forkJoin } = require("rxjs");
const { take, mergeMap, catchError, map, toArray, filter } = require('rxjs/operators');

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();

const { ShiftDA } = require('./data-access')

/**
 * Singleton instance
 */
let instance;

class VehicleES {

    constructor() {
    }

    /**
     * in case the vehicle has an open shift, then updates the block array
     * @param {Event} vehicleBlockRemovedEvt
     */
    handleVehicleBlockRemoved$({ aid, data, user }) {
        return ShiftDA.findOpenShiftByVehicleId$(aid, { _id: 1 }).pipe(
            filter(shift => shift),
            mergeMap(({ _id }) => eventSourcing.eventStore.emitEvent$(
                this.buildShiftVehicleBlockRemovedEsEvent(_id, data.blockKey, user))), //Build and send ShiftVehicleBlockRemoved event (event-sourcing)
        );
    }

    /**
     * in case the vehicle has an open shift, then updates the block array
     * @param {Event} vehicleBlockAddedEvt
     */
    handleVehicleBlockAdded$({ aid, data, user }) {
        return ShiftDA.findOpenShiftByVehicleId$(aid, { _id: 1 }).pipe(
            filter(shift => shift),
            mergeMap(({ _id }) => eventSourcing.eventStore.emitEvent$(
                this.buildShiftVehicleBlockAddedEsEvent(_id, data.blockKey, user))), //Build and send ShiftVehicleBlockAdded event (event-sourcing)
        );
    }

    //#region Object builders

    /**
      * Builds a Event-Sourcing Event of type ShiftVehicleBlockAdded
      * @param {*} shiftId 
      * @returns {Event}
      */
    buildShiftVehicleBlockAddedEsEvent(shiftId, blockKey, user = 'SYSTEM') {
        return new Event({
            aggregateType: 'Shift',
            aggregateId: shiftId,
            eventType: 'ShiftVehicleBlockAdded',
            eventTypeVersion: 1,
            user,
            data: { blockKey }
        });
    }
    /**
     * Builds a Event-Sourcing Event of type ShiftVehicleBlockRemoved
     * @param {*} shiftId 
     * @returns {Event}
     */
    buildShiftVehicleBlockRemovedEsEvent(shiftId, blockKey, user = 'SYSTEM') {
        return new Event({
            aggregateType: 'Shift',
            aggregateId: shiftId,
            eventType: 'ShiftVehicleBlockRemoved',
            eventTypeVersion: 1,
            user,
            data: { blockKey }
        });
    }

    //#endregion
}

/**
 * @returns {VehicleES}
 */
module.exports = () => {
    if (!instance) {
        instance = new VehicleES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};