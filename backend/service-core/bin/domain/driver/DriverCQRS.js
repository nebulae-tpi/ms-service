"use strict";


const uuidv4 = require("uuid/v4");
const { of, interval, forkJoin, from } = require("rxjs");
const { mergeMapTo, mergeMap, catchError, map, toArray, filter, first, tap } = require('rxjs/operators');

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
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.DriverCQRS", "queryDriverAssignedVehicles", PERMISSION_DENIED, ["DRIVER"]).pipe(
      tap( x => console.log(`00=========${JSON.stringify(x)}==========`) ),
      mergeMapTo(DriverDA.findById$(driverId, { assignedVehicles: 1 })),
      tap( x => console.log(`01=========${JSON.stringify(x)}==========`) ),
      filter(driver => driver),
      tap( x => console.log(`02=========${JSON.stringify(x)}==========`) ),
      map(  ({ assignedVehicles })  => { (!assignedVehicles || assignedVehicles.length <= 0) ? [] : assignedVehicles }),
      tap( x => console.log(`03=========${JSON.stringify(x)}==========`) ),
      first(),
      tap( x => console.log(`04=========${JSON.stringify(x)}==========`) ),
      mergeMap(( assignedVehicles ) => from(assignedVehicles)),
      tap( x => console.log(`05=========${JSON.stringify(x)}==========`) ),
      mergeMap(licensePlate => VehicleDA.findByLicensePlate$(licensePlate).pipe(filter(v => v))),
      tap( x => console.log(`06=========${JSON.stringify(x)}==========`) ),
      map(vehicle => ({ plate: vehicle.licensePlate, blocks: vehicle.blocks, active: vehicle.active })),
      tap( x => console.log(`07=========${JSON.stringify(x)}==========`) ),
      toArray(),
      tap( x => console.log(`08=========${JSON.stringify(x)}==========`) ),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      tap( x => console.log(`09=========${JSON.stringify(x)}==========`) ),
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
