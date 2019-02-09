"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Shift";
const { CustomError } = require("../../../tools/customError");
const { of, Observable, defer, forkJoin, from, range } = require("rxjs");
const { map, mergeMap, first, filter } = require("rxjs/operators");

class ShiftDA {

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
   * Finds all open shift// DELETE, JUST FOR TESTING
   */
  static findOpenShifts$(projection = undefined) {
    const explorePastMonth = Date.today().getDate() <= 2;
    const query = { "state": "AVAILABLE" };
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection('Shift')),
      mergeMap(collection => defer(() => mongoDB.extractAllFromMongoCursor$(collection.find(query, { projection })))),
    );
  }


  // /**
  //  * Finds all open shift// DELETE, JUST FOR TESTING
  //  */
  // static findNearOpenShifts$(location,projection = undefined) {
  //   const explorePastMonth = Date.today().getDate() <= 2;
  //   const query = { "state": "AVAILABLE" };
  //   return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
  //     map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
  //     map(db => db.collection('Shift')),
  //     mergeMap(collection => defer(() => mongoDB.extractAllFromMongoCursor$(collection.find(query, { projection })))),
  //   );
  // }


}
/**
 * @returns {ShiftDA}
 */
module.exports = ShiftDA;
