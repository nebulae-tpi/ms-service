"use strict";

let mongoDB = undefined;
const CollectionName = "Driver";
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

  /**
   * Gets Driver by its _id
   */
  static findById$(_id) {
    const collection = mongoDB.db.collection(CollectionName);
    const query = { _id };
    return defer(() => collection.findOne(query));
  }

  static associateDriverCode$(_id, code){
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection
      .updateOne(
        { _id },
        {
          $set: { referredCode: code }
        }
      )
    );
  }

}
/**
 * @returns {DriverDA}
 */
module.exports = DriverDA;
