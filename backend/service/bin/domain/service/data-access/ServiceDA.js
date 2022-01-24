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

  /**
   * Gets a service by its id and business
   * @param {string} id service Id
   * @param {string} [businessId] Business if of the service (Optional)
   */
  static getService$(id, businessId) {
    //Get the last four digits to decide in which database we have to look for the information
    const monthYear = id.substr(id.length - 4);
    const collection = mongoDB.client.db(`${DatabaseName}${monthYear}`).collection(COLLECTION_NAME);

    const query = {
      _id: id      
    };
    if(businessId){
      query.businessId = businessId;
    }

    return defer(() => collection.findOne(query));
  }

  /**
   * get services from the satellite
   */
  static getServiceSatelliteList$(businessId, clientId) {
    const projection = {};
    // const states = ['REQUEST', 'ASSIGNED', 'ARRIVED'];
    // query["state"] = { $in: states};        
    const query = {
      closed: false
    };

    if (businessId) {
      query.businessId = businessId;
    }

    if (clientId) {
      query["client.id"] = clientId;
    }

    const today = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    const explorePastMonth = today.getDate() <= 1;

    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1)
    .pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(COLLECTION_NAME)),
      mergeMap(collection => {
        const cursor = collection
        .find(query, {projection})
        .sort({ timestamp: -1 });

        return mongoDB.extractAllFromMongoCursor$(cursor);
      })
    )
  }


  static getServiceList$(filter, pagination) {
    const projection = {timestamp: 1, paymentType: 1, client: 1, driver: 1, vehicle: 1, state: 1, businessId: 1};
    const query = {};

    if (filter.businessId) {
      query.businessId = filter.businessId;
    }

    if (filter.clientId) {
      query["client.id"] = filter.clientId;
    }

    if (filter.driverDocumentId) {
      query["driver.documentId"] = filter.driverDocumentId;
    }

    if (filter.driverFullname) {
      query["driver.fullname"] = filter.driverFullname;
    }

    if (filter.vehicleLicensePlate) {
      query["vehicle.licensePlate"] = filter.vehicleLicensePlate;
    }

    if (filter.clientUsername) {
      query["client.username"] = filter.clientUsername
    }

    if (filter.clientFullname) {
      query["client.fullname"] = filter.clientFullname
    }

    if (filter.states && filter.states.length > 0) {
      query["state"] = { $in: filter.states};
    }

    if (filter.initTimestamp && filter.endTimestamp) {
      query.timestamp = { $gte: filter.initTimestamp, $lt: filter.endTimestamp};
    }

    if(!filter.showClosedServices){
      query.closed = false;
    }

    const initDate = new Date(filter.initTimestamp);
    const endDate = new Date(filter.endTimestamp);

    return of(initDate)
    .pipe(
      // tap(date => console.log("getServiceList$ date used ==> ", date)),
      map(date => mongoDB.getHistoricalDb(date)),
      // tap(db => console.log(`Searching in ==> ${db.databaseName}.${COLLECTION_NAME}`)),
      map(db => db.collection(COLLECTION_NAME)),
      mergeMap(collection => {
        const cursor = collection
        .find(query, {projection})
        .skip(pagination.count * pagination.page)
        .limit(pagination.count)
        .sort({ timestamp: pagination.sort });

        return mongoDB.extractAllFromMongoCursor$(cursor);
      })
    );
  }

  static getServiceSize$(filter) {
    const query = {};

    if (filter.businessId) {
      query.businessId = filter.businessId;
    }

    if (filter.clientId) {
      query["client.id"] = filter.clientId;
    }

    if (filter.driverDocumentId) {
      query["driver.documentId"] = filter.driverDocumentId;
    }

    if (filter.driverFullname) {
      query["driver.fullname"] = filter.driverFullname;
    }

    if (filter.vehicleLicensePlate) {
      query["vehicle.licensePlate"] = filter.vehicleLicensePlate;
    }

    if (filter.clientUsername) {
      query["client.username"] = filter.clientUsername
    }

    if (filter.clientFullname) {
      query["client.fullname"] = filter.clientFullname
    }

    if (filter.states && filter.states.length > 0) {
      query["state"] = { $in: filter.states};
    }

    if (filter.initTimestamp && filter.endTimestamp) {
      query.timestamp = { $gte: filter.initTimestamp, $lt: filter.endTimestamp};
    }

    if(!filter.showClosedServices){
      query.closed = false;
    }    
    
    const initDate = new Date(filter.initTimestamp);
    const endDate = new Date(filter.endTimestamp);
    console.log("QUERY COUNT ====> ", query);
    return of(initDate)
    .pipe(
      map(date => mongoDB.getHistoricalDb(date)),
      map(db => db.collection(COLLECTION_NAME)),
      mergeMap(collection => collection.count(query)),
      //reduce((acc, val) => acc + val)
    );
  }

  // static closeService$(ServiceId){
  //   const collection = mongoDB.getHistoricalDbByYYMM(ServiceId.substring(ServiceId.length - 4)).collection(COLLECTION_NAME);
  //   return defer(() => collection.updateOne(
  //     { _id: ServiceId },
  //     {
  //       $set: { closed: true },
  //       $unset: { location: 1 }
  //     }
  //   ))
  // }

}
/**
 * @returns {ServiceDA}
 */
module.exports = ServiceDA;
