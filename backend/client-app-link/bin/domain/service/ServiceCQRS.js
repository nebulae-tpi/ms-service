"use strict";


const uuidv4 = require("uuid/v4");
const { of, interval, forkJoin } = require("rxjs");
const { mapTo, mergeMap, catchError, map, toArray, mergeMapTo, tap } = require('rxjs/operators');

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
} = require("../../tools/customError");

//const { ShiftDA, VehicleDA, DriverDA, ServiceDA } = require('./data-access')
const { ShiftDA, ServiceDA } = require('./data-access')

/**
 * Singleton instance
 */
let instance;

class ServiceCQRS {
  constructor() {
  }

  queryCurrentServices$({ root, args, jwt }, authToken) {

    return of('');
    // const { clientId } = authToken;
    // let { year, month, page, count } = args;

    // const currentYear = new Date().getFullYear();
    // const currentMonth = new Date().getMonth() + 1;

    // year = (!year || year < 2019 || year > currentYear) ? currentYear : year;
    // month = (!month || month < 1 || month > 12) ? currentMonth : month;
    // page = (!page || page < 0 || page > 100) ? 0 : page;
    // count = (!count || count < 1 || count > 100) ? 20 : count;

    // //ServiceCQRS.log(`ServiceCQRS.queryHistoricalClientServices RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    // return RoleValidator.checkPermissions$(authToken.realm_access.roles, "client-app-link.ServiceCQRS", "queryHistoricalClientServices", PERMISSION_DENIED, ["CLIENT"])
    // .pipe(
    //   mergeMapTo(ServiceDA.findHistoricalServiceByClient$(clientId, year, month, page, count, {
    //     timestamp: 1, pickUp: 1, dropOff: 1, requestedFeatures: 1, paymentType: 1, fareDiscount: 1, fare: 1, state: 1
    //   })),
    //   map(service => this.formatServiceToGraphQLSchema(service)),
    //   toArray(),
    //   first(arr => arr, []),
    //   //tap(x => ServiceCQRS.log(`ServiceCQRS.queryHistoricalClientServices RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINEs
    //   mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
    //   catchError(err => GraphqlResponseTools.handleError$(err, true))
    // );
  }

  /**  
   * Queries and return a historical Service done by the client
   */
  queryHistoricalClientServices$({ root, args, jwt }, authToken) {
    const { clientId } = authToken;
    let { year, month, page, count } = args;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    year = (!year || year < 2019 || year > currentYear) ? currentYear : year;
    month = (!month || month < 1 || month > 12) ? currentMonth : month;
    page = (!page || page < 0 || page > 100) ? 0 : page;
    count = (!count || count < 1 || count > 100) ? 20 : count;

    //ServiceCQRS.log(`ServiceCQRS.queryHistoricalClientServices RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "client-app-link.ServiceCQRS", "queryHistoricalClientServices", PERMISSION_DENIED, ["CLIENT"])
    .pipe(
      mergeMapTo(ServiceDA.findHistoricalServiceByClient$(clientId, year, month, page, count, {
        timestamp: 1, pickUp: 1, dropOff: 1, requestedFeatures: 1, paymentType: 1, fareDiscount: 1, fare: 1, state: 1
      })),
      map(service => this.formatServiceToGraphQLSchema(service)),
      toArray(),
      first(arr => arr, []),
      //tap(x => ServiceCQRS.log(`ServiceCQRS.queryHistoricalClientServices RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINEs
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  formatServiceToGraphQLSchema(service) {
    const marker = (!service || !service.pickUp || !service.pickUp.marker) ? undefined : { lng: service.pickUp.marker.coordinates[0], lat: service.pickUp.marker.coordinates[1] };

    return !service ? undefined : { ...service, vehicle: { plate: service.vehicle ? service.vehicle.licensePlate : '' }, pickUp: { ...service.pickUp, marker }, route: undefined, id: service._id };
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
