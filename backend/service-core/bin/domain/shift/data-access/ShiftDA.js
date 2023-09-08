"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Shift";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, first, filter, tap } = require("rxjs/operators");
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

  static findNearbyVehicles$(location, vehicleRequestedFilters, maxDistance) {
    const today = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    const explorePastMonth = today.getDate() <= 1;
    const query = {
      state: "AVAILABLE",
      online: true,
    };

    if (vehicleRequestedFilters && vehicleRequestedFilters.length > 0) {
      query['vehicle.features'] = { $all: vehicleRequestedFilters };
    }

    const aggregateQuery = [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [location.lng, location.lat] },
          distanceField: "dist.calculated",
          maxDistance: maxDistance,
          minDistance: 0,
          query,
          includeLocs: "dist.location",
          //num: 20,
          spherical: true
        }
      },
      { $limit: 20 },
      {
        $project: { location: 1, vehicle: 1 }
      }
    ];

    //console.log('Query => ', JSON.stringify(aggregateQuery));

    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection('Shift')),
      mergeMap(collection =>
        defer(() =>

          collection.aggregate(
            aggregateQuery
          ).toArray()
          //)
        )
      ),
      //tap( x => console.log('QUERY RESULT: ',JSON.stringify(x)))
    );
  }


  /**
   * Finds an open shift by driver
   */
  static findOpenShiftByDriverAndIdentifier$(driverId, deviceIdentifier, projection = undefined) {
    const today = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    const explorePastMonth = today.getDate() <= 1;
    const query = { "state": { "$ne": "CLOSED" }, "driver.id": driverId, "driver.deviceIdentifier": deviceIdentifier };
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(CollectionName)),
      mergeMap(collection => defer(() => collection.findOne(query, { projection }))),
      filter(s => s),
      first(shift => shift, undefined)
    );
  }


  /**
   * Finds an open shift by driver
   */
  static findOpenShiftByDriver$(driverId, projection = undefined) {
    const today = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    const explorePastMonth = today.getDate() <= 1;
    const query = { "state": { "$ne": "CLOSED" }, "driver.id": driverId };
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(CollectionName)),
      mergeMap(collection => defer(() => collection.findOne(query, { projection }))),
      filter(s => s),
      first(shift => shift, undefined)
    );
  }

  /**
   * Finds an open shift by vehiclePlate
   */
  static findOpenShiftByVehiclePlate$(vehiclePlate) {
    const today = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    const explorePastMonth = today.getDate() <= 1;
    const query = { "state": { "$ne": "CLOSED" }, "vehicle.licensePlate": vehiclePlate };
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(CollectionName)),
      mergeMap(collection => defer(() => collection.findOne(query))),
      filter(s => s),
      first(shift => shift, undefined)
    );
  }

  /**
   * Finds an open shift by vehicle Id
   */
  static findOpenShiftByVehicleId$(vehicleId, projection = undefined) {
    const today = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    const explorePastMonth = today.getDate() <= 1;
    const query = { "state": { "$ne": "CLOSED" }, "vehicle.id": vehicleId };
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(CollectionName)),
      mergeMap(collection => defer(() => collection.findOne(query, { projection }))),
      filter(s => s),
      first(shift => shift, undefined)
    );
  }

  /**
   * Inserts a new shift at the Materialized view
   * @param {*} shift 
   */
  static insertShift$(shift) {
    return defer(() => mongoDB.getHistoricalDbByYYMM(shift._id.split('-').pop())
      .collection(CollectionName)
      .updateOne(
        { _id: shift._id },
        { $set: { ...shift } },
        { upsert: true, writeConcern: { w: 1 } }
      ));
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
        {
          $set: { state, lastReceivedComm: Date.now(), lastStateChangeTimestamp: Date.now() },
          $push: { stateChanges: { state, timestamp: Date.now() } }
        },
        {
          projection: { online: 1 },
          upsert: false,
          returnOriginal: true,
          writeConcern: { w: 1 }
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
        { upsert: false, writeConcern: { w: 1 } }
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
        { upsert: false, writeConcern: { w: 1 } }
      )
    );
  }


  /**
   * Updates the shift state and returns the original document with only the online flag
   * @param {string} _id 
   * @param {*} location 
   */
  static updateShiftLocationAndGetOnlineFlag$(_id, location) {
    const updateObj = { lastReceivedComm: Date.now(), location }
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOneAndUpdate(
        { _id },
        { $set: {...updateObj} },
        {
          projection: { online: 1, state: 1, driver:1, vehicle: 1 },
          upsert: false,
          returnOriginal: true,
          writeConcern: { w: 1 }
        }
      )
    ).pipe(map(result => result && result.value ? result.value : undefined));
  }


  /**
   * Updates the shift state
   * @param {string} _id 
   * @param {string} online 
   */
  static updateShiftStateAndUnsetLocation$(_id, state) {
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).updateOne(
        { _id },
        {
          $set: { state, lastStateChangeTimestamp: Date.now() },
          $push: { stateChanges: { state, timestamp: Date.now() } },
          $unset: { location: "" }
        },
        { upsert: false, writeConcern: { w: 1 } }
      )
    );
  }


  /**
   * Adds or Removes a block key from Shift.vehicle.blocks.  returns the shifts blocks and current state
   * @param {string} _id shift ID
   * @param {boolean} blockAdded true=adding, false=removing
   * @param {string} blockKey block key to remove/add
   */
  static updateOpenShiftVehicleBlock$(_id, blockAdded, block) {
    const update = blockAdded ? { $push: { "vehicle.blocks": block } } : { $pull: { "vehicle.blocks": { key: block.key } } };
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOneAndUpdate(
        { _id },
        update,
        {
          projection: { "vehicle.blocks": 1, "driver.blocks": 1, "state": 1, "driver.username": 1, "businessId": 1 },
          upsert: false,
          returnOriginal: false,
          writeConcern: { w: 1 }
        }
      )).pipe(map(result => result && result.value ? result.value : undefined));
  }

  /**
   * Adds or Removes a block key from Shift.driver.blocks.  returns the shifts blocks and current state
   * @param {string} _id shift ID
   * @param {boolean} blockAdded true=adding, false=removing
   * @param {string} blockKey block key to remove/add
   */
  static updateOpenShiftDriverBlock$(_id, blockAdded, block) {
    const update = blockAdded ? { $push: { "driver.blocks": block } } : { $pull: { "driver.blocks": { key: block.key } } };
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOneAndUpdate(
        { _id },
        update,
        {
          projection: { "vehicle.blocks": 1, "driver.blocks": 1, "state": 1, "driver.username": 1, "businessId": 1 },
          upsert: false,
          returnOriginal: false,
          writeConcern: { w: 1 }
        }
      )).pipe(map(result => result && result.value ? result.value : undefined));
  }

}
/**
 * @returns {ShiftDA}
 */
module.exports = ShiftDA;
