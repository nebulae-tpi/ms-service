"use strict";

require('datejs');
let mongoDB = undefined;
const COLLECTION_NAME = "Business";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap } = require("rxjs/operators");
const { Observable, defer } = require("rxjs");

class BusinessDA {
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

  static finOneBusiness$(id, projection = undefined ){
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    return defer(() => collection.findOne({ _id: id }, { projection }));
  }

}
/**
 * @returns {BusinessDA}
 */
module.exports = BusinessDA;
