"use strict";

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const CollectionName = "Service";
const DatabaseName = "historical_";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, reduce } = require("rxjs/operators");
const { of, Observable, defer, from } = require("rxjs");
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
    const collection = mongoDB.client.db(`${DatabaseName}${monthYear}`).collection(CollectionName);

    const query = {
      _id: id      
    };
    if(businessId){
      query.businessId = businessId;
    }

    return defer(() => collection.findOne(query));
  }

  static getServiceSatelliteList$(filter, pagination) {
    console.log('getServiceSatelliteList ', filter);

    const projection = {dropOff: 0, route: 0};

    const states = ['REQUEST', 'ASSIGNED', 'ARRIVED'];    
    const query = {};
    query["state"] = { $in: states};
    
    const currentDate = new Date();
    const endDate = new Date(currentDate);
    let initDate = null;
    if(currentDate.getDate() > 3){
      initDate = Crosscutting.addMonth(currentDate, -1);
    }else{
      initDate = new Date(currentDate);;
    }
    
    return from(Crosscutting.getYearMonthArray(initDate, endDate))
    .pipe(
      map(date => {        
        const yearMonth = Crosscutting.getYearMonth(date);
        const collection = mongoDB.client.db(`${DatabaseName}${yearMonth}`).collection(CollectionName);
        return collection;
      }),
      mergeMap(collection => {
        const cursor = collection
        .find(query, {projection})
        .skip(pagination.count * pagination.page)
        .limit(pagination.count)
        .sort({ creationTimestamp: pagination.sort });

        return mongoDB.extractAllFromMongoCursor$(cursor);
      })
    );
  }


  static getServiceList$(filter, pagination) {
    console.log('getServiceList ', filter);   
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
      query["driver.fullname"] = { $regex: filter.driverFullname, $options: "i" };
    }

    if (filter.vehicleLicensePlate) {
      query["vehicle.licensePlate"] = { $regex: filter.vehicleLicensePlate, $options: "i" };
    }

    if (filter.clientUsername) {
      query["client.username"] = { $regex: filter.clientUsername, $options: "i" };
    }

    if (filter.clientFullname) {
      query["client.fullname"] = { $regex: filter.clientFullname, $options: "i" };
    }

    if (filter.states) {
      query["state"] = { $in: filter.states};
    }

    if (filter.initTimestamp && filter.endTimestamp) {
      query.timestamp = { $gte: filter.initTimestamp, $lt: filter.endTimestamp};
    }

    if(!filter.showClosedServices){
      query.open = true;
    }


    const initDate = new Date(filter.initTimestamp);
    const endDate = new Date(filter.endTimestamp);
    
    return from(Crosscutting.getYearMonthArray(initDate, endDate))
    .pipe(
      map(date => {        
        const yearMonth = Crosscutting.getYearMonth(date);
        const collection = mongoDB.client.db(`${DatabaseName}${yearMonth}`).collection(CollectionName);
        return collection;
      }),
      mergeMap(collection => {
        const cursor = collection
        .find(query, {projection})
        .skip(pagination.count * pagination.page)
        .limit(pagination.count)
        .sort({ creationTimestamp: pagination.sort });

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
      query["driver.fullname"] = { $regex: filter.driverFullname, $options: "i" };
    }

    if (filter.vehicleLicensePlate) {
      query["vehicle.licensePlate"] = { $regex: filter.vehicleLicensePlate, $options: "i" };
    }

    if (filter.clientUsername) {
      query["client.username"] = { $regex: filter.clientUsername, $options: "i" };
    }

    if (filter.clientFullname) {
      query["client.fullname"] = { $regex: filter.clientFullname, $options: "i" };
    }

    if (filter.states) {
      query["state"] = { $in: filter.states};
    }

    if (filter.initTimestamp && filter.endTimestamp) {
      query.timestamp = { $gte: filter.initTimestamp, $lt: filter.endTimestamp};
    }

    if(!filter.showClosedServices){
      query.open = true;
    }

    const initDate = new Date(filter.initTimestamp);
    const endDate = new Date(filter.endTimestamp);

    return from(Crosscutting.getYearMonthArray(initDate, endDate))
    .pipe(
      map(date => {
        const yearMonth = Crosscutting.getYearMonth(date);
        const collection = mongoDB.client.db(`${DatabaseName}${yearMonth}`).collection(CollectionName);
        return collection;
      }),
      mergeMap(collection => collection.count(query)),
      reduce((acc, val) => acc + val)
    );
  }

}
/**
 * @returns {ServiceDA}
 */
module.exports = ServiceDA;
