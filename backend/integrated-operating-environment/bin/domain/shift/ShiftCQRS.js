"use strict";


const dateFormat = require('dateformat');
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

const { ShiftDA } = require('./data-access')

const READ_WRITE_ROLES = ["OPERATOR", "OPERATION-SUPERVISOR"];
const READ_ROLES = ["PLATFORM-ADMIN", "BUSINESS-OWNER", "OPERATOR", "OPERATION-SUPERVISOR"];


/**
 * Singleton instance
 */
let instance;

class ShiftCQRS {
  constructor() {
  }


  /**
   * query Shift
   * @param {*} param0 
   * @param {*} authToken 
   */
  queryShift$({ root, args, jwt }, authToken) {
    const { id } = args;
    ShiftCQRS.log(`ShiftCQRS.queryShift RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "ioe.ShiftCQRS", "queryShift", PERMISSION_DENIED, READ_ROLES).pipe(
      mapTo(args),
      mergeMap(() => ShiftDA.findById$(id)),
      map(shift => this.formatShiftToGraphQLSchema(shift)),
      tap(x => ShiftCQRS.log(`ShiftCQRS.queryShift RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  /**
   * query Shifts by filter
   * @param {*} param0 
   * @param {*} authToken 
   */
  queryShifts$({ root, args, jwt }, authToken) {
    //ShiftCQRS.log(`ShiftCQRS.queryShifts RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "ioe.ShiftCQRS", "queryShifts", PERMISSION_DENIED, READ_ROLES).pipe(
      mapTo(args),
      mergeMap(({ shiftStatesFilter = ["AVAILABLE", "NOT_AVAILABLE", "BUSY"], businessId, page, pageCount, monthsToAdd, projections }) => ShiftDA.findByFilters$(
        businessId ? businessId : authToken.businessId,
        shiftStatesFilter,
        page,
        pageCount,
        monthsToAdd,
        projections
      )),
      map(shift => this.formatShiftToGraphqlIOEShift(shift)),
      toArray(),
      //tap(x => ShiftCQRS.log(`ShiftCQRS.queryShifts RESP: ${x.length}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }


  formatShiftToGraphqlIOEShift(shift) {
    const location = (!shift || !shift.location || !shift.location.coordinates) ? undefined : { lng: shift.location.coordinates[0], lat: shift.location.coordinates[1] };
    return !shift ? undefined : { ...shift, location, id: shift._id };
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
