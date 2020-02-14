"use strict";

require('datejs');

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const COLLECTION_NAME = "Business";
const { map, mergeMap, reduce, tap } = require("rxjs/operators");
const { Observable, defer} = require("rxjs");

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

  static updateBusinessGeneralInfo$(id, data){
    const collection = mongoDB.db.collection(COLLECTION_NAME);

    return defer(() => collection.findOneAndUpdate(
      { _id: id },
      { $set: { generalInfo: { ...data } } },
      { upsert: true }
    ))
  }

}
/**
 * @returns {BusinessDA}
 */
module.exports = BusinessDA;
