"use strict";

require('datejs');
let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const COLLECTION_NAME = "Shift";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, reduce, tap } = require("rxjs/operators");
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
   * Get the Shift data
  * @param {string} id Shift ID
   */
  static getShiftById$(id) {
    const collection = mongoDB.getHistoricalDbByYYMM(id.substring(id.length - 4)).collection(COLLECTION_NAME);
    return defer(() => collection.findOne(
      { _id: id },
      { projection: { stateChanges: 0, onlineChanges: 0 } }
    ));
  }  
  
  static getShiftList$(filter, pagination) {
    const projection = { stateChanges: 0, onlineChanges: 0 };
    const query = {};

    if (filter.businessId) { query["businessId"] = filter.businessId; }
    if (filter.driverDocumentId) { query["driver.documentId"] = filter.driverDocumentId; }
    if (filter.driverFullname) { query["driver.fullname"] = { $regex: filter.driverFullname, $options: "i" }; }
    if (filter.vehicleLicensePlate) { query["vehicle.licensePlate"] = { $regex: filter.vehicleLicensePlate, $options: "i" }; }
    if (filter.states && filter.states.length > 0) { query["state"] = { $in: filter.states }; }
    if (filter.initTimestamp && filter.endTimestamp) {
      query.timestamp = { $gte: filter.initTimestamp, $lt: filter.endTimestamp };
    }
    if (filter.onlineState !== 'null') { query.online = filter.onlineState == 'true' }

    const initDate = new Date(filter.initTimestamp);
    const endDate = new Date(filter.endTimestamp);

    return of(initDate)
      .pipe(
        // tap(date => console.log("getShiftList$ date used ==> ", date)),
        map(date => mongoDB.getHistoricalDb(date)),
        // tap(db => console.log(`Searching in ==> ${db.databaseName}.${COLLECTION_NAME}`)),
        map(db => db.collection(COLLECTION_NAME)),
        mergeMap(collection => {
          const cursor = collection
            .find(query, { projection })
            .skip(pagination.count * pagination.page)
            .limit(pagination.count)
            .sort({ timestamp: pagination.sort });

          return mongoDB.extractAllFromMongoCursor$(cursor);
        })
      );
  }


  static getShiftListSize$(filter) {
    const query = {};


    if (filter.businessId) { query["businessId"] = filter.businessId; }
    if (filter.driverDocumentId) { query["driver.documentId"] = filter.driverDocumentId; }
    if (filter.driverFullname) { query["driver.fullname"] = { $regex: filter.driverFullname, $options: "i" }; }
    if (filter.vehicleLicensePlate) { query["vehicle.licensePlate"] = { $regex: filter.vehicleLicensePlate, $options: "i" }; }
    if (filter.states && filter.states.length > 0) { query["state"] = { $in: filter.states }; }
    if (filter.initTimestamp && filter.endTimestamp) { 
      query.timestamp = { $gte: filter.initTimestamp, $lt: filter.endTimestamp };
    }
    if ( filter.onlineState !== 'null'){ query.online = filter.onlineState == 'true' }

    const initDate = new Date(filter.initTimestamp);
    const endDate = new Date(filter.endTimestamp);

    return of(initDate)
    .pipe(
      map(date => mongoDB.getHistoricalDb(date)),
      map(db => db.collection(COLLECTION_NAME)),
      mergeMap(collection => collection.count(query)),
    );
  }


  static getShiftStateChangeList$(shiftId, pagination) {
    const collection = mongoDB.getHistoricalDbByYYMM(shiftId.substring(shiftId.length - 4)).collection(COLLECTION_NAME);
    return defer(() => collection
      .find( { _id: shiftId } )
      .project({ _id: 1, stateChanges: { $slice: [pagination.count * pagination.page, pagination.count] } })
      .toArray()
    )
      .pipe(
        map(result => result ? result[0].stateChanges : []),
      )
  }

  static getShiftStateChangeListSize$(shiftId) {
    const collection = mongoDB.getHistoricalDbByYYMM(shiftId.substring(shiftId.length - 4)).collection(COLLECTION_NAME);

    return defer(() => collection.aggregate([
      { $match: { _id: shiftId } },
      {
        $project: {
          _id: 1,
          stateChangeListSize: { $cond: { if: { $isArray: "$stateChanges" }, then: { $size: "$stateChanges" }, else: -1 } }
        }
      }
    ])
      .toArray()
    )
      .pipe(
        map(result => result ? result[0].stateChangeListSize : 0)
      )
  }

  

  static getShiftOnlineChangeList$(shiftId, pagination) {
    const collection = mongoDB.getHistoricalDbByYYMM(shiftId.substring(shiftId.length - 4)).collection(COLLECTION_NAME);
    return defer(() => collection
      .find({ _id: shiftId })
      .project({ _id: 1, onlineChanges: { $slice: [pagination.count * pagination.page, pagination.count] } })
      .toArray()
    )
      .pipe(
        map(result => result ? result[0].onlineChanges : [])
      )
  }

  static getShiftOnlineChangeListSize$(shiftId) {
    const collection = mongoDB.getHistoricalDbByYYMM(shiftId.substring(shiftId.length - 4)).collection(COLLECTION_NAME);

    return defer(() => collection.aggregate([
      { $match: { _id: shiftId } },
      {
        $project: {
          _id: 1,
          onlineChangesListSize: { $cond: { if: { $isArray: "$onlineChanges" }, then: { $size: "$onlineChanges" }, else: -1 } }
        }
      }
    ])
      .toArray()
    )
      .pipe(
        map(result => result ? result[0].onlineChangesListSize : 0),
      )
  }


}
/**
 * @returns {ShiftDA}
 */
module.exports = ShiftDA;
