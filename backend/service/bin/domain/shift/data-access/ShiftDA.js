"use strict";

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const COLLECTION_NAME = "Shift";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, reduce } = require("rxjs/operators");
const { of, Observable, defer, from } = require("rxjs");
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

  static getShiftById$(id) {
    const yymm = id.substring(id.length - 4);
    const dbToSearch = this.client.db(`historical_${yymm}`).collection(COLLECTION_NAME);
    return defer(() => dbToSearch.findOne(
      { _id: id },
      { projection: { stateChanges: 0, onlineChanges: 0  } }
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
    const collection = mongoDB.db.collection(COLLECTION_NAME);

    const query = {};

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


  static getShiftSize$(filter) {
    const collection = mongoDB.db.collection(COLLECTION_NAME);
    const query = {};
    if (filter.businessId) { query.businessId = filter.businessId;}
    if (filter.name) { query["generalInfo.name"] = { $regex: filter.name, $options: "i" }; }
    if (filter.creationTimestamp) { query.creationTimestamp = filter.creationTimestamp; }
    if (filter.creatorUser) { query.creatorUser = { $regex: filter.creatorUser, $options: "i" }; }
    if (filter.modifierUser) { query.modifierUser = { $regex: filter.modifierUser, $options: "i" };}
    return collection.count(query);
  }


}
/**
 * @returns {ShiftDA}
 */
module.exports = ShiftDA;
