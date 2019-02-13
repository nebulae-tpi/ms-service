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
  static getSatelliteClients$(clienText, limit, businessId, clientId) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {};
    if(clienText){
      query['$or'] = [ { id: {$regex: clienText, $options: 'i'} }, { 'generalInfo.name': {$regex: filterText, $options: 'i'} } ];
    }

    if(businessId){
      query.businessId = businessId;
    }

    if(clientId){
      query.clientId = clientId;
    }

    const cursor = collection
    .find(query)
    .limit(limit);

    return mongoDB.extractAllFromMongoCursor$(cursor);
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
            $set: {
              generalInfo: clientSatellite.generalInfo, 
              satelliteInfo: clientSatellite.satelliteInfo, 
              location: clientSatellite.location, 
              businessId: clientSatellite.businessId, 
              state: clientSatellite.state,
              auth: clientSatellite.auth
            }
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
