"use strict";


const uuidv4 = require("uuid/v4");
const { of, interval, forkJoin } = require("rxjs");
const { mapTo, mergeMap, catchError, map, mergeMapTo, tap } = require('rxjs/operators');

const RoleValidator = require("../../tools/RoleValidator");
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();
const broker = require("../../tools/broker/BrokerFactory")();
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const Crosscutting = require('../../tools/Crosscutting');
const {
  CustomError,
  DefaultError,
  INTERNAL_SERVER_ERROR_CODE,
  PERMISSION_DENIED,
  ERROR_23010,
} = require("../../tools/customError");

const { ShiftDA, VehicleDA, DriverDA, ServiceDA } = require('./data-access')


/**
 * Singleton instance
 */
let instance;

class ServiceCQRS {
  constructor() {
  }



  /**  
   * Gets Open shift
   */
  queryService$({ root, args, jwt }, authToken) {

    const { id } = args;

    console.log(`ServiceCQRS.queryService RQST: ${JSON.stringify(args)}`); //TODO: DELETE THIS LINE

    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ShiftCQRS", "queryOpenShift", PERMISSION_DENIED, ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE"]).pipe(
      mergeMapTo(ServiceDA.findById$(id)),
      map(service => this.formatServiceToGraphQLSchema(service)),
      tap(x => console.log(`ServiceCQRS.queryService RESP: ${JSON.stringify(x)}`)),//TODO: DELETE THIS LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  requestServices$({ root, args, jwt }, authToken) {
    const { id } = args;

    console.log(`ServiceCQRS.requestServices RQST: ${JSON.stringify(args)}`); //TODO: DELETE THIS LINE

    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ShiftCQRS", "queryOpenShift", PERMISSION_DENIED, ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE"]).pipe(
      mergeMapTo(ServiceDA.findById$(id)),
      map(service => this.formatServiceToGraphQLSchema(service)),
      tap(x => console.log(`ServiceCQRS.requestServices RESP: ${JSON.stringify(x)}`)),//TODO: DELETE THIS LINE
      mapTo({accepted:true}),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }


  formatServiceToGraphQLSchema(service) {
    return { ...service, route: undefined };
  }

}

/**
 * @returns {ServiceCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new ServiceCQRS();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
