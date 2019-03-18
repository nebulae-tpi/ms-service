"use strict";


const dateFormat = require('dateformat');
const uuidv4 = require("uuid/v4");
const { of, interval, forkJoin, from, iif } = require("rxjs");
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
  ERROR_23010, ERROR_23011, ERROR_23012, ERROR_23013, ERROR_23014, ERROR_23015, ERROR_23016, ERROR_23020, ERROR_23021, ERROR_23025, ERROR_23026, ERROR_23027, ERROR_23028,
} = require("../../tools/customError");

const { ShiftDA, VehicleDA, DriverDA, ServiceDA } = require('./data-access')


/**
 * Singleton instance
 */
let instance;

class ShiftCQRS {
  constructor() {
  }

  /**  
   * Gets Open shift
   */
  queryOpenShift$({ root, args, jwt }, authToken) {
    const { driverId } = authToken;
    
    const deviceIdentifier = args.deviceIdentifier ? args.deviceIdentifier :  'unknown'
    
    //ShiftCQRS.log(`ShiftCQRS.queryOpenShift RQST: ${JSON.stringify({ driverId, })}`); //DEBUG: DELETE LINE

    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ShiftCQRS", "queryOpenShift", PERMISSION_DENIED, ["DRIVER"]).pipe(
      mergeMapTo(ShiftDA.findOpenShiftByDriverAndIdentifier$(driverId, deviceIdentifier)),
      map(shift => this.formatShitToGraphQLSchema(shift)),
      //tap(x => ShiftCQRS.log(`ShiftCQRS.queryOpenShift RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  /**  
   * Gets Open shift
   */
  queryNearbyVehicles$({ root, args, jwt }, authToken) {
    ShiftCQRS.log(`ShiftClientCQRS.queryNearbyVehicles RQST: ${JSON.stringify({ args })}`); //DEBUG: DELETE LINE

    const ratioMts = parseInt(process.env.NEARBY_VEHICLES_RATIOMTS || 1500);

    return of('queryNearbyVehicles').pipe(
      mergeMapTo(ShiftDA.findNearbyVehicles$(args.clientLocation, args.filters, ratioMts)),
      mergeMap(vehicles =>         
        iif(() => vehicles != null && vehicles.length > 0,      
          from(vehicles)
          .pipe(
            map(vehicle => this.formatShiftLocationToGraphQLSchema(vehicle)),
            toArray()
          ),
          of([])
      )),
      //tap(x => ShiftClientCQRS.log(`ShiftClientCQRS.queryNearbyVehicles RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  /**
   * Format shift achieve graphql scehma compilance
   * @param {*} shift 
   */
  formatShiftLocationToGraphQLSchema(shift) {    
    return (!shift) ? undefined : { lng: shift.location.coordinates[0], lat: shift.location.coordinates[1] };
  }

  


  /**
   * Build regular Command Accepted ACK
   */
  buildCommandAck() {
    return { accepted: true };
  }

  //#endregion

  static log(msg){
    console.log(`${dateFormat(new Date(), "isoDateTime")}: ${msg}`);
  }

}

/**
 * @returns {ShiftCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new ShiftCQRS();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
