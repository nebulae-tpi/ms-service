"use strict";

const uuidv4 = require("uuid/v4");
const { of, interval, from, throwError, forkJoin } = require("rxjs");
const { take, mergeMap, catchError, map, toArray, tap } = require('rxjs/operators');
const Event = require("@nebulae/event-store").Event;
const eventSourcing = require("../../tools/EventSourcing")();
const DriverDA = require("../../data/DriverDA");
const VehicleDA = require('../../data/VehicleDA');
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const RoleValidator = require("../../tools/RoleValidator");
const DriverHelper = require('./DriverHelper');
const {
  CustomError,
  DefaultError,
  INTERNAL_SERVER_ERROR_CODE,
  PERMISSION_DENIED,
  LICENSE_PLATE_NOT_ALLOWED_TO_USE
} = require("../../tools/customError");



/**
 * Singleton instance
 */
let instance;

class DriverCQRS {
  constructor() {
  }

  /**  
   * Gets the Driver
   *
   * @param {*} args args
   */
  getDriver$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Driver",
      "getDriver",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Driver from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin ? (authToken.businessId || '') : null;
        return DriverDA.getDriver$(args.id, businessId)
      }),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(error => GraphqlResponseTools.handleError$(error))
    );
  }

  /**  
   * Gets the Driver list
   *
   * @param {*} args args
   */
  getDriverList$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Driver",
      "getDriverList",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Driver from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin ? (authToken.businessId || '') : args.filterInput.businessId;
        const filterInput = args.filterInput;
        filterInput.businessId = businessId;
        return DriverDA.getDriverList$(filterInput, args.paginationInput);
      }),
      toArray(),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  /**  
 * Gets the amount of the Driver according to the filter
 *
 * @param {*} args args
 */
  getDriverListSize$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Driver",
      "getDriverListSize",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Driver from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin ? (authToken.businessId || '') : args.filterInput.businessId;
        const filterInput = args.filterInput;
        filterInput.businessId = businessId;

        return DriverDA.getDriverSize$(filterInput);
      }),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  assignVehicleToDriver$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Service",
      "getDriverVehicles",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN"]
    )
      .pipe(
        mergeMap(() => DriverHelper.validateVehicleAsignment$(args.driverId, args.vehiclePlate)),
        mergeMap(() => eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: "VehicleAssigned",
            eventTypeVersion: 1,
            aggregateType: "Driver",
            aggregateId: args.driverId,
            data: { vehicleLicensePlate: args.vehiclePlate },
            user: authToken.preferred_username
          }))
        ),
        map(() => ({ code: 200, message: `${args.vehiclePlate} has been added to the driver with ID ${args.driverId}` })),
        mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
        catchError(err => GraphqlResponseTools.handleError$(err))
      );
  }

  unassignVehicleFromDriver$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Service",
      "getDriverVehicles",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN"]
    )
      .pipe(
        mergeMap(() => DriverHelper.validateVehicleUnassignment$(args.driverId, args.vehiclePlate)),
        mergeMap(allowed => allowed
          ? eventSourcing.eventStore.emitEvent$(
            new Event({
              eventType: "VehicleUnassigned",
              eventTypeVersion: 1,
              aggregateType: "Driver",
              aggregateId: args.driverId,
              data: { vehicleLicensePlate: args.vehiclePlate },
              user: authToken.preferred_username
            }))
          : throwError(new CustomError(
            'License Plate not allowed',
            'assignVehicleToDriver',
            LICENSE_PLATE_NOT_ALLOWED_TO_USE.code,
            LICENSE_PLATE_NOT_ALLOWED_TO_USE.description))
        ),
        map(() => ({ code: 200, message: `${args.vehiclePlate} has been added to the driver with ID ${args.driverId}` })),
        mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
        catchError(err => GraphqlResponseTools.handleError$(err))
      );
  }

  getDriverVehicles$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Service",
      "getDriverVehicles",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN"]
    ).pipe(
      mergeMap(() => DriverDA.getDriver$(args.driverId)),
      map(driver => driver.assignedVehicles),
      mergeMap((vehicleLit => VehicleDA.getDriverVehicles$(vehicleLit))),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }


  //#endregion
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
