"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Shift";
const { CustomError } = require("../../../tools/customError");
const { of, Observable, defer, forkJoin, from, range } = require("rxjs");
const { map, mergeMap, tap, filter, toArray } = require("rxjs/operators");

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


  static findServiceOfferCandidates$(businessId, location, requestedFeatures = [], ignoredShiftsIds = [], maxDistance = 3000, minDistance = 0, projection = undefined, limit= 20) {
    const today = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    const explorePastMonth = today.getDate() <= 1;

    const query = {
      businessId,
      state: "AVAILABLE",
      online: true,

    };
    if (requestedFeatures && requestedFeatures.length > 0) {
      query['vehicle.features'] = { $all: requestedFeatures };
    }
    for (let i = 0, len = ignoredShiftsIds.length; i < len; i++) {
      query[`offer.shifts.${ignoredShiftsIds[i]}`] = { $exists: false };
    }

    const aggregateQuery = [
      {
        $geoNear: {
          near: location,
          distanceField: "dist.calculated",
          maxDistance: maxDistance,
          minDistance: minDistance,
          query,
          includeLocs: "dist.location",
          //num: 20,
          spherical: true
        },

      },
      { $limit: limit }
    ];



    //console.log("QUERY ==> ", JSON.stringify(aggregateQuery));

    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection('Shift')),
      mergeMap(collection =>
        defer(() =>
          collection.aggregate(
            aggregateQuery
          ).toArray()
        )
      ),
      toArray(),
      //tap( x => console.log('QUERY RESULT: ',JSON.stringify(x))),
      map(([r1, r2]) => explorePastMonth ? r1.concat(r2) : r1)
    );
  }

  static findById$(_id, projection) {
    const today = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    const explorePastMonth = today.getDate() <= 1;

    const query = { _id };

    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection('Shift')),
      mergeMap(collection => defer(() => collection.findOne(query, { projection }))),
      toArray(),
      map(resultArray => resultArray.filter(item => item != null)),
      map((items) => items[0])
    );

  }

}
/**
 * @returns {ShiftDA}
 */
module.exports = ShiftDA;
