'use strict'


const { of, interval, forkJoin } = require("rxjs");
const { take, mergeMap, tap, catchError, map, toArray, filter } = require('rxjs/operators');

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
                this.buildShiftVehicleBlockRemovedEsEvent(_id, { key: data.blockKey, notes: data.notes, startTime: undefined, endTime: data.endTime }, user))), //Build and send ShiftVehicleBlockRemoved event (event-sourcing)
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
                this.buildShiftVehicleBlockAddedEsEvent(_id, { key: data.blockKey, notes: data.notes, startTime: undefined, endTime: data.endTime }, user))), //Build and send ShiftVehicleBlockAdded event (event-sourcing)
        );
    }

    handleVehicleSubscriptionTypeUpdated$({ aid, data, user }) {
        const update = { "subscriptionType": data.type }
        return ShiftDA.findOpenShiftByVehicleIdAndUpdate$(aid, update).pipe(
            filter(shift => shift),
            tap(ns => console.log("NEW SHIFT ==> ", ns)),
            mergeMap(( _id, state ) => eventSourcing.eventStore.emitEvent$(
                this.buildEventSourcingEvent('Shift', shiftId, 'ShiftStateChanged', { _id, state }, user)            
            ))
            
        );
    }

    /**
     * Generates an EventSourcing Event
     * @param {*} aggregateType 
     * @param {*} aggregateId defaults to generated DateBased Uuid
     * @param {*} eventType 
     * @param {*} data defaults to {}
     * @param {*} eventTypeVersion defaults to 1
    */
   buildEventSourcingEvent(aggregateType, aggregateId, eventType, data = {}, user = "SYSTEM", eventTypeVersion = 1) {
    return new Event({
        aggregateType,
        aggregateId,
        eventType,
        eventTypeVersion,
        user,
        data
    });
}

    //#region Object builders

    /**
      * Builds a Event-Sourcing Event of type ShiftVehicleBlockAdded
      * @param {*} shiftId 
      * @returns {Event}
      */
    buildShiftVehicleBlockAddedEsEvent(shiftId, block, user = 'SYSTEM') {
        return new Event({
            aggregateType: 'Shift',
            aggregateId: shiftId,
            eventType: 'ShiftVehicleBlockAdded',
            eventTypeVersion: 1,
            user,
            data:{ block}
        });
    }
    /**
     * Builds a Event-Sourcing Event of type ShiftVehicleBlockRemoved
     * @param {*} shiftId 
     * @returns {Event}
     */
    buildShiftVehicleBlockRemovedEsEvent(shiftId, block, user = 'SYSTEM') {
        return new Event({
            aggregateType: 'Shift',
            aggregateId: shiftId,
            eventType: 'ShiftVehicleBlockRemoved',
            eventTypeVersion: 1,
            user,
            data: {block}
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