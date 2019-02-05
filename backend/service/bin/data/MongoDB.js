"use strict";

const Rx = require("rxjs");
const MongoClient = require("mongodb").MongoClient;
let instance = null;
const { map } = require("rxjs/operators");
const { of, bindNodeCallback, Observable } = require("rxjs");
const dateFormat = require('dateformat');

class MongoDB {
  /**
   * initialize and configure Mongo DB
   * @param { { url, dbName } } ops
   */
  constructor({ url, dbName }) {
    this.url = url;
    this.dbName = dbName;
    this.historicalDbs = {};
  }

  /**
   * Starts DB connections
   * @returns {Rx.Observable} Obserable that resolve to the DB client
   */
  start$() {
    console.log("MongoDB.start$()... ");
    return bindNodeCallback(MongoClient.connect)(this.url).pipe(
      map(client => {
        console.log(this.url);
        this.client = client;
        this.db = this.client.db(this.dbName);
        return `MongoDB connected to dbName= ${this.dbName}`;
      })
    );
  }

  /**
   * Stops DB connections
   * Returns an Obserable that resolve to a string log
   */
  stop$() {
    return Observable.create(observer => {
      this.client.close();
      observer.next("Mongo DB Client closed");
      observer.complete();
    });
  }

  /**
   * Ensure Index creation
   * Returns an Obserable that resolve to a string log
   */
  createIndexes$() {
    return Observable.create(async observer => {
      observer.next(`Creating index for service.Vehicle => ({ licensePlate: 1}, { unique: true})`);
      await this.db.collection('Vehicle').createIndex( { licensePlate: 1}, { unique: true} );

      observer.next("All indexes created");
      observer.complete();
    });
  }

  /**
   * Obtains historical DB
   * @param {Date} date 
   * @param {Int} monthsToAdd 
   */
  getHistoricalDb(date = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })), monthsToAdd = 0) {
    if (monthsToAdd != 0) {
      date.add(-1).month();
    }
    const historicalDbName = `historical_${dateFormat(date, "yymm")}`;
    if (!this.historicalDbs[historicalDbName]) {
      this.historicalDbs[historicalDbName] = this.client.db(historicalDbName);
    }
    return this.historicalDbs[historicalDbName]
  }

  /**
   * Obtains historical DB
   */
  getHistoricalDbByYYMM(yymm) {
    const historicalDbName = `historical_${yymm}`;
    if (!this.historicalDbs[historicalDbName]) {
      this.historicalDbs[historicalDbName] = this.client.db(historicalDbName);
    }
    return this.historicalDbs[historicalDbName]
  }

  /**
   * extracts every item in the mongo cursor, one by one
   * @param {*} cursor
   */
  extractAllFromMongoCursor$(cursor) {
    return Observable.create(async observer => {
      let obj = await MongoDB.extractNextFromMongoCursor(cursor);
      while (obj) {
        observer.next(obj);
        obj = await MongoDB.extractNextFromMongoCursor(cursor);
      }
      observer.complete();
    });
  }

  /**
   * Extracts the next value from a mongo cursos if available, returns undefined otherwise
   * @param {*} cursor
   */
  static async extractNextFromMongoCursor(cursor) {
    const hasNext = await cursor.hasNext();
    if (hasNext) {
      const obj = await cursor.next();
      return obj;
    }
    return undefined;
  }
}

module.exports = {
  MongoDB,
  singleton() {
    if (!instance) {
      instance = new MongoDB({
        url: process.env.MONGODB_URL,
        dbName: process.env.MONGODB_DB_NAME
      });
      console.log(`MongoDB instance created: ${process.env.MONGODB_DB_NAME}`);
    }
    return instance;
  }
};
