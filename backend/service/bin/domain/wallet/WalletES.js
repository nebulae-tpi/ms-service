'use strict'

const {of} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo, delay } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const VehicleDA = require('.');
const DriverDA = require('../../data/DriverDA');
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";

/**
 * Singleton instance
 */
let instance;

class VehicleES {

    constructor() {
    }

    handleWalletUpdated$({ aid, data, user }) {
        return of(data)
            .pipe(
                DriverDA.updateDriverWallet$(driverId, wallet)
            );
    }

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