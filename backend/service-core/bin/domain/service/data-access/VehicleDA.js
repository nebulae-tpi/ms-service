"use strict";

let mongoDB = undefined;
const CollectionName = "Vehicle";
const { CustomError } = require("../../../tools/customError");
const { map } = require("rxjs/operators");
const { of, Observable, defer } = require("rxjs");

class VehicleDA {
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

  static getVehicleList$(filter = {}) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {};
    if (filter.plate) {
      query['licensePlate'] = { $regex: filter.plate, $options: "i" };
    }

    if (filter.businessId) {
      query["businessId"] = filter.businessId;
    }

    const projection = { licensePlate: 1, active: 1 };
    //console.log('QUERY VEHICLE', query);
    return defer(() =>
      mongoDB.extractAllFromMongoCursor$(
        collection.find(query, { projection })
      ).pipe(
        map(res => ({ ...res, id: res._id }))
      )
    );
  }

  /**
   * Gets Vehicle by its license plate
   */
  static findByLicensePlate$(licensePlate, projection = undefined) {
    const collection = mongoDB.db.collection(CollectionName);
    const query = { licensePlate };
    return defer(() => collection.findOne(query, { projection }));
  }



}
/**
 * @returns {VehicleDA}
 */
module.exports = VehicleDA;
