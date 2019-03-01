'use strict'


const { of, iif, forkJoin, Observable } = require("rxjs");
const { mapTo, mergeMap, mergeMapTo, map, toArray, filter, delay } = require('rxjs/operators');

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();

const { ServiceDA, ShiftDA } = require('./data-access')

const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";

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
    handleServiceRequested$(evt) {
        return this.transmitEventToFrontEnd$(evt);
    }


    /**
     * Handles EventSourcing Event ServiceAssigned
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceAssigned$(evt) {
        return this.transmitEventToFrontEnd$(evt);
    }

    /**
     * Handles EventSourcing Event ServicePickUpETAReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServicePickUpETAReported$(evt) {
        return this.transmitEventToFrontEnd$(evt);
    }

    /**
     * Handles EventSourcing Event ServiceLocationReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceLocationReported$(evt) {
        return this.transmitEventToFrontEnd$(evt);
    }

    /**
     * Handles EventSourcing Event ServiceArrived
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceArrived$(evt) {
        return this.transmitEventToFrontEnd$(evt);
    }

    /**
     * Handles EventSourcing Event ServicePassengerBoarded
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServicePassengerBoarded$(evt) {
        return this.transmitEventToFrontEnd$(evt);
    }

    /**
     * Handles EventSourcing Event ServiceCompleted
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCompleted$(evt) {
        return this.transmitEventToFrontEnd$(evt);
    }

    /**
     * Handles EventSourcing Event ServiceClosed.
     * @param {*} ServiceClosedEvt 
     */
    handleServiceClosed$(evt) {
        return this.transmitEventToFrontEnd$(evt);
    }

    /**
     * Handles EventSourcing Event ServiceDropOffETAReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceDropOffETAReported$(evt) {
        return this.transmitEventToFrontEnd$(evt);
    }


    /**
     * Handles EventSourcing Event ServiceCancelledByOperator
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByOperator$(evt) {
        return this.transmitEventToFrontEnd$(evt);
    }

    /**
     * Handles EventSourcing Event ServiceCancelledByClient
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByClient$(evt) {
        return this.transmitEventToFrontEnd$(evt);
    }

    /**
     * Handles EventSourcing Event ServiceCancelledByDriver
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByDriver$(evt) {
        return this.transmitEventToFrontEnd$(evt);
    }

    /**
     * Handles EventSourcing Event ServiceCancelledBySystem
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledBySystem$(evt) {
        return this.transmitEventToFrontEnd$(evt);
    }


    transmitEventToFrontEnd$(serviceEvent) {
        return of(serviceEvent).pipe(
            delay(400),
            mergeMap(evt => ServiceDA.findById$(evt.aid)),
            map(service => this.formatServiceToGraphqlIOEService(service)),
            mergeMap(ioeService => broker.send$(MATERIALIZED_VIEW_TOPIC, `IOEService`, ioeService))
        );
    }

    formatServiceToGraphqlIOEService(service) {
        const marker = (!service || !service.pickUp || !service.pickUp.marker) ? undefined : { lng: service.pickUp.marker.coordinates[0], lat: service.pickUp.marker.coordinates[1] };
        return !service ? undefined : { ...service, vehicle: { plate: service.vehicle ? service.vehicle.licensePlate : '' }, pickUp: { ...service.pickUp, marker }, route: undefined, id: service._id };
    }

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