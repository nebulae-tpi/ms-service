'use strict'


const { of, interval, forkJoin, Observable } = require("rxjs");
const { take, mergeMap, catchError, map, toArray, filter } = require('rxjs/operators');

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();

const { ServiceDA } = require('./data-access')

/**
 * Singleton instance
 */
let instance;

class ServiceES {

    constructor() {
    }

    /**
     * Handles EventSourcing Event ServiceRequested
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceRequested$({ data }) {
        return ServiceDA.insertService$(evt);
    }


    /**
     * Handles EventSourcing Event ServiceAssigned
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceAssigned$({ aid, data }) {
        const { shiftId, driver, vehicle, skipPersist } = data;
        return skipPersist ? of({}) : ServiceDA.assignServiceNoRules$(aid, shiftId, driver, vehicle);
    }

    /**
     * Handles EventSourcing Event ServicePickUpETAReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServicePickUpETAReported$({ aid, data }) {
        const { eta } = data;
        return ServiceDA.setPickUpETA$(aid, eta);
    }

    /**
     * Handles EventSourcing Event ServiceLocationReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceLocationReported$({ aid, data }) {
        const { location } = data;
        return ServiceDA.appendLocation$(aid, location);
    }

    /**
     * Handles EventSourcing Event ServiceArrived
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceArrived$({ aid, data }) {
        const { location, timestamp } = data;
        return ServiceDA.appendstate$(aid, 'ARRIVED', location, timestamp);
    }

    /**
     * Handles EventSourcing Event ServicePassengerBoarded
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServicePassengerBoarded$({ aid, data }) {
        const { location, timestamp } = data;
        return ServiceDA.appendstate$(aid, 'ON_BOARD', location,timestamp);
    }

    /**
     * Handles EventSourcing Event ServiceCompleted
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCompleted$({ aid, data }) {
        const { location, timestamp } = data;
        return ServiceDA.appendstate$(aid, 'DONE', location,timestamp);
    }

    /**
     * Handles EventSourcing Event ServiceDropOffETAReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceDropOffETAReported$({ aid, data }) {
        const { eta } = data;
        return ServiceDA.setPickUpETA$(aid, eta);
    }

    /**
     * Handles EventSourcing Event ServiceCancelledByDriver
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByDriver$({ aid, data }) {
        const { reason, notes, location } = data;
        return ServiceDA.setCancelState$(aid, 'CANCELLED_DRIVER', location, reason, notes);
    }


    /**
     * Handles EventSourcing Event ServiceCancelledByClient
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByClient$({ aid, data }) {
        const { reason, notes, location } = data;
        return ServiceDA.setCancelState$(aid, 'CANCELLED_CLIENT', location, reason, notes);
    }

    /**
     * Handles EventSourcing Event ServiceCancelledByOperator
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByOperator$({ aid, data }) {
        const { reason, notes, location } = data;
        return ServiceDA.setCancelState$(aid,'CANCELLED_OPERATOR',location,reason,notes);
    }




    //#region Object builders



    //#endregion
}

/**
 * @returns {ServiceES}
 */
module.exports = () => {
    if (!instance) {
        instance = new ServiceES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};