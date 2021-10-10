"use strict";

let mongoDB = undefined;
const COLLECTION_NAME = "Driver";
const { CustomError } = require("../../../tools/customError");
const { map } = require("rxjs/operators");
const { of, Observable, defer } = require("rxjs");

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

  static addDriverCode$(_id,driverCode) {
    const collection = mongoDB.db.collection(COLLECTION_NAME);

      return defer(() => collection.updateOne(
        { _id },
        {
          $set: { driverCode }
        } 
      ))
  }

  /**
   * Gets Driver by its _id
   */
  static findById$(_id, projection = undefined) {
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    const query = { _id };
    return defer(() => collection.findOne(query,{projection}));
  }

}
/**
 * @returns {DriverDA}
 */
module.exports = DriverDA;
