"use strict";

const uuidv4 = require("uuid/v4");
const { of, interval } = require("rxjs");
const Event = require("@nebulae/event-store").Event;
const eventSourcing = require("../../tools/EventSourcing")();
const ClientDA = require('./data-access/ClientDA');
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const RoleValidator = require("../../tools/RoleValidator");
const { take, mergeMap, catchError, map, toArray } = require('rxjs/operators');
const {
  CustomError,
  DefaultError,
  INTERNAL_SERVER_ERROR_CODE,
  PERMISSION_DENIED
} = require("../../tools/customError");



/**
 * Singleton instance
 */
let instance;

class ClientCQRS {
  constructor() {
  }

    /**
   * Get client satellite data (Location, neighborhood, city, ...)
   * @param {*} param0 
   * @param {*} authToken 
   */
  getClientSatellite$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Client",
      "getClientSatellite",
      PERMISSION_DENIED,
      ["SATELLITE"]
    ).pipe(
      mergeMap(roles => ClientDA.getClientSatellite$(authToken.clientId)),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  /**
   * Get the satellite clients data (Location, neighborhood, city, ...)
   * @param {*} args 
   * @param {*} authToken 
   */
  getSatelliteClients$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Client",
      "getSatelliteClients",
      PERMISSION_DENIED,
      ["OPERATOR"]
    ).pipe(
      mergeMap(roles => ClientDA.getSatelliteClients$(args.clienText)),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  //#endregion

}

/**
 * @returns {ClientCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new ClientCQRS();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
