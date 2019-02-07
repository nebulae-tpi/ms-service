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
   * Gets the Driver
   *
   * @param {*} args args
   */
  getShift$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Driver",
      "getDriver",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-MANAGER", "BUSINESS-VIEWER"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Driver from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): null;
        // return ShiftDA.getShift$(args.id, businessId)
        return of( {
          '_id': 'q1w2e3-r4t5y6-edfr567gt-yhuyj-734',
          'businessId': 'q1q1q1q-w2w2-e3e3-r4r4-t5y66656-545644',
          'timestamp': 1000000,
          'state': 'AVAILABLE',
          'stateChanges': [
            {
              'state': '',
              'timestamp': 123456,
            }
          ],
          'online': true,
          'onlineChanges': [{ 'online': true, 'timestamp': 23456 }],
          'lastReceivedComm': 1000000,
          'location': {
            'type': 'Point',
            'coordinates': [-73.9928, 40.7193]
          },
          'driver': {
            'id': 'e3r4t5-y6u7i8-q1w2e3-r4tt5y6-j6k7l8',
            'fullname': 'Juan Felipe Santa Ospina',
            'blocks': ['KEY', 'KEY'],
            'documentType': 'CC',
            'documentId': '1045059869',
            'pmr': false,
            'languages': ['EN'],
            'phone': '3125210012',
            'username': 'juan.santa',
          },
          'vehicle': {
            'id': 'w2e3-r4t5-y6u7-i8o9',
            'licensePlate': 'MNP137',
            'blocks': ['KEY', 'KEY'],
            'features': ['AC', 'TRUNK'],
            'brand': 'MAZDA',
            'line': 'Sport',
            'model': '2017',
          },
        })
      }),
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
      "Service",
      "getClientSatellite",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-MANAGER", "BUSINESS-VIEWER"]
    ).pipe(
      // mergeMap(roles => {
      //   const isPlatformAdmin = roles["PLATFORM-ADMIN"];
      //   //If an user does not have the role to get the Driver from other business, the query must be filtered with the businessId of the user
      //   const businessId = !isPlatformAdmin? (authToken.businessId || ''): args.filterInput.businessId;
      //   const filterInput = args.filterInput;
      //   filterInput.businessId = businessId;
      //   return ShiftDA.getShiftList$(filterInput, args.paginationInput);
      // }),
      // toArray(),
      map(() => ([
        {
          '_id': 'q1w2e3-r4t5y6-edfr567gt-yhuyj-734',
          'businessId': 'q1q1q1q-w2w2-e3e3-r4r4-t5y66656-545644',
          'timestamp': 1000000,
          'state': 'AVAILABLE',
          'stateChanges': [
            {
              'state': '',
              'timestamp': 123456,
            }
          ],
          'online': true,
          'onlineChanges': [{ 'online': true, 'timestamp': 23456 }],
          'lastReceivedComm': 1000000,
          'location': {
            'type': 'Point',
            'coordinates': [-73.9928, 40.7193]
          },
          'driver': {
            'id': 'e3r4t5-y6u7i8-q1w2e3-r4tt5y6-j6k7l8',
            'fullname': 'Juan Felipe Santa Ospina',
            'blocks': ['KEY', 'KEY'],
            'documentType': 'CC',
            'documentId': '1045059869',
            'pmr': false,
            'languages': ['EN'],
            'phone': '3125210012',
            'username': 'juan.santa',
          },
          'vehicle': {
            'id': 'w2e3-r4t5-y6u7-i8o9',
            'licensePlate': 'MNP137',
            'blocks': ['KEY', 'KEY'],
            'features': ['AC', 'TRUNK'],
            'brand': 'MAZDA',
            'line': 'Sport',
            'model': '2017',
          },
        }
      ])),
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
      "Driver",
      "getDriverListSize",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-MANAGER", "BUSINESS-VIEWER"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Driver from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): args.filterInput.businessId;
        const filterInput = args.filterInput;
        filterInput.businessId = businessId;

        // return ShiftDA.getShiftSize$(filterInput);
        return of(85);
      }),
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
