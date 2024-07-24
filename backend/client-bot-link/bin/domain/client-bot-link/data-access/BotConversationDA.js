"use strict";

require('datejs');
let mongoDB = undefined;
const CollectionName = "BotConversation";
const { of, Observable, defer, forkJoin, from, range } = require("rxjs");
const { map, mergeMap, tap, filter, toArray } = require("rxjs/operators");

class BotConversationDA {

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

  static getById$(businessId, projection = {}) {
    const collection = mongoDB.db.collection("Business");
    const query = {
      "_id": businessId
    };
    return defer(() => collection.findOne(query, projection));
  }
  
  static getBotConversation$(waId) {
    const collection = mongoDB.db.collection(CollectionName);
    console.log("QUERY ===> ", { 'waId': waId})
    return defer(() => collection.findOne({ 'waId': waId }));
  }

  static updateExpirationTs$(id, timestamp) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(() =>
      collection.updateOne(
        { waId: id },
        {
          $set: {
            expirationTimestamp: timestamp
          }
        },
        {
          writeConcern: { w: 1 },
          upsert: true
        }
      )
    );
  }

  static createConversation$(id, conversation) {
    const collection = mongoDB.db.collection(CollectionName);

    return defer(() =>
      collection.updateOne(
        { _id: id },
        {
          $set: conversation
        },
        {
          writeConcern: { w: 1 },
          upsert: true
        }
      )
    );
  }

  


}
/**
 * @returns {BotConversationDA}
 */
module.exports = BotConversationDA;
