"use strict";

require('datejs'); 

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const COLLECTION_NAME = "Service";
const DatabaseName = "historical_";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, reduce, tap } = require("rxjs/operators");
const { of, Observable, defer, from, range } = require("rxjs");
const Crosscutting = require("../../../tools/Crosscutting");

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

  static getServiceSize$(filter) {
    const query = {};

    if (filter.clientId) {
      query["client.id"] = filter.clientId;
    }
    if (filter.states && filter.states.length > 0) {
      query["state"] = { $in: filter.states};
    }    
    
    const initDate = new Date(Date.now());
    console.log("QUERY COUNT ====> ", query);
    return of(initDate)
    .pipe(
      map(date => mongoDB.getHistoricalDb(date)),
      map(db => db.collection(COLLECTION_NAME)),
      mergeMap(collection => collection.count(query)),
    );
  }


}
/**
 * @returns {ServiceDA}
 */
module.exports = ServiceDA;
