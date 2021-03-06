"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Shift";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, first, filter, take } = require("rxjs/operators");
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
   * Gets shift by its _id.
   * @returns {Observable}
   */
  static findById$(_id, projection = undefined) {
    const query = { _id };
    return defer(() =>
      mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOne(query, { projection })
    );
  }

  /**
   * Finds shift by filters
   */
  static findByFilters$(businessId, states, page, count, monthsToAdd = 0, projection = undefined) {
    const query = { "businessId": businessId };
    if (states && states.length > 0) {
      query.state = { "$in": states };
    }

    return of(mongoDB.getHistoricalDb(undefined, monthsToAdd)).pipe(
      map(db => db.collection(CollectionName)),
      mergeMap(collection =>
        defer(() =>
          mongoDB.extractAllFromMongoCursor$(
            collection.find(query).sort({ timestamp: -1 }).skip(page * count).limit(count)
          )
        )
      )
    );

  }

}
/**
 * @returns {ShiftDA}
 */
module.exports = ShiftDA;
