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

    const query = { active: true };

    if(filter.licensePlate && filter.licensePlate.length >= 3 ){
      query.assignedVehicles = { $regex: filter.licensePlate, $options: "i" };
    }

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

    const query = { active: true };

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

  static updateUserName$(driverId, newUsername){
    const collection = mongoDB.db.collection(CollectionName);
    return defer(()=>
        collection.findOneAndUpdate(
          { _id: driverId },
          { $set: { username: newUsername } },
          { returnOriginal: false }
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
    // todo: guardar el registro de quien es el que hace la asignacion
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.updateOne(
      {_id: driverId },
      { $push: { assignedVehicles: vehiclePlate } }
    ))
  }

  static unassignVehicle$(driverId, vehiclePlate){
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.updateOne(
      {_id: driverId },
      { $pull: { assignedVehicles: vehiclePlate } }
    ))
  }

  static unassignVehicleFromAllDrivers$(licensePlate){
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.updateMany(
      { assignedVehicles: { $in: [licensePlate] } },
      { $pull: { assignedVehicles: licensePlate } }
    ))
  }

  static insertBlock$(driverId, block){
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.updateOne({_id: driverId}, {$push: { blocks: block } }) )
  }

  static removeBlock$(driverId, blockKey){
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.updateOne({_id: driverId}, {$pull: { blocks: { key: blockKey } } }) )
  }  

}
/**
 * @returns {DriverDA}
 */
module.exports = DriverDA;
