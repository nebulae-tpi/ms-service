'use strict'

const {of} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const ClientDA = require('./data-access/ClientDA');
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";

/**
 * Singleton instance
 */
let instance;

class ClientES {

    constructor() {
    }

    /**
     * Handles client satellite enbaled event
     * @param {*} clientSatelliteEnabled 
     */
    handleClientSatelliteEnabled$(clientSatelliteEnabled){
        return of(clientSatelliteEnabled)
        .pipe(
            mergeMap(clientSatelliteEnabled => ClientDA.updateClientSatellite$(clientSatelliteEnabled.aid, clientSatelliteEnabled.data) )
        )
    }


}



/**
 * @returns {ClientES}
 */
module.exports = () => {
    if (!instance) {
        instance = new ClientES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};