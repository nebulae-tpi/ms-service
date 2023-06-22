"use strict";

require('datejs');

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const COLLECTION_NAME = "Business";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, reduce, tap } = require("rxjs/operators");
const { of, Observable, defer, from, range } = require("rxjs");
const Crosscutting = require("../../../tools/Crosscutting");
const SERVICE_CLOSED_THRESHOLD = parseInt(process.env.SERVICE_CLOSED_THRESHOLD) || 5*60*1000; // FIVE MINUTES
const SERVICE_COMPLETED_THRESHOLD = parseInt(process.env.SERVICE_COMPLETED_THRESHOLD) || 30*60*1000; // 30 MINUTES
const STATES_TO_CLOSE_SERVICE = ["DONE", "CANCELLED_DRIVER", "CANCELLED_CLIENT", "CANCELLED_OPERATOR", "CANCELLED_SYSTEM"];

class BusinessDA {
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


  static findActiveBusiness$() {
    const collection = mongoDB.db.collection(COLLECTION_NAME);

    const query = { active: true };

    const cursor = collection
      .find(query)

    return mongoDB.extractAllFromMongoCursor$(cursor);
  }


}
/**
 * @returns {BusinessDA}
 */
module.exports = BusinessDA;
