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
   * Finds an open Service by shift id
   */
  static findOpeneServiceByShift$(shiftId) {
    const today = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    const explorePastMonth = today.getDate() <= 1;
    const query = { "state": { "$ne": "CLOSED" }, "shiftId": shiftId };
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(CollectionName)),
      mergeMap(collection => defer(() => collection.findOne(query))),
      filter(s => s),
      first(service => service, undefined)
    );
  }


  /**
   * appends location
   * @returns {Observable}
   */
  static appendLocation$(_id, location) {
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).updateOne(
        { _id },
        {
          $set: { location, lastModificationTimestamp: Date.now() },
          $push: { "route.coordinates": location.coordinates }
        },
        { upsert: false }
      )
    );
  }


}
/**
 * @returns {ShiftDA}
 */
module.exports = ServiceDA;
