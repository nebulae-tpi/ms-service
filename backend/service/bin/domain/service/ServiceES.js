'use strict'

const {} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const ServiceDA = require('../../data/ServiceDA');
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";

/**
 * Singleton instance
 */
let instance;

class ServiceES {

    constructor() {
    }


    /**
     * Persists the service on the materialized view according to the received data from the event store.
     * @param {*} businessCreatedEvent business created event
     */
    handleServiceCreated$(serviceCreatedEvent) {  
        const service = serviceCreatedEvent.data;
        return ServiceDA.createService$(service)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceServiceUpdatedSubscription`, result.ops[0]))
        );
    }

        /**
     * Update the general info on the materialized view according to the received data from the event store.
     * @param {*} serviceGeneralInfoUpdatedEvent service created event
     */
    handleServiceGeneralInfoUpdated$(serviceGeneralInfoUpdatedEvent) {  
        const serviceGeneralInfo = serviceGeneralInfoUpdatedEvent.data;
        return ServiceDA.updateServiceGeneralInfo$(serviceGeneralInfoUpdatedEvent.aid, serviceGeneralInfo)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceServiceUpdatedSubscription`, result))
        );
    }

    /**
     * updates the state on the materialized view according to the received data from the event store.
     * @param {*} ServiceStateUpdatedEvent events that indicates the new state of the service
     */
    handleServiceStateUpdated$(ServiceStateUpdatedEvent) {          
        return ServiceDA.updateServiceState$(ServiceStateUpdatedEvent.aid, ServiceStateUpdatedEvent.data)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceServiceUpdatedSubscription`, result))
        );
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