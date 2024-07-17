"use strict";

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const CollectionName = "Client";
const { CustomError } = require("../../../tools/customError");
const { map } = require("rxjs/operators");
const { of, Observable, defer } = require("rxjs");

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
  
  static updateClientWallet$(clientId, wallet){
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.updateOne({_id: clientId}, {$set: { wallet: wallet } }, {writeConcern: { w: 1 }}) )
  }

}
/**
 * @returns {ClientDA}
 */
module.exports = ClientDA;
