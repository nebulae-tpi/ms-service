"use strict";

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const COLLECTION_NAME = "Driver";
const { CustomError } = require("../tools/customError");
const { map } = require("rxjs/operators");
const { of, Observable, defer } = require("rxjs");

class DriverDA {
  static start$(mongoDbInstance) {
    return Observable.create(observer => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next("using given mongo instance");
      } else {
        mongoDB = require("./MongoDB").singleton();
        observer.next("using singleton system-wide mongo instance");
      }
      observer.complete();
    });
  }

  /**
   * Gets a driver by its id and business(Optional).
   */
  static getDriver$(id) {
    const collection = mongoDB.db.collection(COLLECTION_NAME);

    const query = {
      _id: id      
    };

    return defer(() => collection.findOne(query));
  }

}
/**
 * @returns {DriverDA}
 */
module.exports = DriverDA;
