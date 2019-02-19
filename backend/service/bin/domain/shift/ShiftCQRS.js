"use strict";

const uuidv4 = require("uuid/v4");
const { of, interval } = require("rxjs");
const { take, mergeMap, catchError, map, toArray } = require('rxjs/operators');
const Event = require("@nebulae/event-store").Event;
const eventSourcing = require("../../tools/EventSourcing")();
const ShiftDA = require('./data-access/ShiftDA');
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const RoleValidator = require("../../tools/RoleValidator");
const {
  CustomError,
  DefaultError,
  INTERNAL_SERVER_ERROR_CODE,
  PERMISSION_DENIED,
  ERROR_23020,
  ERROR_23021,
  ERROR_23022
} = require("../../tools/customError");



/**
 * Singleton instance
 */
let instance;

class ClientCQRS {
  constructor() {
  }

    /**  
   * Gets the Driver
   *
   * @param {*} args args
   */
  getShift$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Shift",
      "getShift",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-MANAGER", "BUSINESS-VIEWER", "OPERATOR"]
    ).pipe(
      mergeMap(() => ShiftDA.getShiftById$(args.id) ),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

    /**
   * 
   * @param {*} param0 
   * @param {*} authToken 
   */
  getShiftList$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Shift",
      "getShiftList",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-MANAGER", "BUSINESS-VIEWER", "OPERATOR"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Driver from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): args.filterInput.businessId;
        const filterInput = args.filterInput;
        filterInput.businessId = businessId;
        return ShiftDA.getShiftList$(filterInput, args.paginationInput);
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
  getShiftListSize$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Shift",
      "getShiftListSize",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-MANAGER", "BUSINESS-VIEWER", "OPERATOR"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Driver from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): args.filterInput.businessId;
        const filterInput = args.filterInput;
        filterInput.businessId = businessId;
        return ShiftDA.getShiftListSize$(filterInput);
      }),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }


  getShiftStateChangesList$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Shift",
      "getShiftStateChangesList",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-MANAGER", "BUSINESS-VIEWER", "OPERATOR"]
    ).pipe(
      mergeMap(roles => ShiftDA.getShiftStateChangeList$(args.id, args.paginationInput)),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }


  getShiftStateChangesListSize$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Shift",
      "getShiftStateChangesListSize",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-MANAGER", "BUSINESS-VIEWER", "OPERATOR"]
    ).pipe(
      mergeMap(roles => ShiftDA.getShiftStateChangeListSize$(args.id)),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  getShiftOnlineChangesList$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Shift",
      "getShiftOnlineChangesList",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-MANAGER", "BUSINESS-VIEWER", "OPERATOR"]
    ).pipe(
      mergeMap(roles => ShiftDA.getShiftOnlineChangeList$(args.id, args.paginationInput) ),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  getShiftOnlineChangesListSize$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Shift",
      "getShiftOnlineChangesListSize",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-MANAGER", "BUSINESS-VIEWER", "OPERATOR"]
    ).pipe(
      mergeMap(roles =>  ShiftDA.getShiftOnlineChangeListSize$(args.id) ),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  closeShift$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Shift",
      "closeShift",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-MANAGER", "BUSINESS-VIEWER", "OPERATOR"]
    ).pipe(
      mergeMap(() => ShiftDA.getShiftById$(args.id)),  

      tap(shift => { if (!shift) throw ERROR_23020; }), // Driver does not have an open shift verification
      tap((shift) => { if (shift.state === 'BUSY') throw ERROR_23021; }), // Open Service verfication
      tap((shift) => { if (shift.state === 'CLOSED') throw ERROR_23022; }), // Service already closed

      mergeMap(shift => this.generateEventStoreEvent$("ShiftStateChanged", 1, "Shift", shift._id, { ...shift, state: "CLOSED" }, authToken.preferred_username)),
      mergeMap(event =>  eventSourcing.eventStore.emitEvent$(event)),
      map(() => ({ code: 200, message: `Shift with ID ${args.id} has been closed` })),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }
  //#endregion

  generateEventStoreEvent$(eventType, eventVersion, aggregateType, aggregateId, data, user) {
    return of(new Event({
      eventType: eventType,
      eventTypeVersion: eventVersion,
      aggregateType: aggregateType,
      aggregateId: aggregateId,
      data: data,
      user: user
    }))
  }

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
