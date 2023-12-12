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

  /**
 * Creates a new Client
 * @param {*} client client to create
 */
  static createClient$(client) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.insertOne(client));
  }

  static appendLastRequestedService$(id, newService) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(() =>
      collection.updateOne(
        { _id: id },
        {
          $push: {
            lastServices: { $each: [newService], $slice: -5 }
          }
        },
        {
          upsert: true
        }
      )
    );
  }
  /**
 * Gets a client satellite by the client id
 */
  static getClientByPhoneNumber$(waId, businessId, projection = {}) {
    const collection = mongoDB.db.collection(CollectionName);
    const query = {
      "generalInfo.phone": waId
    };
    if (businessId) {
      query.businessId = businessId;
    }
    return defer(() => collection.findOne(query, projection));
  }

  static getClient$(id, projection) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
      "_id": id
    };
    return defer(() => collection.findOne(query, projection));
  }



}
/**
 * @returns {ClientDA}
 */
module.exports = ClientDA;
