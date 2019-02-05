'use strict'


const { of, interval, forkJoin, empty } = require("rxjs");
const { mergeMapTo, tap, mergeMap, catchError, map, toArray, filter } = require('rxjs/operators');

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
    handleShiftStarted$({ data }) {
        const businessId = data.businessId;
        const driverUserName = data.driver.username;
        return driverAppLinkBroker.sendShiftEventToDrivers$(businessId, driverUserName, 'ShiftStateChanged', this.formatShitToGraphQLSchema(data));
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftStateChangedEvt 
     */
    handleShiftStateChanged$({ aid, data }) {
        const businessId = data.businessId;
        const driverUserName = data.driverUsername;
        return driverAppLinkBroker.sendShiftEventToDrivers$(businessId, driverUserName, 'ShiftStateChanged', { _id: aid, state: data.state });
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftConnectedEvt
     */
    handleShiftConnected$({ aid }) {
        return empty();
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftDisconnectedEvt
     */
    handleShiftDisconnected$({ aid }) {
        return empty();
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftStoppedEvt
     */
    handleShiftStopped$({ aid, data }) {
        const businessId = data.businessId;
        const driverUserName = data.driverUsername;
        return driverAppLinkBroker.sendShiftEventToDrivers$(businessId, driverUserName, 'ShiftStateChanged', { _id: aid, state: 'CLOSED' });
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftVehicleBlockRemovedEvt
     */
    handleShiftVehicleBlockRemoved$({ aid, data }) {
        const businessId = data.businessId;
        const driverUserName = data.driverUsername;
        return ShiftDA.findById$(aid, { vehicle: 1 }).pipe(
            mergeMap(({ vehicle }) => driverAppLinkBroker.sendShiftEventToDrivers$(businessId, driverUserName, 'ShiftStateChanged', { _id: aid, vehicle }))
        );
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftVehicleBlockAddedEvt
     */
    handleShiftVehicleBlockAdded$({ aid, data }) {
        const businessId = data.businessId;
        const driverUserName = data.driverUsername;
        return ShiftDA.findById$(aid, { vehicle: 1 }).pipe(
            mergeMap(({ vehicle }) => driverAppLinkBroker.sendShiftEventToDrivers$(businessId, driverUserName, 'ShiftStateChanged', { _id: aid, vehicle }))
        );
    }

    /**
    * process event and forwards the right data to the drivers
    * @param {Event} shiftDriverBlockRemovedEvt
    */
    handleShiftDriverBlockRemoved$({ aid, data }) {
        const businessId = data.businessId;
        const driverUserName = data.driverUsername;
        return ShiftDA.findById$(aid, { driver: 1 }).pipe(
            mergeMap(({ driver }) => driverAppLinkBroker.sendShiftEventToDrivers$(businessId, driverUserName, 'ShiftStateChanged', { _id: aid, driver }))
        );
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftDriverBlockAddedEvt
     */
    handleShiftDriverBlockAdded$({ aid, data }) {
        const businessId = data.businessId;
        const driverUserName = data.driverUsername;
        return ShiftDA.findById$(aid, { driver: 1 }).pipe(
            mergeMap(({ driver }) => driverAppLinkBroker.sendShiftEventToDrivers$(businessId, driverUserName, 'ShiftStateChanged', { _id: aid, driver }))
        );
    }

    /**
     * process event and forwards the right data to the drivers
     * @param {Event} shiftLocationReportedEvt
     */
    handleShiftLocationReported$({ aid, data }) {
        return empty();
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
            driver: {
                fullname: shift.driver.fullname,
                username: shift.driver.username,
                blocks: shift.driver.blocks,
                active: true
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