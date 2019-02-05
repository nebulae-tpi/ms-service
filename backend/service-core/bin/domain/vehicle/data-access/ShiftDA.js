"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Shift";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, first, filter } = require("rxjs/operators");
const { of, Observable, defer, forkJoin, from, range } = require("rxjs");

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
   * Finds an open shift by vehicle Id
   */
  static findOpenShiftByVehicleId$(vehicleId, projection = undefined) {
    const explorePastMonth = Date.today().getDate() <= 2;
    const query = { "state": { "$ne": "CLOSED" }, "vehicle.id": vehicleId };
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(CollectionName)),
      mergeMap(collection => defer(() => collection.findOne(query, {projection}))),
      first(shift => shift, undefined)
    );
  }


}
/**
 * @returns {ShiftDA}
 */
module.exports = ShiftDA;
