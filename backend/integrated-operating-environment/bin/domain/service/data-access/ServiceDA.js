"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Service";
const { ERROR_23104 } = require("../../../tools/customError");
const { map, mergeMap, first, filter, catchError, tap, take } = require("rxjs/operators");
const { of, Observable, defer, throwError, range } = require("rxjs");

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
   * Gets service by its _id.
   * @returns {Observable}
   */
  static findById$(_id, projection = undefined) {
    const query = { _id };
    return defer(() =>
      mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOne(query, { projection })
    );
  }

  /**
   * Finds services by filters
   */
  static findByFilters$(businessId, states, channels, operatorId, page, count, projection = undefined) {
    const query = { "businessId": businessId, "closed": false };
    if (states && states.length > 0) {
      query.state = { "$in": states };
    }
    if (channels && channels.length > 0) {
      query["request.sourceChannel"] = { "$in": channels };
    }
    if (operatorId) {
      query["request.ownerOperatorId"] = operatorId;
    }
    console.log({ businessId, states, channels, operatorId, page, count, projection });
    console.log(JSON.stringify(query, null, 1));

    const explorePastMonth = false; // TODO: solucionar// Date.today().getDate() <= 1;
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(CollectionName)),
      mergeMap(collection =>
        defer(() =>
          mongoDB.extractAllFromMongoCursor$(
            collection.find(query).sort({ timestamp: -1 }).skip(page * count).limit(count)
          )
        )
      ),
      take(count)
    );
  }



}
/**
 * @returns {ServiceDA}
 */
module.exports = ServiceDA;