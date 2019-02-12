"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Service";
const { ERROR_23104 } = require("../../../tools/customError");
const { map, mergeMap, first, filter, catchError, tap } = require("rxjs/operators");
const { of, Observable, defer, throwError, range } = require("rxjs");

class ServiceDA {


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
   * Gets Driver by its _id.
   * @returns {Observable}
   */
  static findById$(_id, projection = undefined) {
    const query = { _id };
    return defer(() => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName)
      .findOne(query, { projection }));
  }

  /**
   * Inserts a new service
   * @param {*} service 
   * @returns {Observable}
   */
  static insertService$(service) {
    console.log('service._id  => ', service._id);
    return defer(() => mongoDB.getHistoricalDbByYYMM(service._id.split('-').pop()).collection(CollectionName)
      .insertOne(service));
  }


  /**
   * sets dropOffETA eta
   * @returns {Observable}
   */
  static setDropOffETA$(_id, dropOffETA) {
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).updateOne(
        { _id },
        {
          $set: { dropOffETA, lastModificationTimestamp: Date.now() }
        },
        { upsert: false }
      )
    );
  }

  /**
   * appends location
   * @returns {Observable}
   */
  static appendLocation$(_id, location) {
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).updateOne(
        { _id },
        {
          $set: { location, lastModificationTimestamp: Date.now() },
          $push: { "route.coordinates": location.coordinates }
        },
        { upsert: false }
      )
    );
  }


  /**
   * sets pick up ETA
   * @returns {Observable}
   */
  static setPickUpETA$(_id, pickUpETA) {
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).updateOne(
        { _id },
        {
          $set: { pickUpETA }
        },
        { upsert: false }
      )
    );
  }





  /**
   * appends state
   * @returns {Observable}
   */
  static appendstate$(_id, state, location, timestamp) {
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).updateOne(
        { _id },
        {
          $set: { state, lastModificationTimestamp: Date.now() },
          $push: {
            "stateChanges": { state, timestamp, location, },
            "route.coordinates": location.coordinates
          }
        },
        { upsert: false }
      )
    );
  }

  /**
   * appends state
   * @returns {Observable}
   */
  static appendstateAndReturnService$(_id, state, location, timestamp, projection = undefined) {
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOneAndUpdate(
        { _id },
        {
          $set: { state, lastModificationTimestamp: Date.now() },
          $push: {
            "stateChanges": { state, timestamp, location },
            "route.coordinates": location.coordinates
          }
        },
        { upsert: false, projection }
      )
    ).pipe(
      map(result => result.value),
      filter(v => v)
    );
  }

  /**
   * set cancel state
   * @returns {Observable}
   */
  static setCancelStateAndReturnService$(_id, state, location, reason, notes, timestamp) {
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOneAndUpdate(
        { _id },
        {
          $set: { state, lastModificationTimestamp: timestamp },
          $push: {
            "stateChanges": { state, timestamp, location, reason, notes },
            "route.coordinates": location.coordinates
          }
        },
        { upsert: false, projection }
      )
    ).pipe(
      map(result => result.value),
      filter(v => v)
    );
  }




  /**
   * Tries to reserve a service
   * @param {*} _id service id
   * @param {*} shiftId shiftId
   * @param {*} driver driver info
   * @param {*} vehicle vehicle info
   */
  static assignService$(_id, shiftId, driver, vehicle, location, projection = undefined) {
    const find = {
      _id,
      state: 'REQUESTED',
    };
    // The shift is within the sent and actives offers
    find[`offers.${shiftId}.active`] = true;

    const update = {
      $set: {
        shiftId,
        driver,
        vehicle,
        state: 'ASSIGNED',
        lastModificationTimestamp: Date.now(),
        location: { ...location, timestamp: Date.now() }
      },
      $push: {
        "stateChanges": {
          state: 'ASSIGNED',
          timestamp: Date.now(),
          location,
        },
        "route.coordinates": location.coordinates
      }
    };

    console.log(JSON.stringify(find));
    console.log(JSON.stringify(update));

    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOneAndUpdate(
        find,
        update,
        {
          projection,
          upsert: false,
          returnOriginal: false,
        }
      )).pipe(
        map(result => result.value),
        filter(v => v),
        first(),
        catchError(err => throwError(ERROR_23104)), // possible concurrent modification
      );
  }

  /**
   * Tries to reserve a service
   * @param {*} _id service id
   * @param {*} shiftId shiftId
   * @param {*} driver driver info
   * @param {*} vehicle vehicle info
   */
  static assignServiceNoRules$(_id, shiftId, driver, vehicle) {
    const find = {
      _id,
    };

    const update = {
      $set: {
        shiftId,
        driver,
        vehicle,
        state: 'ASSIGNED',
        lastModificationTimestamp: Date.now(),
      },
      $push: {
        "stateChanges": {
          state: 'ASSIGNED',
          timestamp: Date.now(),
        }
      }
    }

    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).updateOne(
        find,
        update,
        {
          upsert: false,
        }
      ));
  }


  /**
   * Finds an open service by driver
   */
  static findOpenAssignedServiceByDriver$(driverId, projection = undefined) {
    const explorePastMonth = Date.today().getDate() <= 2;
    const query = { "state": { "$in": ["ASSIGNED", "ARRIVED", "ON_BOARD"] }, "driver.id": driverId };
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(CollectionName)),
      mergeMap(collection => defer(() => collection.findOne(query, { projection }))),
      first(service => service, undefined)
    );
  }


  /**
   * Finds an historical service by driver
   */
  static findHistoricalServiceByDriver$(driverId, limit, projection = undefined) {
    const query = { "state": { "$nin": ["REQUESTED", "ASSIGNED", "ARRIVED", "ON_BOARD"] }, "driver.id": driverId };
    const bd = mongoDB.getHistoricalDb(); // for now we are quering onlyu current month
    return defer(() =>
      mongoDB.extractAllFromMongoCursor$(
        bd.collection(CollectionName).find(query, process).sort({ timestamp: -1 }).limit(limit)
      )
    );
  }


  /**
   * set the service to closed and removes the current location to save index space
   * @param {*} _id 
   */
  static closeService$(_id) {
    const collection = mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName);
    return defer(() => collection.updateOne(
      { _id },
      {
        $set: { closed: true },
        $unset: { location: 1 }
      }
    ));
  }






}
/**
 * @returns {ServiceDA}
 */
module.exports = ServiceDA;
