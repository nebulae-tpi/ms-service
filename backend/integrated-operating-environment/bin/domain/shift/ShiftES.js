'use strict'


const { of, interval, forkJoin, empty, merge } = require("rxjs");
const { mergeMapTo, tap, mergeMap, delay, map, toArray, filter } = require('rxjs/operators');

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();

const { ShiftDA, VehicleDA, DriverDA, ServiceDA } = require('./data-access')

const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";

/**
 * Singleton instance
 */
let instance;
const GOD_EYE_UPDATE_THRESHOLD = parseInt(process.env.GOD_EYE_UPDATE_THRESHOLD || "20000")

class ShiftES {

    constructor() {
        this.shiftUpdateCache = {timestamp: Date.now(), list: []}
    }
    
    handleShiftStarted$(evt) {
        return this.transmitEventToFrontEnd$(evt)
    }

    handleShiftStateChanged$(evt) {
        return this.transmitEventToFrontEnd$(evt)
    }

    handleShiftConnected$(evt) {
        return this.transmitEventToFrontEnd$(evt)
    }

    handleShiftDisconnected$(evt) {
        return this.transmitEventToFrontEnd$(evt)
    }

    handleShiftStopped$(evt) {
        return this.transmitEventToFrontEnd$(evt)
    }

    handleShiftVehicleBlockRemoved$(evt) {
        return this.transmitEventToFrontEnd$(evt)
    }

  
    handleShiftVehicleBlockAdded$(evt) {
        return this.transmitEventToFrontEnd$(evt)
    }


    handleShiftDriverBlockRemoved$(evt) {
        return this.transmitEventToFrontEnd$(evt)
    }


    handleShiftDriverBlockAdded$(evt) {
        return this.transmitEventToFrontEnd$(evt)
    }

    handleShiftLocationReported$(evt) {
        return this.transmitEventToFrontEnd$(evt)
    }


    transmitEventToFrontEnd$(shiftEvent) {
        return of(shiftEvent).pipe(
            mergeMap(evt => ShiftDA.findById$(evt.aid)),
            //tap(s => { if(!s){console.log(`shiftEvent of undefined shift: ${JSON.stringify(shiftEvent)}`)} }),
            filter(s => s),
            map(shift => this.formatShiftToGraphqlIOEShift(shift)),
            mergeMap(ioeShift => {
                if((instance.shiftUpdateCache.timestamp+GOD_EYE_UPDATE_THRESHOLD) > Date.now()){
                    instance.shiftUpdateCache.list.push(ioeShift)
                    return of({});
                }else {
                    return broker.send$(MATERIALIZED_VIEW_TOPIC, `IOEShiftList`, instance.shiftUpdateCache.list).pipe(
                        tap(() => {
                            instance.shiftUpdateCache.timestamp = Date.now();
                            instance.shiftUpdateCache.list = [];
                        })
                    )
                }
            })
        );
        // return of(shiftEvent).pipe(
        //     mergeMap(evt => ShiftDA.findById$(evt.aid)),
        //     tap(s => { if(!s){console.log(`shiftEvent of undefined shift: ${JSON.stringify(shiftEvent)}`)} }),
        //     filter(s => s),
        //     map(shift => this.formatShiftToGraphqlIOEShift(shift)),
        //     mergeMap(ioeShift => broker.send$(MATERIALIZED_VIEW_TOPIC, `IOEShift`, ioeShift))
        // );
    }

    formatShiftToGraphqlIOEShift(shift) {
        const location = (!shift || !shift.location || !shift.location.coordinates) ? undefined : { lng: shift.location.coordinates[0], lat: shift.location.coordinates[1] };
        return !shift ? undefined : { ...shift, location, id: shift._id };
    }
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