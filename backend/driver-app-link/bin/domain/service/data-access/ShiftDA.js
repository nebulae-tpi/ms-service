"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Shift";
const { CustomError } = require("../../../tools/customError");
const { of, Observable, defer, forkJoin, from, range } = require("rxjs");
const { map, mergeMap, tap, filter, toArray } = require("rxjs/operators");
const getDistance = require('geolib').getDistance;

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
    const today = new Date(new Date().toLocaleString('en', { timeZone: 'America/Bogota' }));
    const explorePastMonth = today.getDate() <= 1;

    const query = {
      businessId,
      state: "AVAILABLE",
      online: true,
      location: {
        $near: {
          $geometry: location,
          $maxDistance: maxDistance,
          $minDistance: minDistance,
        }
      }

    };
    if (requestedFeatures && requestedFeatures.length > 0) {
      query['vehicle.features'] = { $all: requestedFeatures };
    }
    const ignoredIds = ignoredShiftsIds;
    if(ignoredIds && ignoredIds.length> 0){
      query[`_id`] = {$nin: ignoredIds};
    }
    if(businessId === "7d95f8ef-4c54-466a-8af9-6dd197dd920a"){
      console.log("Consultando turnos: ", query);
  } 

    return range(explorePastMonth ? -1 : 0, explorePastMonth ? 2 : 1).pipe(
      map(monthsToAdd => mongoDB.getHistoricalDb(undefined, monthsToAdd)),
      map(db => db.collection('Shift')),
      mergeMap(collection =>
        {
          const cursor = collection.find(query);
          return mongoDB.extractAllFromMongoCursor$(cursor).pipe(
            map(shift => {
              return {...shift, dist: {calculated: getDistance(
                { longitude: shift.location.coordinates[0], latitude: shift.location.coordinates[1] },
                { longitude: location.coordinates[0], latitude: location.coordinates[1] },
                0.01 //centimeter accuracy
              )} }
            }),
            toArray()
          );
        }
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
