"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Shift";
const { ERROR_23104 } = require("../../../tools/customError");
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, first, filter, catchError } = require("rxjs/operators");
const { of, Observable, defer, throwError, forkJoin, from, range } = require("rxjs");

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
   * Gets Shift by its _id
   * @returns {Observable}
   */
  static findOpenShiftById$(_id, shiftOnAcceptServiceProcess, projection = undefined) {
    const query = { _id, state: 'AVAILABLE' };
    const update = {shiftOnAcceptServiceProcess}
    return defer(() => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName)
        .findOne(query, { projection }));
  }

  static findOpenShiftAndUpdateById$(_id, shiftOnAcceptServiceProcess, projection = undefined) {
    const query = { _id, state: 'AVAILABLE' };
    const update = {$set: {shiftOnAcceptServiceProcess}}
    return defer(() => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName)
      .findOneAndUpdate(query,
        update, { 
        projection,
        upsert: false,
        returnOriginal: true,
       })).pipe(
        map(result => result.value),
        filter(v => v),
        first(),
        catchError(err => throwError(ERROR_23104)), // possible concurrent modification
      );
  }


  static removeShifShiftOnAcceptServiceProcesstById$(_id) {
    const query = { _id};
    const update = {$set: {shiftOnAcceptServiceProcess: 0}}
    return defer(() => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName)
      .update(query, update, { writeConcern: { w: 1 } }));
  }

  /**
   * Gets Shift by its _id
   * @returns {Observable}
   */
  static findById$(_id, projection = undefined) {
    const query = { _id };
    return defer(() => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(CollectionName)
      .findOne(query, { projection }));
  }


}
/**
 * @returns {ShiftDA}
 */
module.exports = ShiftDA;
