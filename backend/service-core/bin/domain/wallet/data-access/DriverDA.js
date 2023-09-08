"use strict";

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const CollectionName = "Driver";
const { CustomError } = require("../../../tools/customError");
const { map } = require("rxjs/operators");
const { of, Observable, defer } = require("rxjs");

class DriverDA {
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
  
  static updateDriverWallet$(driverId, wallet){
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.updateOne({_id: driverId}, {$set: { wallet: wallet } }, {writeConcern: { w: 1 }}) )
  }

}
/**
 * @returns {DriverDA}
 */
module.exports = DriverDA;
