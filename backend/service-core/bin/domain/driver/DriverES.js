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

class DriverES {

    constructor() {
    }

    /**
     * in case the Driver has an open shift, then updates the block array
     * @param {Event} driverBlockRemovedEvt
     */
    handleDriverBlockRemoved$({ aid, data }) {
        return ShiftDA.findOpenShiftByDriver$(aid, { _id: 1 }).pipe(
            filter(shift => shift),
            mergeMap(({ _id }) => eventSourcing.eventStore.emitEvent$(
                this.buildShiftDriverBlockRemovedEsEvent(_id, data.blockKey))), //Build and send ShiftDriverBlockRemoved event (event-sourcing)
        );
    }

    /**
     * in case the Driver has an open shift, then updates the block array
     * @param {Event} driverBlockAddedEvt
     */
    handleDriverBlockAdded$({ aid, data }) {
        return ShiftDA.findOpenShiftByDriver$(aid, { _id: 1 }).pipe(
            filter(shift => shift),
            mergeMap(({ _id }) => eventSourcing.eventStore.emitEvent$(
                this.buildShiftDriverBlockAddedEsEvent(_id, data.blockKey))), //Build and send ShiftDriverBlockAdded event (event-sourcing)
        );
    }
    //#region Object builders

    /**
     * Builds a Event-Sourcing Event of type ShiftDriverBlockAdded
     * @param {*} shiftId 
     * @returns {Event}
     */
    buildShiftDriverBlockAddedEsEvent(shiftId, blockKey) {
        return new Event({
            aggregateType: 'Shift',
            aid: shiftId,
            eventType: 'ShiftDriverBlockAdded',
            eventTypeVersion: 1,
            user: 'SYSTEM',
            data: { blockKey }
        });
    }
    /**
     * Builds a Event-Sourcing Event of type ShiftDriverBlockRemoved
     * @param {*} shiftId 
     * @returns {Event}
     */
    buildShiftDriverBlockRemovedEsEvent(shiftId, blockKey) {
        return new Event({
            aggregateType: 'Shift',
            aid: shiftId,
            eventType: 'ShiftDriverBlockRemoved',
            eventTypeVersion: 1,
            user: 'SYSTEM',
            data: { blockKey }
        });
    }

    //#endregion
}

/**
 * @returns {DriverES}
 */
module.exports = () => {
    if (!instance) {
        instance = new DriverES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};