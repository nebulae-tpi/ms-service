"use strict";

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const CollectionName = "Client";
const { CustomError } = require("../../../tools/customError");
const { map, mergeMap, reduce } = require("rxjs/operators");
const { of, Observable, defer, from } = require("rxjs");
const Crosscutting = require("../../../tools/Crosscutting");

class ClientDA {
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


  static getClient$(id, projection) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
      "_id": id
    };
    return defer(() => collection.findOne(query, projection));
  }

  static getClientByDriverCode$(driverCode) {
    const collection = mongoDB.db.collection(COLLECTION_NAME);

    const query = {
      driverCode
    };

    return defer(() => collection.findOne(query));
  }



}
/**
 * @returns {ClientDA}
 */
module.exports = ClientDA;
