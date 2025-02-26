"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Business";
const { of, Observable, defer, forkJoin, from, range } = require("rxjs");
const { map, mergeMap, tap, filter, toArray } = require("rxjs/operators");

class BusinessDA {

  static start$(mongoDbInstance) {
      return Observable.create(observer => {
        console.log("llama create observer == ", mongoDbInstance);
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

  static getById$(businessId, projection = {}) {
    const collection = mongoDB.db.collection(CollectionName);
    const query = {
      "_id": businessId
    };
    return defer(() => collection.findOne(query, projection));
  }

}
/**
 * @returns {BusinessDA}
 */
module.exports = BusinessDA;
