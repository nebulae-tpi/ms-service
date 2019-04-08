"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Shift";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, reduce, tap, filter, first } = require("rxjs/operators");
const { of, Observable, defer, from, range } = require("rxjs");
const Crosscutting = require("../../../tools/Crosscutting");

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
   * Finds an open shift by driver
   */
  static findOpenShiftByDriver$(driverId, projection = undefined) {
    const today = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    const explorePastMonth = today.getDate() <= 1;
    const query = { "state": { "$ne": "CLOSED" }, "driver.id": driverId };
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(CollectionName)),
      mergeMap(collection => defer(() => collection.findOne(query, { projection }))),
      filter(s => s),
      first(shift => shift, undefined)
    );
  }

  /**
   * Updates the wallet info of the driver in the shift
   * @param {string} _id 
   * @param {*} wallet
   */
  static updateShiftWallet$(_id, wallet) {
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName).findOneAndUpdate(
        { _id },
        { $set: { 'driver.wallet': wallet } },
        { upsert: false }
      )
    );
  }


}
/**
 * @returns {ShiftDA}
 */
module.exports = ShiftDA;
