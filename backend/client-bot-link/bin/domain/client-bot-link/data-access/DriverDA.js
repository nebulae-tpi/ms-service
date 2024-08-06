"use strict";

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const CollectionName = "Driver";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, reduce } = require("rxjs/operators");
const { of, Observable, defer, from } = require("rxjs");
const Crosscutting = require("../../../tools/Crosscutting");

class DriverDA {
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

  static getDriverByReferredCode$(driverCode, businessId, projection) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
      "driverCode": driverCode,
      businessId
    };

    return defer(() => collection.findOne(query, projection));
  }

}
/**
 * @returns {DriverDA}
 */
module.exports = DriverDA;
