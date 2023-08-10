"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Service";
const { CustomError } = require("../../../tools/customError");
const { of, Observable, defer, forkJoin, from, range } = require("rxjs");
const { map, mergeMap, first, filter } = require("rxjs/operators");

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
   * Finds a Service by its ID
   * @param {*} _id 
   * @param {*} projection 
   */
  static findById$(_id, projection = undefined) {
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOne(
        { _id },
        projection
      )
    ).pipe(filter(val => val));
  }

  static updateTaximeterFare$(_id, taximeterFare) {
    const update = { $set: {taximeterFare} };
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOneAndUpdate(
        { _id },
        update,
        {
          upsert: false,
          returnOriginal: false
        }
      )
    ).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }
  static addShiftToActiveOffers$(_id, shiftId, distance, referred = false, driverId = "", driverUsername = "", licensePlate = "") {
    const update = { $set: {} };
    update["$set"][`offer.shifts.${shiftId}`] = { active: true, offerTs: Date.now(), distance, referred, driverId, driverUsername, licensePlate };
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).updateOne(
        { _id },
        update,
        { upsert: false }
      )
    );
  }

  static updateOfferParamsAndfindById$(_id, fieldsToSet = undefined, fieldsToIncrement = undefined, projection = undefined) {
    const update = {};
    if (fieldsToSet) {
      update['$set'] = fieldsToSet;
    }
    if (fieldsToIncrement) {
      update['$inc'] = fieldsToIncrement;
    }
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOneAndUpdate(
        { _id },
        update,
        {
          projection,
          upsert: false,
          returnOriginal: false
        }
      )
    ).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

  static findCancelledServicesById$(driverId, timestamp) {
    const initDate = new Date(new Date(timestamp).toLocaleString("en-US", { timeZone: "America/Bogota" }));
    const endDate = new Date(new Date(timestamp).toLocaleString("en-US", { timeZone: "America/Bogota" }));
    initDate.setHours(0);
    initDate.setMinutes(0);
    endDate.setHours(23);
    endDate.setMinutes(59);
    console.log("INIT TS ===> ", initDate.getTime());
    console.log("END TS ===> ", endDate.getTime());
    const collection =  mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName);

    const query = {state:"CANCELLED_DRIVER", "driver.id": driverId, lastModificationTimestamp: {$gte: initDate.getTime(), $lte: endDate}};
    // console.log('QUERY DRIVER', query);
    return collection.count(query);;
  }


}
/**
 * @returns {ServiceDA}
 */
module.exports = ServiceDA;
