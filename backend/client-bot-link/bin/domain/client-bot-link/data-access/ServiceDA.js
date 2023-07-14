"use strict";

require('datejs'); 

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const COLLECTION_NAME = "Service";
const DatabaseName = "historical_";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, reduce, tap, filter } = require("rxjs/operators");
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

  static getService$(id) {
    //Get the last four digits to decide in which database we have to look for the information
    const monthYear = id.substr(id.length - 4);
    const collection = mongoDB.client.db(`${DatabaseName}${monthYear}`).collection(COLLECTION_NAME);

    const query = {
      _id: id      
    };
    return defer(() => collection.findOne(query));
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


  static getServices$(filter) {
    const query = {};

    if (filter.clientId) {
      query["client.id"] = filter.clientId;
    }
    if (filter.states && filter.states.length > 0) {
      query["state"] = { $in: filter.states};
    }   
    if(filter.businessId) {
      query.businessId = filter.businessId;
    }
    
    const initDate = new Date(Date.now());
    console.log("QUERY COUNT ====> ", query);
    return of(initDate)
    .pipe(
      map(date => mongoDB.getHistoricalDb(date)),
      map(db => db.collection(COLLECTION_NAME)),
      mergeMap(collection => {
        const cursor = collection.find(query);
        return mongoDB.extractAllFromMongoCursor$(cursor);
      })
    );
  }

  static markedAsCancelledAndReturnService$(_id) {
    const query = {
      _id: _id      
    };
    
    const update = {
      $set: { cancelationTryTimestamp: Date.now() },
    };
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(COLLECTION_NAME).findOneAndUpdate(
        query,
        update,
        {
          returnOriginal: true
        }
      )
    ).pipe(
      map(result => result.value),
      filter(v => v)
    );
  }

  static markAsCancelled$(_id) {
    const collection =  mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(COLLECTION_NAME);

    return defer(() =>
      collection.updateOne(
        { _id: _id },
        {
          $set: { cancelationTryTimestamp: Date.now() },
        }
      )
    );
  }


  static setCancelStateAndReturnService$(_id, state,  timestamp, projection = undefined) {
    const update = {
      $set: { state, lastModificationTimestamp: timestamp, lastStateChangeTimestamp: timestamp },
      $push: {
        "stateChanges": { state, timestamp, location: null, reason: "OTHER", notes: "" },
      }
    };
    return defer(
      () => mongoDB.getHistoricalDbByYYMM(_id.split('-').pop()).collection(COLLECTION_NAME).findOneAndUpdate(
        { _id },
        update
      )
    ).pipe(
      map(result => result.value),
      filter(v => v)
    );
  }


}
/**
 * @returns {ServiceDA}
 */
module.exports = ServiceDA;
