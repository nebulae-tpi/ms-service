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
   * Gets a client satellite by the client id
   */
  static getClientSatellite$(clientId) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
      _id: clientId      
    };
    return defer(() => collection.findOne(query));
  }

    /**
   * Gets the satellite clients by the client name
   */
  static getSatelliteClients$(clienText) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
      'generalInfo.name': { $regex: clienText, $options: "i" }, 
    };
    return defer(() => collection.find(query).limit(30));
  }

    /**
   * modifies the general info of the indicated Client 
   * @param {*} id  Client ID
   * @param {*} clientSatellite  Client info
   */
  static updateClientSatellite$(id, clientSatellite) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(()=>
        collection.findOneAndUpdate(
          { _id: id },
          {
            $set: {generalInfo: clientSatellite.generalInfo, location: clientSatellite.location}
          },
          {
            upsert: true,
            returnOriginal: false
          }
        )
    ).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }



}
/**
 * @returns {ClientDA}
 */
module.exports = ClientDA;
