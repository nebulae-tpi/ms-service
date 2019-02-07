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

  /**
   * Finds all open shift// DELETE, JUST FOR TESTING
   */
  static findOpenShifts$(projection = undefined) {
    const explorePastMonth = Date.today().getDate() <= 2;
    const query = { "state": { "$ne": "CLOSED" }};
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection('Shift')),
      mergeMap(collection => defer(() => collection.find(query, { projection }))),
    );
  }

}
/**
 * @returns {ServiceDA}
 */
module.exports = ServiceDA;
