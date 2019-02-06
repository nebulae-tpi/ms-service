"use strict";


const uuidv4 = require("uuid/v4");
const { of, interval, forkJoin, from } = require("rxjs");
const { mergeMapTo, mergeMap, catchError, map, toArray, filter, first, tap ,defaultIfEmpty} = require('rxjs/operators');

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
  ERROR_23010, ERROR_23011, ERROR_23012, ERROR_23013, ERROR_23014, ERROR_23015, ERROR_23016, ERROR_23020, ERROR_23021, ERROR_23025, ERROR_2306, ERROR_23027, ERROR_23028,
} = require("../../tools/customError");

const { DriverDA, VehicleDA } = require('./data-access')


/**
 * Singleton instance
 */
let instance;

class DriverCQRS {
  constructor() {
  }

  /**  
   * Gets Driver's Assigned Vehicles
   */
  queryDriverAssignedVehicles$({ root, args, jwt }, authToken) {

    const { driverId } = authToken;

    console.log(`DriverCQRS.queryDriverAssignedVehicles RQST: ${JSON.stringify({driverId})}`); //TODO: DELETE THIS LINE

    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.DriverCQRS", "queryDriverAssignedVehicles", PERMISSION_DENIED, ["DRIVER"]).pipe(
      mergeMapTo(DriverDA.findById$(driverId, { assignedVehicles: 1 })),
      defaultIfEmpty( {assignedVehicles:[]} ),
      map(  ({ assignedVehicles })  => { return (!assignedVehicles || assignedVehicles.length <= 0) ? [] : assignedVehicles ;}),
      first(),
      mergeMap(( assignedVehicles ) => from(assignedVehicles)),
      mergeMap(licensePlate => VehicleDA.findByLicensePlate$(licensePlate).pipe(filter(v => v))),
      map(vehicle => ({ plate: vehicle.licensePlate, blocks: vehicle.blocks, active: vehicle.active })),
      toArray(),
      tap(x => console.log(`DriverCQRS.queryDriverAssignedVehicles RESP: ${JSON.stringify(x)}`)),//TODO: DELETE THIS LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),      
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }


}

/**
 * @returns {DriverCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new DriverCQRS();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
