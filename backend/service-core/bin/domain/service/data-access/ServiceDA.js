"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Service";
const { ERROR_23104 } = require("../../../tools/customError");
const { map, mergeMap, first, filter, catchError } = require("rxjs/operators");
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
            "stateChanges": {
              state,
              timestamp,
              location,
            }
          }
        },
        { upsert: false }
      )
    );
  }

  /**
   * set cancel state
   * @returns {Observable}
   */
  static setCancelState$(_id, state, location, reason, notes) {
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).updateOne(
        { _id },
        {
          $set: { state, lastModificationTimestamp: Date.now() },
          $push: {
            "stateChanges": {
              state,
              timestamp: Date.now(),
              location,
              reason,
              notes
            }
          }
        },
        { upsert: false }
      )
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
    }

    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOneAndUpdate(
        find,
        update,
        {
          projection,
          upsert: false,
          returnOriginal: false
        }
      )).pipe(
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




}
/**
 * @returns {ServiceDA}
 */
module.exports = ServiceDA;
