"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Driver";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, first, filter } = require("rxjs/operators");
const { of, Observable, defer, forkJoin, from, range } = require("rxjs");

class DriverDA {

  
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


}
/**
 * @returns {DriverDA}
 */
module.exports = DriverDA;
