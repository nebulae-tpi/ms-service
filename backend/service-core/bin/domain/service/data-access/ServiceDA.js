"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Service";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, first, filter } = require("rxjs/operators");
const { of, Observable, defer, forkJoin, from, range } = require("rxjs");

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
   * Gets Driver by its _id
   */
  static findById$(_id, projection = undefined) {
    const collection = mongoDB.db.collection(CollectionName);
    const query = { _id };
    return defer(() => collection.findOne(query,{projection}));
  }




}
/**
 * @returns {ServiceDA}
 */
module.exports = ServiceDA;
