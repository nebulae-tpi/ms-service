'use strict'

const {} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const DriverDA = require('../../data/DriverDA');
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";

/**
 * Singleton instance
 */
let instance;

class DriverES {

    constructor() {
    }


    /**
     * Persists the driver on the materialized view according to the received data from the event store.
     * @param {*} businessCreatedEvent business created event
     */
    handleDriverCreated$(driverCreatedEvent) {  
        const driver = driverCreatedEvent.data;
        return DriverDA.createDriver$(driver)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceDriverUpdatedSubscription`, result.ops[0]))
        );
    }

        /**
     * Update the general info on the materialized view according to the received data from the event store.
     * @param {*} driverGeneralInfoUpdatedEvent driver created event
     */
    handleDriverGeneralInfoUpdated$(driverGeneralInfoUpdatedEvent) {  
        const driverGeneralInfo = driverGeneralInfoUpdatedEvent.data;
        return DriverDA.updateDriverGeneralInfo$(driverGeneralInfoUpdatedEvent.aid, driverGeneralInfo)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceDriverUpdatedSubscription`, result))
        );
    }

    /**
     * updates the state on the materialized view according to the received data from the event store.
     * @param {*} DriverStateUpdatedEvent events that indicates the new state of the driver
     */
    handleDriverStateUpdated$(DriverStateUpdatedEvent) {          
        return DriverDA.updateDriverState$(DriverStateUpdatedEvent.aid, DriverStateUpdatedEvent.data)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceDriverUpdatedSubscription`, result))
        );
    }

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