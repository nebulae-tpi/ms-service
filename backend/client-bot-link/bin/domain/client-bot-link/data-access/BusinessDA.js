"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "Business";
const { of, Observable, defer, forkJoin, from, range } = require("rxjs");
const { map, mergeMap, tap, filter, toArray } = require("rxjs/operators");

class BusinessDA {

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
   * modifies the attributes of the indicated business 
   * @param {*} id  Business ID
   * @param {*} businessAttributes  New attributes of the business
   */
  static updateBusinessAttributes$(id, businessAttributes) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(() =>
      collection.updateOne(
        { _id: id },
        {
          $set: businessAttributes
        }
      )
    );
  }

  /**
 * Creates a new business
 * @param {*} business business to create
 */
  static persistBusiness$(business) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.insertOne(business));
  }

  /**
   * Updates the business state 
   * @param {string} id business ID
   * @param {boolean} newBusinessState boolean that indicates the new business state
   */
  static changeBusinessState$(id, newBusinessState) {
    const collection = mongoDB.db.collection(CollectionName);
    
    return defer(()=>
        collection.updateOne(
          { _id: id},
          {
            $set: {state: newBusinessState}
          }
        )
    );
  }

  /**
   * modifies the general info of the indicated business 
   * @param {*} id  Business ID
   * @param {*} businessGeneralInfo  New general information of the business
   */
  static updateBusinessContactInfo$(businessId, businessContactInfo) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(()=>
      collection.updateOne(
        { _id: businessId },
        {
          $set: { contactInfo: businessContactInfo }
        }
      )
    );
  }

  /**
   * modifies the general info of the indicated business 
   * @param {*} id  Business ID
   * @param {*} businessGeneralInfo  New general information of the business
   */
  static updateBusinessGeneralInfo$(id, businessGeneralInfo) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(()=>
        collection.updateOne(
          { _id: id },
          {
            $set: {generalInfo: businessGeneralInfo}
          }
        )
    );
  }


}
/**
 * @returns {BusinessDA}
 */
module.exports = BusinessDA;
