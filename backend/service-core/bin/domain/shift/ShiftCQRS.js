"use strict";


const dateFormat = require('dateformat');
const uuidv4 = require("uuid/v4");
const { of, interval, forkJoin } = require("rxjs");
const { mapTo, mergeMap,delay, catchError, map, toArray, mergeMapTo, tap } = require('rxjs/operators');

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
  ERROR_23010, ERROR_23011, ERROR_23012, ERROR_23013, ERROR_23014, ERROR_23015, ERROR_23016, ERROR_23017, ERROR_23020, ERROR_23021, ERROR_23025, ERROR_23026, ERROR_23027, ERROR_23028,
} = require("../../tools/customError");

const { ShiftDA, VehicleDA, DriverDA, ServiceDA, BusinessDA } = require('./data-access')


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

  associateDriver$({ root, args, jwt }, authToken) {    
    const referrerDriverCode = args.driverCode;
    console.log("referrerDriverCode ===> ", referrerDriverCode);
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ShiftCQRS", "startShift", PERMISSION_DENIED, ["DRIVER"]).pipe(
      //Validate the data
      mergeMap(roles => DriverDA.associateDriverCode$(authToken.driverId, referrerDriverCode)),
      mergeMap(() => {
        if (authToken.driverId) {
          return eventSourcing.eventStore.emitEvent$(
            new Event({
              eventType: "DriverAssociatedToDriver",
              eventTypeVersion: 1,
              aggregateType: "Driver",
              aggregateId: authToken.driverId,
              data: {
                referrerDriverCode
              },
              user: authToken.preferred_username
            })).pipe(
              mapTo({_id: authToken.driverId, referrerDriverCode, updated: true})
            )
        }else {
          throw new CustomError('Missing client ID in token', 'associateDriverToClient$', CLIENT_ID_MISSING.code, CLIENT_ID_MISSING.description); 
        }
      }
      ),
      mergeMap(() => GraphqlResponseTools.buildSuccessResponse$({accepted: true})),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  /**  
   * Starts a new shift for a driver
   */
  startShift$({ root, args, jwt }, authToken) {    
    const vehiclePlate = args.vehiclePlate.toUpperCase();
    const appVersion = args.appVersion;
    const deviceIdentifier = args.deviceIdentifier ? args.deviceIdentifier :  'unknown'
    const { businessId, driverId } = authToken;
    //ShiftCQRS.log(`ShiftCQRS.startShift RQST: ${JSON.stringify({ vehiclePlate, driverId, businessId })}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ShiftCQRS", "startShift", PERMISSION_DENIED, ["DRIVER"]).pipe(
      mergeMapTo(ShiftDA.findOpenShiftByDriver$(driverId).pipe(tap(shift => { if (shift) throw ERROR_23010; }))), // Driver has an open shift verification
      mergeMapTo(ShiftDA.findOpenShiftByVehiclePlate$(vehiclePlate).pipe(tap(shift => { if (shift) throw ERROR_23011; }))),  // Vehicle has an open shift verification
      mergeMapTo(BusinessDA.finOneBusiness$(businessId)),
      tap(business => {
          const versionValues = appVersion ? appVersion.split("-")[0].split(".") : [];
          if(versionValues.length > 0){
            const versionIntValue = versionValues.reduce((acc,val, index) => {
              let multiplier = 1
              switch(index){
                case 0:
                  multiplier = 1000;
                  break;
                case 1: 
                  multiplier = 100;
                  break;
                case 2: 
                  multiplier = 10;
                  break;
                default:
                  multiplier = 1
                  break;
              }
              return acc + (multiplier * val);
            },0);
            const minVersion = parseInt(((business.attributes || []).find(a => a.key === "DRIVER_APP_MIN_VERSION") || {}).value  || (process.env.DRIVER_APP_MIN_VERSION || "1670"));
            console.log("DATA VERSION ===> ", {versionIntValue, minVersion })
            if(versionIntValue < minVersion){
              console.log("SALE ERROR!!!!!!!!!!");
              throw ERROR_23017;
            } 
            
          }else {
            console.log("SALE ERROR2!!!!!!!!!!");
            throw ERROR_23017;
          }
          // versionValues[0]
          // if (!appVersion || ) throw ERROR_23017       
        
      }),
      mergeMapTo(
        forkJoin(
          VehicleDA.findByLicensePlate$(vehiclePlate),
          DriverDA.findById$(driverId), // quering vehicle + driver
          BusinessDA.finOneBusiness$(businessId, { "generalInfo": 1 })
        )          
      ),
      // tap(r => console.log(r)),
      tap(([vehicle, driver]) => { if (!vehicle) throw ERROR_23015; if (!driver) throw ERROR_23016 }), // Driver or Vehicle not found verfication
      tap(([vehicle, driver]) => { if (!vehicle.active) throw ERROR_23013; if (!driver.active) throw ERROR_23012 }), // Driver or Vehicle not active verfication
      tap(([vehicle, driver]) => { if (driver.assignedVehicles.map(p => p.toUpperCase()).indexOf(vehicle.licensePlate.toUpperCase()) <= -1) throw ERROR_23014; }),// vehicle not assigned to driver verification
      map(([vehicle, driver, businessInfo]) => this.buildShift(businessId, vehicle, driver, businessInfo, deviceIdentifier, authToken)),// build shift with all needed proerties
      tap( shift => {
        if(vehiclePlate.licensePlate === "FQX351"){
          console.log(JSON.stringify({ shift }));
        }
      }),
      mergeMap(shift => eventSourcing.eventStore.emitEvent$(this.buildShiftStartedEsEvent(authToken, shift))), //Build and send ShifStarted event (event-sourcing)
      mapTo(this.buildCommandAck()), // async command acknowledge
      //tap(x => ShiftCQRS.log(`ShiftCQRS.startShift RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }


  /**  
   * Sets the shift state from the driver
   */
  setShiftState$({ root, args, jwt }, authToken) {
    const { state } = args;
    const VALID_STATES = ["AVAILABLE", "NOT_AVAILABLE"];
    const { businessId, driverId } = authToken;

    //ShiftCQRS.log(`ShiftCQRS.setShiftState RQST: ${JSON.stringify({ state, driverId, businessId })}`); //DEBUG: DELETE LINE

    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ShiftCQRS", "setShiftState", PERMISSION_DENIED, ["DRIVER"]).pipe(
      tap(() => { if (VALID_STATES.indexOf(state) <= -1) throw ERROR_23027; }), //Invalid input state verification
      mergeMapTo(ShiftDA.findOpenShiftByDriver$(driverId)), // query driver's open shift
      tap(shift => { if (!shift) throw ERROR_23026; }),// Driver does not have an open shift verification
      tap((shift) => { if (shift.state === 'BUSY') throw ERROR_23028; }),// Open Service verfication
      tap((shift) => { if (shift.state === state) throw ERROR_23027; }),// same service state verifaction
      tap((shift) => { if (shift.state !== 'AVAILABLE' && shift.state !== 'NOT_AVAILABLE') throw ERROR_23025; }),// current state not alterable by the driver.  Verification
      //mergeMap(shift => ServiceDA.findOpeneServiceByShift$(shift._id).pipe(tap(service => { if (service) throw ERROR_23028; }), mapTo(shift))),// Open Service verfication
      mergeMap(shift => eventSourcing.eventStore.emitEvent$(this.buildShiftStateChangedEsEvent(authToken, shift, state))), //Build and send ShiftStateChanged event (event-sourcing)
      mapTo(this.buildCommandAck()), // async command acknowledge
      //tap(x => ShiftCQRS.log(`ShiftCQRS.setShiftState RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  /**  
   * stops/close an open shift
   */
  stopShift$({ root, args, jwt }, authToken) {
    const { businessId, driverId } = authToken;

    //ShiftCQRS.log(`ShiftCQRS.stopShift RQST: ${JSON.stringify({ driverId, businessId })}`); //DEBUG: DELETE LINE

    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ShiftCQRS", "stopShift", PERMISSION_DENIED, ["DRIVER"]).pipe(
      mergeMapTo(ShiftDA.findOpenShiftByDriver$(driverId)), // query driver's open shift
      tap(shift => { if (!shift) throw ERROR_23020; }),// Driver does not have an open shift verification
      tap((shift) => { if (shift.state === 'BUSY') throw ERROR_23021; }),// Open Service verfication      
      //mergeMap(shift => ServiceDA.findOpeneServiceByShift$(shift._id).pipe(tap(service => { if (service) throw ERROR_23021; }), mapTo(shift))),// Open Service verfication
      mergeMap(shift => eventSourcing.eventStore.emitEvent$(this.buildShiftStoppedEsEvent(authToken, shift))), //Build and send ShiftStopped event (event-sourcing)
      mapTo(this.buildCommandAck()), // async command acknowledge
      //tap(x => ShiftCQRS.log(`ShiftCQRS.stopShift RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  //#region  Object builders & formatters


  /**
   * Build a new shift
   * @param {*} vehicle 
   * @param {*} driver 
   */
  buildShift(businessId, vehicle, driver, businessInfo, deviceIdentifier, authToken) {
    //console.log(JSON.stringify(businessId, vehicle, driver, businessInfo, deviceIdentifier, authToken));
    
    const vehicleBlocked = (vehicle.blocks && vehicle.blocks.length > 0);
    const driverBlocked = (driver.blocks && driver.blocks.length > 0);
    const state = (vehicleBlocked || driverBlocked) ? 'BLOCKED' : 'AVAILABLE';
    const { allowPayPerService, payPerServicePrice } = (businessInfo || {}).generalInfo || {};
    const subscriptionType = (vehicle.subscription || {}).type || "REGULAR";

    return {
      "_id": Crosscutting.generateDateBasedUuid(),
      businessId,
      timestamp: Date.now(),
      allowPayPerService: allowPayPerService || false,
      payPerServicePrice: payPerServicePrice || 0,
      subscriptionType,
      state,
      stateChanges: [{ state, timestamp: Date.now() }],
      "online": true,
      onlineChanges: [{ online: true, timestamp: Date.now() }],
      "lastReceivedComm": Date.now(),
      // "location": {
      //   "type": "Point",
      //   "coordinates": [0, 0]
      // },
      "driver": {
        "id": driver._id,
        "fullname": `${driver.name} ${driver.lastname}`,
        "blocks": driver.blocks,
        "documentType": driver.documentType,
        "documentId": driver.documentId,
        "pmr": driver.pmr,
        "languages": driver.languages,
        "phone": driver.phone,
        "username": authToken.preferred_username,
        deviceIdentifier,
        "wallet": !driver.wallet ? null: {
          _id: driver.wallet._id,
          pockets: driver.wallet.pockets,
          businessId: driver.wallet.businessId
        },
        "driverCode": driver.driverCode,
        "referredCode": driver.referredCode
      },
      "vehicle": {
        "id": vehicle._id,
        "licensePlate": vehicle.licensePlate,
        "blocks": vehicle.blocks,
        "features": vehicle.features,
        "brand": vehicle.brand,
        "line": vehicle.line,
        "model": vehicle.model,
      },
    };
  }

  /**
   * Builds a Event-Sourcing Event of type ShiftStarted
   * @param {*} shift 
   * @returns {Event}
   */
  buildShiftStartedEsEvent(authToken, shift) {
    return new Event({
      aggregateType: 'Shift',
      aggregateId: shift._id,
      eventType: 'ShiftStarted',
      eventTypeVersion: 1,
      user: authToken.preferred_username,
      data: shift,
      online : true
    });
  }

  /**
   * Builds a Event-Sourcing Event of type ShiftStateChanged
   * @param {*} shift 
   * @returns {Event}
   */
  buildShiftStateChangedEsEvent(authToken, shift, state) {
    return new Event({
      aggregateType: 'Shift',
      aggregateId: shift._id,
      eventType: 'ShiftStateChanged',
      eventTypeVersion: 1,
      user: authToken.preferred_username,
      data: { state, businessId: shift.businessId, driverUsername: shift.driver.username }
    });
  }

  /**
   * Builds a Event-Sourcing Event of type ShiftStopped
   * @param {*} shift 
   * @returns {Event}
   */
  buildShiftStoppedEsEvent(authToken, shift) {
    return new Event({
      aggregateType: 'Shift',
      aggregateId: shift._id,
      eventType: 'ShiftStopped',
      eventTypeVersion: 1,
      user: authToken.preferred_username,
      data: { businessId: shift.businessId, driverUsername: shift.driver.username }
    });
  }

  /**
   * Format shift achieve graphql scehma compilance
   * @param {*} shift 
   */
  formatShitToGraphQLSchema(shift) {
    return (!shift) ? undefined : {
      _id: shift._id,
      state: shift.state,
      allowPayPerService: shift.allowPayPerService,
      payPerServicePrice: shift.payPerServicePrice,
      subscriptionType: shift.subscriptionType,
      driver: {
        fullname: shift.driver.fullname,
        username: shift.driver.username,
        blocks: shift.driver.blocks,
        wallet: !shift.driver.wallet ? null: {
          _id: shift.driver.wallet._id,
          pockets: shift.driver.wallet.pockets,
          businessId: shift.driver.wallet.businessId
        },
        driverCode: shift.driver.driverCode,
        referredCode: shift.driver.referredCode,
        active: true
      },
      vehicle: {
        plate: shift.vehicle.licensePlate,
        blocks: shift.vehicle.blocks,
        active: true
      },
    };
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
