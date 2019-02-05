"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Shift";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, first, filter } = require("rxjs/operators");
const { of, Observable, defer, forkJoin, from, range } = require("rxjs");

class ShiftDA {
  static start$(mongoDbInstance) {
    return Observable.create(observer => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next("using given mongo instance");
      } else {
        mongoDB = require("../../../data/MongoDB").singleton();
        observer.next("using singleton system-wide mongo instance");
      }
      observer.complete();
    });
  }




  /**
   * Finds an open shift by driver
   */
  static findOpenShiftByDriver$(driverId, projection = undefined) {
    const explorePastMonth = Date.today().getDate() <= 2;
    const query = { "state": { "$ne": "CLOSED" }, "driver.id": driverId };
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(CollectionName)),
      mergeMap(collection => defer(() => collection.findOne(query, { projection }))),
      first(shift => shift, undefined)
    );
  }

  /**
   * Finds an open shift by vehiclePlate
   */
  static findOpenShiftByVehiclePlate$(vehiclePlate) {
    const explorePastMonth = Date.today().getDate() <= 2;
    const query = { "state": { "$ne": "CLOSED" }, "vehicle.licensePlate": vehiclePlate };
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(CollectionName)),
      mergeMap(collection => defer(() => collection.findOne(query))),
      first(shift => shift, undefined)
    );
  }

  /**
   * Finds an open shift by vehicle Id
   */
  static findOpenShiftByVehicleId$(vehicleId, projection = undefined) {
    const explorePastMonth = Date.today().getDate() <= 2;
    const query = { "state": { "$ne": "CLOSED" }, "vehicle.id": vehicleId };
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(CollectionName)),
      mergeMap(collection => defer(() => collection.findOne(query, { projection }))),
      first(shift => shift, undefined)
    );
  }

  /**
   * Inserts a new shift at the Materialized view
   * @param {*} shift 
   */
  static insertShift$(shift) {
    return defer(() => mongoDB.getHistoricalDb().collection(CollectionName).insertOne(shift));
  }

  /**
   * Updates the shift state and returns the original document with only the online flag
   * @param {string} _id 
   * @param {string} state 
   */
  static updateShiftStateAndGetOnlineFlag$(_id, state) {
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOneAndUpdate(
        { _id },
        { $set: { state, lastReceivedComm: Date.now() }, $push: { stateChanges: { state, timestamp: Date.now() } } },
        {
          projection: { online: 1 },
          upsert: false,
          returnOriginal: true
        }
      )
    ).pipe(map(result => result && result.value ? result.value : undefined));
  }

  /**
   * Updates the shift online state
   * @param {string} _id 
   * @param {string} online 
   */
  static updateShiftOnlineFlag$(_id, online) {
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).updateOne(
        { _id },
        { $set: { online }, $push: { onlineChanges: { online, timestamp: Date.now() } } },
        { upsert: false }
      )
    );
  }

  /**
   * Updates the shift current location
   * @param {string} _id 
   * @param {*} location 
   */
  static updateShiftLocation$(_id, location) {
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).updateOne(
        { _id },
        { $set: { location } },
        { upsert: false }
      )
    );
  }

  /**
   * Updates the shift state
   * @param {string} _id 
   * @param {string} online 
   */
  static updateShiftState$(_id, state) {
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).updateOne(
        { _id },
        { $set: { state }, $push: { stateChanges: { state, timestamp: Date.now() } } },
        { upsert: false }
      )
    );
  }


  /**
   * Adds or Removes a block key from Shift.vehicle.blocks.  returns the shifts blocks and current state
   * @param {string} _id shift ID
   * @param {boolean} blockAdded true=adding, false=removing
   * @param {string} blockKey block key to remove/add
   */
  static updateOpenShiftVehicleBlock$(_id, blockAdded, blockKey) {
    const update = blockAdded ? { $push: { "vehicle.blocks": blockKey } } : { $pull: { "vehicle.blocks": blockKey } };
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOneAndUpdate(
        { _id },
        { update },
        {
          projection: { "vehicle.blocks": 1, "driver.blocks": 1, "state": 1, "driver.username":1, "businessId":1 },
          upsert: false,
          returnOriginal: false
        }
      )).pipe(map(result => result && result.value ? result.value : undefined));
  }

  /**
   * Adds or Removes a block key from Shift.driver.blocks.  returns the shifts blocks and current state
   * @param {string} _id shift ID
   * @param {boolean} blockAdded true=adding, false=removing
   * @param {string} blockKey block key to remove/add
   */
  static updateOpenShiftDriverBlock$(_id, blockAdded, blockKey) {
    const update = blockAdded ? { $push: { "driver.blocks": blockKey } } : { $pull: { "driver.blocks": blockKey } };
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOneAndUpdate(
        { _id },
        { update },
        {
          projection: { "vehicle.blocks": 1, "driver.blocks": 1, "state": 1, "driver.username":1, "businessId":1 },
          upsert: false,
          returnOriginal: false
        }
      )).pipe(map(result => result && result.value ? result.value : undefined));
  }

}
/**
 * @returns {ShiftDA}
 */
module.exports = ShiftDA;
