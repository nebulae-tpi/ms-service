'use strict'


const { of, interval, forkJoin } = require("rxjs");
const { take, mergeMap, catchError, map, toArray, filter } = require('rxjs/operators');

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();

const { ShiftDA } = require('./data-access');
const { DriverDA } = require("./data-access");

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
    handleDriverBlockRemoved$({ aid, data, user }) {
        return ShiftDA.findOpenShiftByDriver$(aid, { _id: 1 }).pipe(
            filter(shift => shift),
            mergeMap(({ _id }) => eventSourcing.eventStore.emitEvent$(
                this.buildShiftDriverBlockRemovedEsEvent(_id, { key: data.blockKey, notes: data.notes, startTime: undefined, endTime: data.endTime }, user))), //Build and send ShiftDriverBlockRemoved event (event-sourcing)
        );
    }

    /**
     * in case the Driver has an open shift, then updates the block array
     * @param {Event} driverBlockAddedEvt
     */
    handleDriverBlockAdded$({ aid, data, user }) {
        console.log("handleDriverBlockAdded$", aid, data, user);
        return ShiftDA.findOpenShiftByDriver$(aid, { _id: 1 })
            .pipe(
                filter(shift => shift),
                mergeMap(({ _id }) => eventSourcing.eventStore.emitEvent$(
                    this.buildShiftDriverBlockAddedEsEvent(_id, { key: data.blockKey, notes: data.notes, startTime: undefined, endTime: data.endTime }, user))
                ), //Build and send ShiftDriverBlockAdded event (event-sourcing)
            );
    }

    handleDriverCodeAdded$(DriverCodeAddedEvent) {          
        return DriverDA.addDriverCode$(DriverCodeAddedEvent.aid, DriverCodeAddedEvent.data.driverCode);
    }
    //#region Object builders

    /**
     * Builds a Event-Sourcing Event of type ShiftDriverBlockAdded
     * @param {*} shiftId 
     * @returns {Event}
     */
    buildShiftDriverBlockAddedEsEvent(shiftId, block, user = 'SYSTEM') {
        return new Event({
            aggregateType: 'Shift',
            aggregateId: shiftId,
            eventType: 'ShiftDriverBlockAdded',
            eventTypeVersion: 1,
            user,
            data: {block}
        });
    }
    /**
     * Builds a Event-Sourcing Event of type ShiftDriverBlockRemoved
     * @param {*} shiftId 
     * @returns {Event}
     */
    buildShiftDriverBlockRemovedEsEvent(shiftId, block, user = 'SYSTEM') {
        return new Event({
            aggregateType: 'Shift',
            aggregateId: shiftId,
            eventType: 'ShiftDriverBlockRemoved',
            eventTypeVersion: 1,
            user,
            data: {block}
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