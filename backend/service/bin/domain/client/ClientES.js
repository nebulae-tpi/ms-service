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
            mergeMap(clientSatelliteEnabled => {
                if(clientSatelliteEnabled.data.satelliteInfo){
                    return ClientDA.updateClientSatellite$(clientSatelliteEnabled.aid, clientSatelliteEnabled.data)
                }else{
                    return of(clientSatelliteEnabled);
                }
            } )
        )
    }

    handleClientSatelliteIdUpdated$({ aid, data}){
        console.log("ClientES.handleClientSatelliteIdUpdated$", data);
        return ClientDA.updateClientSatelliteId$(aid, data.satelliteId, data.businessId);
    }

    handleClientCodeRegistered$({ aid, data}){
        return ClientDA.addClientCode$(aid, data.clientCode);
    }

    handleClientSatelliteInfoUpdated$({ aid, data}){
        return ClientDA.updateClientSatelliteInfo$(aid, data);
    }

    handleDriverAssociatedToClient$(DriverAssociatedToClientEvent) {          
        return ClientDA.addDriverCode$(DriverAssociatedToClientEvent.aid, DriverAssociatedToClientEvent.data.referrerDriverCode);
    }

    handleClientGeneralInfoUpdated$(evt) {          
        return ClientDA.updateGeneralInfo$(evt.aid, evt.data);
    }

    handleEndClientCreated$({aid, data}){
        return ClientDA.createClient$(data);
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