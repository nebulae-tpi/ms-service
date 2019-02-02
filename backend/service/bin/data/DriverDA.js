"use strict";

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const CollectionName = "Driver";
const { CustomError } = require("../tools/customError");
const { map } = require("rxjs/operators");
const { of, Observable, defer } = require("rxjs");

class DriverDA {
  static start$(mongoDbInstance) {
    return Observable.create(observer => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next("using given mongo instance");
      } else {
        mongoDB = require("./MongoDB").singleton();
        observer.next("using singleton system-wide mongo instance");
      }
      observer.complete();
    });
  }

  /**
   * Gets an user by its username
   */
  static getDriver$(id, businessId) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
      _id: id      
    };
    if(businessId){
      query.businessId = businessId;
    }

    return defer(() => collection.findOne(query));
  }

  static getDriverList$(filter, pagination) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
    };

    if (filter.businessId) {
      query.businessId = filter.businessId;
    }

    if (filter.name) {
      query["name"] = { $regex: filter.name, $options: "i" };
    }
    if (filter.lastname) {
      query["lastname"] = { $regex: filter.lastname, $options: "i" };
    }
    if (filter.documentId) {
      query["documentId"] = { $regex: filter.documentId, $options: "i" };
    }

  

    const cursor = collection
      .find(query)
      .skip(pagination.count * pagination.page)
      .limit(pagination.count)
      .sort({ creationTimestamp: pagination.sort });

    return mongoDB.extractAllFromMongoCursor$(cursor);
  }

  static getDriverSize$(filter) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
    };

    if (filter.businessId) {
      query.businessId = filter.businessId;
    }

    if (filter.name) {
      query["generalInfo.name"] = { $regex: filter.name, $options: "i" };
    }

    if (filter.creationTimestamp) {
      query.creationTimestamp = filter.creationTimestamp;
    }

    if (filter.creatorUser) {
      query.creatorUser = { $regex: filter.creatorUser, $options: "i" };
    }

    if (filter.modifierUser) {
      query.modifierUser = { $regex: filter.modifierUser, $options: "i" };
    }

    return collection.count(query);
  }

  /**
   * Creates a new Driver
   * @param {*} driver driver to create
   */
  static createDriver$(driver) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.insertOne(driver));
  }

      /**
   * modifies the general info of the indicated Driver 
   * @param {*} id  Driver ID
   * @param {*} DriverGeneralInfo  New general information of the Driver
   */
  static updateDriverGeneralInfo$(id, newGeneralInfo) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(()=>
        collection.findOneAndUpdate(
          { _id: id },
          {
            $set: { ...newGeneralInfo }
          },{
            returnOriginal: false
          }
        )
    ).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

  /**
   * Updates the Driver state 
   * @param {string} id Driver ID
   * @param {boolean} newDriverState boolean that indicates the new Driver state
   */
  static updateDriverState$(id, newDriverState) {
    const collection = mongoDB.db.collection(CollectionName);
    
    return defer(()=>
        collection.findOneAndUpdate(
          { _id: id},
          {
            $set: {state: newDriverState.state}
          },{
            returnOriginal: false
          }
        )
    ).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

  static assignVehicle$(driverId, vehiclePlate){
    console.log("static assignVehicle$(driverId, vehiclePlate)", driverId, vehiclePlate);
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.updateOne(
      {_id: driverId },
      { $push: { assignedVehicles: vehiclePlate } }
    ))
  }

}
/**
 * @returns {DriverDA}
 */
module.exports = DriverDA;
