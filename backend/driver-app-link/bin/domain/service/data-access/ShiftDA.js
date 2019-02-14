"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Shift";
const { CustomError } = require("../../../tools/customError");
const { of, Observable, defer, forkJoin, from, range } = require("rxjs");
const { map, mergeMap, tap, filter } = require("rxjs/operators");

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
   * Finds all open shift// DELETE, JUST FOR TESTING
   */
  static findOpenShifts$(projection = undefined) {
    const explorePastMonth = Date.today().getDate() <= 2;
    const query = { "state": "AVAILABLE" };
    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection('Shift')),
      mergeMap(collection => defer(() => mongoDB.extractAllFromMongoCursor$(collection.find(query, { projection })))),
    );
  }

  static findServiceOfferCandidates$(businessId, location, requestedFeatures = [], ignoredShiftsIds = [], maxDistance = 3000, minDistance = 0, projection = undefined) {
    const explorePastMonth = Date.today().getDate() <= 1;

    const query = {
      businessId,
      state: "AVAILABLE",
      online: true,
      
    };
    if(requestedFeatures.length > 0){
      query['vehicle.features'] = { $all: requestedFeatures };
    }
    for (let i = 0, len = ignoredShiftsIds.length; i < len; i++) {
      query[`offer.shifts.${ignoredShiftsIds[i]}`] = { $exists: false };
    }

    const aggregateQuery = [{
      $geoNear: {
        near: location,
        distanceField: "dist.calculated",
        maxDistance: maxDistance,
        minDistance: minDistance,
        query,
        includeLocs: "dist.location",
        num: 20,
        spherical: true
      }
    }]



    console.log(JSON.stringify(aggregateQuery));

    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection('Shift')),
      mergeMap(collection =>
        defer(() =>
    
          collection.aggregate(
            aggregateQuery
          ).toArray()
          //)
        )
      ),
      tap(x => console.log('==========================')),
      tap(x => console.log(JSON.stringify(x))),
      tap(x => console.log('==========================')),
    );
  }


  // /**
  //  * Finds all open shift// DELETE, JUST FOR TESTING
  //  */
  // static findNearOpenShifts$(location,projection = undefined) {
  //   const explorePastMonth = Date.today().getDate() <= 2;
  //   const query = { "state": "AVAILABLE" };
  //   return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
  //     map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
  //     map(db => db.collection('Shift')),
  //     mergeMap(collection => defer(() => mongoDB.extractAllFromMongoCursor$(collection.find(query, { projection })))),
  //   );
  // }


}
/**
 * @returns {ShiftDA}
 */
module.exports = ShiftDA;
