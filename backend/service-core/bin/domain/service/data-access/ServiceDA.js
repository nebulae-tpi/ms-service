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
   * Gets service by its _id.
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
    return defer(() => mongoDB.getHistoricalDbByYYMM(service._id.split('-').pop()).collection(CollectionName)
      .insertOne(service));
  }


  /**
   * sets dropOffETA eta
   * @returns {Observable}
   */
   static insertService$(service) {
    const _id = service._id;
    delete service._id;
    return defer(() => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName)
      .updateOne(
        { _id},
        {
          $setOnInsert: { ...service}
        },
        { upsert: true }
      )
    );
  }

  // /**
  //  * appends location
  //  * @returns {Observable}
  //  */
  // static appendLocation$(_id, location) {
  //   return defer(
  //     () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).updateOne(
  //       { _id },
  //       {
  //         $set: { location, lastModificationTimestamp: Date.now() },
  //         $push: (!location || !location.coordinates) ? undefined : { "route.coordinates": location.coordinates }
  //       },
  //       { upsert: false }
  //     )
  //   );
  // }

  /**
 * appends location
 * @returns {Observable}
 */
  static appendLocation$(_id, location) {
    const query = { "_id": _id, "state": { "$in": ["ASSIGNED", "ARRIVED", "ON_BOARD"] } };
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).updateOne(
        query,
        {
          $set: { location, lastModificationTimestamp: Date.now() },
          $push: (!location || !location.coordinates) ? undefined : { "route.coordinates": location.coordinates }
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
          $set: { pickUpETA, lastModificationTimestamp: Date.now() }
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
    const update = {
      $set: { state, lastModificationTimestamp: Date.now(), lastStateChangeTimestamp: Date.now() },
      $push: {
        "stateChanges": { state, timestamp, location, },
      }
    };
    if (location && location.coordinates) {
      update['$push']["route.coordinates"] = location.coordinates;
    }
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).updateOne(
        { _id },
        update,
        { upsert: false }
      )
    );
  }

  /**
   * appends state
   * @returns {Observable}
   */
  static appendstateAndReturnService$(_id, state, location, timestamp, projection = undefined) {
    const update = {
      $set: { state, lastModificationTimestamp: Date.now(), lastStateChangeTimestamp: Date.now() },
      $push: {
        "stateChanges": { state, timestamp, location },
      }
    };
    if (location && location.coordinates) {
      update['$push']["route.coordinates"] = location.coordinates;
    }
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOneAndUpdate(
        { _id },
        update,
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
  static setCancelStateAndReturnService$(_id, state, location, reason, notes, timestamp, projection = undefined) {
    const update = {
      $set: { state, lastModificationTimestamp: timestamp, lastStateChangeTimestamp: Date.now() },
      $push: {
        "stateChanges": { state, timestamp, location, reason, notes },
      }
    };
    if (location && location.coordinates) {
      update['$push']["route.coordinates"] = location.coordinates;
    }
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOneAndUpdate(
        { _id },
        update,
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
    find[`offer.shifts.${shiftId}.active`] = true;

    const update = {
      $set: {
        shiftId,
        driver,
        vehicle,
        state: 'ASSIGNED',
        lastModificationTimestamp: Date.now(),
        location: { ...location, timestamp: Date.now() },
        lastStateChangeTimestamp: Date.now()
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
        lastStateChangeTimestamp: Date.now()
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
    const today = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    const explorePastMonth = today.getDate() <= 1;
    const query = { "state": { "$in": ["ASSIGNED", "ARRIVED", "ON_BOARD"] }, "driver.id": driverId };
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(CollectionName)),
      mergeMap(collection => defer(() => collection.findOne(query, { projection }))),
      filter(s => s),
      first(service => service, undefined)
    );
  }

  /**
   * Finds the open services requested by the client
   */
  static findCurrentServicesRequestedByClient$(clientId, projection = undefined) {
    const today = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    const explorePastMonth = today.getDate() <= 1;
    const query = { "state": { "$in": ["REQUESTED", "ASSIGNED", "ARRIVED", "ON_BOARD"] }, "client.id": clientId };
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(CollectionName)),
      mergeMap(collection => defer(() => mongoDB.extractAllFromMongoCursor$(collection.find(query, { projection }))))
    );
  }


  /**
   * Finds an historical service by driver
   */
  static findHistoricalServiceByDriver$(driverId, year, month, page, count, projection = undefined) {
    const yymm = `${year.toString().substring(2)}${month > 9 ? month.toString() : '0' + month.toString()}`;
    const query = { "state": { "$nin": ["REQUESTED", "ASSIGNED", "ARRIVED", "ON_BOARD"] }, "driver.id": driverId };
    const bd = mongoDB.getHistoricalDbByYYMM(yymm); // for now we are quering onlyu current month
    return defer(() =>
      mongoDB.extractAllFromMongoCursor$(
        bd.collection(CollectionName).find(query, process).sort({ timestamp: -1 }).skip(page * count).limit(count)
      )
    );
  }

  /**
 * Finds an historical service by client
 */
  static findHistoricalServiceByClient$(clientId, year, month, page, count, projection = undefined) {
    const yymm = `${year.toString().substring(2)}${month > 9 ? month.toString() : '0' + month.toString()}`;
    const query = { "state": { "$nin": ["REQUESTED", "ASSIGNED", "ARRIVED", "ON_BOARD"] }, "client.id": clientId };
    const bd = mongoDB.getHistoricalDbByYYMM(yymm); // for now we are quering onlyu current month
    return defer(() =>
      mongoDB.extractAllFromMongoCursor$(
        bd.collection(CollectionName).find(query, process).sort({ timestamp: -1 }).skip(page * count).limit(count)
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
        $set: { closed: true, lastModificationTimestamp: Date.now() },
        $unset: { location: "" }
      }
    ));
  }






}
/**
 * @returns {ServiceDA}
 */
module.exports = ServiceDA;
