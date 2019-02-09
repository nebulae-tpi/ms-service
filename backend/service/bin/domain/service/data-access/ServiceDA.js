"use strict";

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const CollectionName = "Service";
const DatabaseName = "historical_";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, reduce } = require("rxjs/operators");
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
    const collection = mongoDB.client.db(`${DatabaseName}${monthYear}`).collection(CollectionName);

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

    console.log('getServiceSatelliteList => ', query);

    const explorePastMonth = Date.today().getDate() <= 2;

    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1)
    .pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection(CollectionName)),
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

    if ( filter.showClosedServices && filter.initTimestamp && filter.endTimestamp) {
      query.timestamp = { $gte: filter.initTimestamp, $lt: filter.endTimestamp};
    }

    if(!filter.showClosedServices){
      query.open = true;
    }


    return of(query.timestamp)
      .pipe(
        mergeMap(includeClosed => includeClosed
          ? of({})
            .pipe(
              mergeMap(() => {
                const date1 = new Date(new Date(filter.initTimestamp).toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
                const date2 = new Date(new Date(filter.endTimestamp).toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
                const dateNow = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
                const monthsBeforedate1 = (Crosscutting.getYearMonthArray(date1, dateNow).length * -1) + 1;
                const monthsBeforedate2 = Crosscutting.getYearMonthArray(date1, date2).length;
                return of({
                  start: monthsBeforedate1,
                  count: monthsBeforedate2
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
        map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
        map(db => db.collection(CollectionName)),
        mergeMap(collection => {
          const cursor = collection
            .find(query, { projection })
            .skip(pagination.count * pagination.page)
            .limit(pagination.count)
            .sort({ creationTimestamp: pagination.sort });

          return mongoDB.extractAllFromMongoCursor$(cursor);
        })
      );


    // const initDate = new Date(filter.initTimestamp);
    // const endDate = new Date(filter.endTimestamp);

    // return from(Crosscutting.getYearMonthArray(initDate, endDate))
    // .pipe(
    //   map(date => mongoDB.getHistoricalDb(date)),
    //   map(db => db.collection(CollectionName)),
      // mergeMap(collection => {
      //   const cursor = collection
      //   .find(query, {projection})
      //   .skip(pagination.count * pagination.page)
      //   .limit(pagination.count)
      //   .sort({ creationTimestamp: pagination.sort });

      //   return mongoDB.extractAllFromMongoCursor$(cursor);
      // })
    // );
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

    if ( filter.showClosedServices && filter.initTimestamp && filter.endTimestamp) {
      query.timestamp = { $gte: filter.initTimestamp, $lt: filter.endTimestamp};
    }
    if(!filter.showClosedServices){
      query.open = true;
    }

    return of(query.timestamp)
      .pipe(
        mergeMap(includeClosed => includeClosed
          ? of({})
            .pipe(
              mergeMap(() => {
                const date1 = new Date(new Date(filter.initTimestamp).toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
                const date2 = new Date(new Date(filter.endTimestamp).toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
                const dateNow = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
                const monthsBeforedate1 = (Crosscutting.getYearMonthArray(date1, dateNow).length * -1) + 1;
                const monthsBeforedate2 = Crosscutting.getYearMonthArray(date1, date2).length;
                return of({
                  start: monthsBeforedate1,
                  count: monthsBeforedate2
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
        map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
        map(db => db.collection(CollectionName)),
        mergeMap(collection => collection.count(query))
      );

  

    // const initDate = new Date(filter.initTimestamp);
    // const endDate = new Date(filter.endTimestamp);

    // return from(Crosscutting.getYearMonthArray(initDate, endDate))
    // .pipe(
    //   map(date => mongoDB.getHistoricalDb(date)),
    //   map(db => db.collection(CollectionName)),
    //   mergeMap(collection => collection.count(query)),
    //   reduce((acc, val) => acc + val)
    // );
  }

  static closeService$(ServiceId){
    const collection = mongoDB.getHistoricalDbByYYMM(ServiceId.substring(ServiceId.length - 4)).collection(CollectionName);
    return defer(() => collection.updateOne(
      { _id: ServiceId },
      {
        $set: { state: "CLOSED" },
        $unset: { location: 1 }
      }
    ))
  }

}
/**
 * @returns {ServiceDA}
 */
module.exports = ServiceDA;
