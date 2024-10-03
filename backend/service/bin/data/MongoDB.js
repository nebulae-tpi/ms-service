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

      observer.next(`Creating index for main.Vehicle => ({ licensePlate: 1})`);
      await this.db.collection('Vehicle').createIndex({ licensePlate: 1 }).catch((err) => console.log(`Failed to create index: ${err}`));

      // TODO indexes for historical DBs

      observer.next("All indexes created");
      observer.complete();
    });
  }
  

  /**
   * Create the indexes for historical database
   */
  createIndexesOnHistoricalCollection$() {
    return Observable.create(async observer => {
      const historicalDB = this.getHistoricalDb(undefined, 1);

      // INDEXES FOR COLLECTION 'Service' IN HISTORICAL RELATED DB

      observer.next(`Creating index for ${historicalDB.databaseName}.Service => ({ timestamp: -1, state: 1, closed: 1, businessId: 1, "driver.documentId": 1 })`);
      await historicalDB.collection("Service").createIndex({ timestamp: -1, state: 1, closed: 1, businessId: 1, "driver.documentId": 1 })
        .catch((err) => console.log(`Failed to create index: ${err}`));

        observer.next(`Creating index for ${historicalDB.databaseName}.Service => ({ timestamp: -1, state: 1, closed: 1, businessId: 1, "driver.documentId": 1 })`);
      await historicalDB.collection("Service").createIndex({ "client.id": 1})
        .catch((err) => console.log(`Failed to create index: ${err}`));
      
      observer.next(`Creating index for ${historicalDB.databaseName}.Service => ({ closed: -1, state: 1, shiftId: 1 })`);
      await historicalDB.collection("Service").createIndex({ closed: 1, shiftId: 1 })
        .catch((err) => console.log(`Failed to create index: ${err}`));

      observer.next(`Creating index for ${historicalDB.databaseName}.Service => ({ timestamp: -1, state: 1, closed: 1, "driver.documentId": 1 }, { background: true })`);
      await historicalDB.collection("Service").createIndex({ timestamp: -1, state: 1, closed: 1, "driver.documentId": 1 }, { background: true })
        .catch((err) => console.log(`Failed to create index: ${err}`));

      observer.next(`Creating index for ${historicalDB.databaseName}.Service => ({ businessId: 1, closed: 1, "request.ownerOperatorId": 1 }, { background: true })`);
      await historicalDB.collection("Service").createIndex({ businessId: 1, closed: 1, "request.ownerOperatorId": 1 }, { background: true })
        .catch((err) => console.log(`Failed to create index: ${err}`));

      observer.next(`Creating index for ${historicalDB.databaseName}.Service => ({ businessId_1_closed_1_state_1_client.username_1_client.fullname_1 })`);
      await historicalDB.collection("Service").createIndex({businessId: 1, closed: 1, state: 1, "client.username": 1, "client.fullname": 1, "vehicle.licensePlate": 1, "driver.fullname": 1, "driver.documentId": 1}, { background: true,  name: "businessId_1_closed_1_state_1_client.username_1_client.fullname_1" })
        .catch((err) => console.log(`Failed to create index: ${err}`));

      observer.next(`Creating index for ${historicalDB.databaseName}.Service => ({ state: 1, "driver.id": 1 }, { background: true })`);
      await historicalDB.collection("Service").createIndex({ state: 1, "driver.id": 1 }, { background: true })
        .catch((err) => console.log(`Failed to create index: ${err}`));

      observer.next(`Creating index for ${historicalDB.databaseName}.Service => ({ location: "2dsphere" })`);
      await historicalDB.collection("Service").createIndex({ location: "2dsphere" })
        .catch((err) => console.log(`Failed to create index: ${err}`));

      observer.next(`Creating index for ${historicalDB.databaseName}.Service => ({state: 1, "vehicle.licensePlate": 1 })`);
      await historicalDB.collection("Service").createIndex({state: 1, 'vehicle.licensePlate': 1 })
        .catch((err) => console.log(`Failed to create index: ${err}`));

      observer.next(`Creating index for ${historicalDB.databaseName}.Service => ({ state: 1, "driver.fullname": 1 })`);
      await historicalDB.collection("Service").createIndex({ state: 1, 'driver.fullname': 1 })
        .catch((err) => console.log(`Failed to create index: ${err}`));

      observer.next(`Creating index for ${historicalDB.databaseName}.Service => ({ state: 1, "driver.documentId": 1 })`);
      await historicalDB.collection("Service").createIndex({ state: 1, 'driver.documentId': 1 })
        .catch((err) => console.log(`Failed to create index: ${err}`));
      
      observer.next(`Creating index for ${historicalDB.databaseName}.Service => ({ state: 1, "client.fullname" : 1, })`);
      await historicalDB.collection("Service").createIndex({ state: 1, 'client.fullname' : 1, })
        .catch((err) => console.log(`Failed to create index: ${err}`));

      // INDEXES FOR COLLECTION 'Shift' IN HISTORICAL RELATED DB

      observer.next(`Creating index for ${historicalDB.databaseName}.Shift => ({ timestamp: -1, state: 1, businessId: 1, "driver.documentId": 1, "vehicle.licensePlate": 1, online: 1 })`);
      await historicalDB.collection("Shift").createIndex({ timestamp: -1, state: 1, businessId: 1, "driver.documentId": 1, "vehicle.licensePlate": 1, online: 1 })
        .catch((err) => console.log(`Failed to create index: ${err}`));

      observer.next(`Creating index for ${historicalDB.databaseName}.Shift => ({ state: 1, "driver.id": 1 })`);
      await historicalDB.collection('Shift').createIndex({ state: 1, "driver.id": 1 })
        .catch((err) => console.log(`Failed to create index: ${err}`));

      observer.next(`Creating index for ${historicalDB.databaseName}.Shift => ({ state: 1, "vehicle.licensePlate": 1 })`);
      await historicalDB.collection('Shift').createIndex({ state: 1, "vehicle.licensePlate": 1 })
        .catch((err) => console.log(`Failed to create index: ${err}`));

      observer.next(`Creating index for ${historicalDB.databaseName}.Shift => ({ "vehicle.licensePlate": 1 })  `);
      await historicalDB.collection('Shift').createIndex({ "vehicle.licensePlate": 1 })
        .catch((err) => console.log(`Failed to create index: ${err}`));

      observer.next(`Creating index for ${historicalDB.databaseName}.Shift => ({online: 1,state: 1,lastReceivedComm: 1})`);
      await historicalDB.collection('Shift').createIndex({online: 1,state: 1,lastReceivedComm: 1})
        .catch((err) => console.log(`Failed to create index: ${err}`));


      observer.next(`Creating index for ${historicalDB.databaseName}.Shift => ({ state: 1, "vehicle.id": 1 })`);
      await historicalDB.collection('Shift').createIndex({ state: 1, "vehicle.id": 1 })
        .catch((err) => console.log(`Failed to create index: ${err}`));

      observer.next(`Creating index for ${historicalDB.databaseName}.Shift => ({ location: "2dsphere" })`);
      await historicalDB.collection('Shift').createIndex({ location: "2dsphere" })
        .catch((err) => console.log(`Failed to create index: ${err}`));

      // INDEXES FOR COLLECTION 'drivers' IN master DB

      observer.next(`Creating index for master.Driver => ({ businessId: 1 })`);
      await this.client.db('master') .collection('Driver').createIndex({ businessId: 1, documentId: 1 })
        .catch((err) => console.log(`Failed to create index: ${err}`));

        observer.next(`Creating index for master.Driver => ({ assignedVehicles: 1 })`);
      await this.client.db('master') .collection('Driver').createIndex({ assignedVehicles: 1 })
        .catch((err) => console.log(`Failed to create index: ${err}`));

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
    if (monthsToAdd != 0) { date.add(monthsToAdd).month(); }
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
