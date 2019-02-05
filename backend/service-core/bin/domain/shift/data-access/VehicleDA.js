"use strict";

let mongoDB = undefined;
const CollectionName = "Vehicle";
const { CustomError } = require("../../../tools/customError");
const { map } = require("rxjs/operators");
const { of, Observable, defer } = require("rxjs");

class VehicleDA {
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
   * Gets Vehicle by its license plate
   */
  static findByLicensePlate$(licensePlate, projection = undefined) {
    const collection = mongoDB.db.collection(CollectionName);
    const query = { licensePlate };
    return defer(() => collection.findOne(query, {projection}));
  }



}
/**
 * @returns {VehicleDA}
 */
module.exports = VehicleDA;
