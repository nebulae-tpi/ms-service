"use strict";

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
    const collection = mongoDB.getHistoricalDbByYYMM(id.length - 4).collection(COLLECTION_NAME);
    return defer(() => collection.findOne(
      { _id: id }
    ));
  }

    /**
   * Gets an user by its username
   */
  static getShift$(id, businessId) {
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    const query = {
      _id: id      
    };
    if(businessId){
      query.businessId = businessId;
    }

    return defer(() => collection.findOne(query));
  }
  
  
  static getShiftList$(filter, pagination) {
    console.log('::::::::::::: getShiftList ', filter, pagination);
    const projection = { stateChanges: 0, onlineChanges: 0 };
    const query = {};


    if (filter.businessId) { query["businessId"] = filter.businessId; }
    if (filter.driverDocumentId) { query["driver.documentId"] = filter.driverDocumentId; }
    if (filter.driverFullname) { query["driver.fullname"] = { $regex: filter.driverFullname, $options: "i" }; }
    if (filter.vehicleLicensePlate) { query["vehicle.licensePlate"] = { $regex: filter.vehicleLicensePlate, $options: "i" }; }
    if (filter.states) { query["state"] = { $in: filter.states }; }
    if (filter.initTimestamp && filter.endTimestamp) { }
    if (filter.showClosedShifts && filter.initTimestamp && filter.endTimestamp) {
      query.timestamp = { $gte: filter.initTimestamp, $lt: filter.endTimestamp };
    }

    return of(query.timestamp)
      .pipe(
        mergeMap(includeClosed => includeClosed
          ? of({})
            .pipe(
              mergeMap(() => {
                const date1 = new Date(new Date(filter.initTimestamp).toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
                const date2 = new Date(new Date(filter.endTimestamp).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) );
                const dateNow = new Date( new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }) );
                const monthsBeforedate1 = Crosscutting.monthDiff(date1, date2);
                const monthsBeforedate2 = Crosscutting.monthDiff(date2, dateNow);
                return of({
                  start: monthsBeforedate1,
                  count: (monthsBeforedate1 - monthsBeforedate2) * -1
                });

              })
            )
          : of(Date.today().getDate() <= 2)
            .pipe(
              mergeMap(searchInBeforeMonth => searchInBeforeMonth
                ? of({ start: -1, count: 2 })
                : of({ start: 0, count: 1 })
              )
            )
        ),
        mergeMap(({ start, count }) => range(start, count)),
        map(date => mongoDB.getHistoricalDb(date)),
        map(db => db.collection(COLLECTION_NAME)),
        mergeMap(collection => {
          const cursor = collection
            .find(query, { projection })
            .skip(pagination.count * pagination.page)
            .limit(pagination.count)
            .sort({ creationTimestamp: pagination.sort });

          return mongoDB.extractAllFromMongoCursor$(cursor);
        }));
  }


  static getShiftListSize$(filter) {
    console.log('::::::::::::: getShiftListSize ', filter);
    const query = {};


    if (filter.businessId) { query["businessId"] = filter.businessId; }
    if (filter.driverDocumentId) { query["driver.documentId"] = filter.driverDocumentId; }
    if (filter.driverFullname) { query["driver.fullname"] = { $regex: filter.driverFullname, $options: "i" }; }
    if (filter.vehicleLicensePlate) { query["vehicle.licensePlate"] = { $regex: filter.vehicleLicensePlate, $options: "i" }; }
    if (filter.states) { query["state"] = { $in: filter.states }; }
    if (filter.initTimestamp && filter.endTimestamp) { }
    if (filter.showClosedShifts && filter.initTimestamp && filter.endTimestamp) {
      query.timestamp = { $gte: filter.initTimestamp, $lt: filter.endTimestamp };
    }

    return of(query.timestamp)
      .pipe(
        mergeMap(includeClosed => includeClosed
          ? of({})
            .pipe(
              mergeMap(() => {
                const date1 = new Date(new Date(filter.initTimestamp).toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
                const date2 = new Date(new Date(filter.endTimestamp).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) );
                const dateNow = new Date( new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }) );
                const monthsBeforedate1 = Crosscutting.monthDiff(date1, date2);
                const monthsBeforedate2 = Crosscutting.monthDiff(date2, dateNow);
                return of({
                  start: monthsBeforedate1,
                  count: (monthsBeforedate1 - monthsBeforedate2) * -1
                });

              })
            )
          : of(Date.today().getDate() <= 2)
            .pipe(
              mergeMap(searchInBeforeMonth => searchInBeforeMonth
                ? of({ start: -1, count: 2 })
                : of({ start: 0, count: 1 })
              )
            )
        ),
        mergeMap(({ start, count }) => range(start, count)),
        map(date => mongoDB.getHistoricalDb(date)),
        map(db => db.collection(COLLECTION_NAME)),
        mergeMap(collection => collection.count(query) )

        );
  }


}
/**
 * @returns {ShiftDA}
 */
module.exports = ShiftDA;
