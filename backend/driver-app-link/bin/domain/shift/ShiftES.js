'use strict'

const { of, interval, forkJoin, empty } = require("rxjs");
const { mergeMapTo, tap, mergeMap, catchError, map, toArray, delay, filter } = require('rxjs/operators');

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();
const driverAppLinkBroker = require("../../services/driver-app-link/DriverAppLinkBroker")();

const { ShiftDA } = require('./data-access')

/**
 * Singleton instance
 */
let instance;

class ShiftES {

    constructor() {
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftStartedEvt
     */
    handleShiftStarted$({ aid, data }) {
        //console.log(`ShiftES: handleShiftStarted: ${JSON.stringify(data)} `); //DEBUG: DELETE LINE
        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }
        return driverAppLinkBroker.sendShiftEventToDrivers$(data.businessId, data.driver.username, 'ShiftStateChanged', this.formatShitToGraphQLSchema(data));
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftStateChangedEvt 
     */
    handleShiftStateChanged$({ aid, data }) {
        //console.log(`ShiftES: handleShiftStateChanged: ${JSON.stringify({ aid, data })} `);  //DEBUG: DELETE LINE
        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }
        return of({})
        .pipe(
            delay(300),
            mergeMap(() => ShiftDA.findById$(aid, { businessId: 1, allowPayPerService: 1, payPerServicePrice: 1, subscriptionType:1, driver: 1, vehicle: 1, state: 1 })),
            filter(shift => shift.driver && shift.vehicle),
            mergeMap((shift) => driverAppLinkBroker.sendShiftEventToDrivers$(shift.businessId, shift.driver.username, 'ShiftStateChanged', this.formatShitToGraphQLSchema({ ...shift, ...data })))
        );
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {*} shiftWalletUpdatedEvt 
     */
    handleShiftWalletUpdated$({ aid, data }) {
        //console.log(`ShiftES: handleShiftWalletUpdated: ${JSON.stringify({ aid, data })} `);  //DEBUG: DELETE LINE
        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }
        return of({})
        .pipe(
            delay(300),
            mergeMap(() => ShiftDA.findById$(aid, { businessId: 1, allowPayPerService: 1, payPerServicePrice: 1, subscriptionType:1, driver: 1, vehicle: 1, state: 1 })),
            filter(shift => shift.driver && shift.vehicle),
            mergeMap((shift) => driverAppLinkBroker.sendShiftEventToDrivers$(shift.businessId, shift.driver.username, 'ShiftStateChanged', this.formatShitToGraphQLSchema({ ...shift, ...data })))
        );
    }

    /**
     * process event and forwards the right data to the drivers.
     * @param {Event} shiftConnectedEvt
     */
    handleShiftConnected$({ aid }) {
        //console.log(`ShiftES: handleShiftConnected: ${JSON.stringify({ aid })} `);  //DEBUG: DELETE LINE
        return of({});
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftDisconnectedEvt
     */
    handleShiftDisconnected$({ aid }) {
        //console.log(`ShiftES: handleShiftDisconnected: ${JSON.stringify({ aid })} `);  //DEBUG: DELETE LINE
        return of({});
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftStoppedEvt
     */
    handleShiftStopped$({ aid, data }) {
        //console.log(`ShiftES: handleShiftStopped: ${JSON.stringify({ aid, data })} `);  //DEBUG: DELETE LINE
        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }
        return of({})
        .pipe(
            delay(300),
            mergeMap(() => ShiftDA.findById$(aid, { businessId: 1, "driver.username": 1 })),
            mergeMap(({ businessId, driver }) => driverAppLinkBroker.sendShiftEventToDrivers$(businessId, driver.username, 'ShiftStateChanged', { _id: aid, state: 'CLOSED' }))
        );
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftVehicleBlockRemovedEvt
     */
    handleShiftVehicleBlockRemoved$({ aid, data }) {
        //console.log(`ShiftES: handleShiftVehicleBlockRemoved: ${JSON.stringify({ aid, data })} `);  //DEBUG: DELETE LINE
        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }
        return of('')
        .pipe(
            delay(1000),
            mergeMap(() => ShiftDA.findById$(aid, { businessId: 1, "driver.username": 1, vehicle: 1 })),
            mergeMap(({ businessId, driver, vehicle }) => driverAppLinkBroker.sendShiftEventToDrivers$(businessId, driver.username, 'ShiftStateChanged', { _id: aid, vehicle }))
        );
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftVehicleBlockAddedEvt
     */
    handleShiftVehicleBlockAdded$({ aid, data }) {
        //console.log(`ShiftES: handleShiftVehicleBlockAdded: ${JSON.stringify({ aid, data })} `);  //DEBUG: DELETE LINE
        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }
        return of('')
        .pipe(
            delay(1000),
            mergeMap(() =>  ShiftDA.findById$(aid, { businessId: 1, "driver.username": 1, vehicle: 1 })),
            mergeMap(({ businessId, vehicle, driver }) => driverAppLinkBroker.sendShiftEventToDrivers$(businessId, driver.username, 'ShiftStateChanged', { _id: aid, vehicle }))
        );
    }

    /**
    * process event and forwards the right data to the drivers
    * @param {Event} shiftDriverBlockRemovedEvt
    */
    handleShiftDriverBlockRemoved$({ aid, data }) {
        //console.log(`ShiftES: handleShiftDriverBlockRemoved: ${JSON.stringify({ aid, data })} `);  //DEBUG: DELETE LINE
        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }
        return of('')
        .pipe(
            delay(1000),
            mergeMap(() => {
                return ShiftDA.findById$(aid, { driver: 1, businessId: 1 });
            }),
            mergeMap(({ businessId, driver }) => driverAppLinkBroker.sendShiftEventToDrivers$(businessId, driver.username, 'ShiftStateChanged', { _id: aid, driver }))
        );
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftDriverBlockAddedEvt
     */
    handleShiftDriverBlockAdded$({ aid, data }) {
        //console.log(`ShiftES: handleShiftDriverBlockAdded: ${JSON.stringify({ aid, data })} `);  //DEBUG: DELETE LINE        
        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }
        return of('')
            .pipe(
                delay(1000),
                mergeMap(() => {
                    return ShiftDA.findById$(aid, { businessId: 1, driver: 1 });
                }),
                mergeMap(({ businessId, driver }) =>
                    driverAppLinkBroker.sendShiftEventToDrivers$(businessId, driver.username, 'ShiftStateChanged', { _id: aid, driver })
                )
            );
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftLocationReportedEvt
     */
    handleShiftLocationReported$({ aid, data }) {
        //console.log(`ShiftES: handleShiftLocationReported: ${JSON.stringify({ aid, data })} `);  //DEBUG: DELETE LINE
        if (!aid) { console.log(`WARNING:   not aid detected`); return of({}) }
        return of({});
    }


    //#region Object builders & formatters

    /**
     * Format shift achieve graphql scehma compilance
     * @param {*} shift 
     */
    formatShitToGraphQLSchema(shift) {
        return (!shift) ? undefined : {
            _id: shift._id,
            state: shift.state,
            allowPayPerService: shift.allowPayPerService,
            payPerServicePrice: shift.payPerServicePrice,
            subscriptionType: shift.subscriptionType,
            driver: {
                fullname: shift.driver.fullname,
                username: shift.driver.username,
                blocks: shift.driver.blocks,
                active: true,
                wallet: shift.driver.wallet,
                driverCode: shift.driver.driverCode,
                referredCode: shift.driver.referredCode
            },
            vehicle: {
                plate: shift.vehicle.licensePlate,
                blocks: shift.vehicle.blocks,
                active: true
            },
        };
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