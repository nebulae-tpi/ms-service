// TEST LIBS
const assert = require("assert");
const uuidv4 = require("uuid/v4");
const expect = require("chai").expect;
const DriverMapperHelper = require("./driverMapperHelper");

const { take, mergeMap, map, tap,delay, toArray, reduce, concatMap, filter } = require("rxjs/operators");
const {forkJoin, of, interval, concat, from, observable, bindNodeCallback, defer, range } = require("rxjs");

//LIBS FOR TESTING
const MqttBroker = require("../bin/tools/broker/MqttBroker");
const MongoDB = require("../bin/data/MongoDB").MongoDB;

let DriverDA = undefined;
let ServiceDA = undefined;
let VehicleDA = undefined;



let mongoDB = undefined;
let broker = undefined;

// const dbName = `test-${uuidv4().toString().slice(0, 5)}-service`;
const dbName = `service`;


const environment = {
  NODE_ENV: "production",
  BROKER_TYPE: "MQTT",
  REPLY_TIMEOUT: 2000,
  EMI_MATERIALIZED_VIEW_UPDATES_TOPIC : "emi-gateway-materialized-view-updates",
  MQTT_SERVER_URL: "mqtt://localhost:1883",
  MONGODB_URL: "mongodb://localhost:27017,localhost:27018,localhost:27019?replicaSet=rs0",
  MONGODB_DB_NAME: dbName,
  JWT_PUBLIC_KEY:
    "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA9H4ADvXQUF1ajgcBaLw33ZsIl8BijwG+grOW4m0lLJkz5Yc0sMVbjk2w4nI3qTADtnh3B6QQIM2S78x/Is6rxJUXXsxOFIZeYgOPlzWqEQg3MU4w08VT2WmsxzBRsHbSYeN6kepLIaSnOBaAFnGZDsmJ3kb1KC1Tnc1+KretxS9iuk5xDf0wnO/u+lvV5cDYHloVzpOkFt2uCfhPF3sikunnQARwjp+pLx+V23/YLmccMarN688WL1elWrw+8zd4JDAXebTqr5+tsDIaP5h7lxmIdO5i0Zw5gUe5oHByPC/GKqcCjXxSNpUKxQvEEC7D7km6szAgvgLrWGenPvsT7wIDAQAB\n-----END PUBLIC KEY-----",
  EVENT_STORE_BROKER_TYPE: "MQTT",
  EVENT_STORE_BROKER_EVENTS_TOPIC: "Events",
  EVENT_STORE_BROKER_URL: "mqtt://localhost:1883",
  EVENT_STORE_STORE_TYPE: "MONGO",
  EVENT_STORE_STORE_URL: "mongodb://localhost:27017,localhost:27018,localhost:27019?replicaSet=rs0",
  EVENT_STORE_STORE_AGGREGATES_DB_NAME: "Aggregates",
  EVENT_STORE_STORE_EVENTSTORE_DB_NAME: "EventStore"
};

/*
NOTES:
before run please start mongoDB:
  docker-compose up setup-rs

  remember to config /etc/hosts to resolve store-mongo1, store-mongo2, store-mongo3
    127.0.0.1 store-mongo1
    127.0.0.1 store-mongo2
    127.0.0.1 store-mongo3

*/

describe("BDD - MAIN TEST", function() {
  /*
  * PREAPARE
  */
    describe("Prepare test DB and backends", function () {
        it("start service backend and its Database", function (done) {
            this.timeout(60000);
            Object.keys(environment).forEach(envKey => {
                process.env[envKey] = environment[envKey];
                console.log(`env var set => ${envKey}:${process.env[envKey]}`);
            });

            const eventSourcing = require("../bin/tools/EventSourcing")();
            const eventStoreService = require("../bin/services/event-store/EventStoreService")();
            DriverDA = require("../bin/data/DriverDA");
            ServiceDA = require("../bin/data/ServiceDA");
            VehicleDA = require("../bin/data/VehicleDA");
            mongoDB = require("../bin/data/MongoDB").singleton();

            of({})
                .pipe(
                    mergeMap(() =>
                        concat(
                            eventSourcing.eventStore.start$(),
                            eventStoreService.start$(),
                            mongoDB.start$(),
                            DriverDA.start$(),
                            ServiceDA.start$(),
                            VehicleDA.start$(),

                        )
                    )
                )
                .subscribe(evt => console.log(evt),
                    error => {
                        console.error("Failed to start", error);
                        //process.exit(1);
                        return done(error);
                    },
                    () => {
                        console.log("reports server started");
                        return done();
                    }
                );
        }),
        it("start MQTT broker", function (done) {
            broker = new MqttBroker({
                mqttServerUrl: process.env.MQTT_SERVER_URL,
                replyTimeout: process.env.REPLY_TIMEOUT || 2000
            });
            done();
        });
    });

    describe("Prepare test DB and backends", function () {
      it("start service backend and its Database", function (done) {
        this.timeout(600000);

        return defer(() => DriverMapperHelper.processFile$() )
          .subscribe(evt => console.log(evt),
            error => {
              console.error("Failed to start", error);
              //process.exit(1);
              return done(error);
            },
            () => {
              console.log("reports server started");
              return done();
            }
          );
      });
  });



  // /*
  // * CREATE THE DRIVERS
  // */
  // describe("Create and update the drivers", function() {
  //   this.timeout(7200000);
  //   // busines list demo
  //   const driverList = [ 
  //       { _id: uuidv4(), name: "juan", lastname: 'Santa' },     
  //       { _id: uuidv4(), name: "camilo", lastname: 'toro' },     
  //       { _id: uuidv4(), name: "sebas", lastname: 'zuluaga' },     
  //       { _id: uuidv4(), name: "leon", lastname: 'duran' },     
  //       { _id: uuidv4(), name: "daniel", lastname: 'stan' },     
  //       { _id: uuidv4(), name: "fernando", lastname: 'torres' },     
  //       { _id: uuidv4(), name: "esteban", lastname: 'soto' },     
  //       { _id: uuidv4(), name: "andres", lastname: 'ramirez' },     
  //    ]; 

  //   it("Create the 10 drivers", function(done) {
  //     from(driverList)
  //       .pipe(
  //         // send the command to create the drivers
  //         tap(d => console.log("ejecutando al usuario con ID ==> ", d._id)),          
  //         concatMap(driver =>
  //           broker.send$("Events", "", {
  //             et: "DriverCreated",
  //             etv: 1,
  //             at: "Driver",
  //             aid: driver._id,
  //             data: {
  //               _id: uuidv4(),
  //               creatorUser: "juan.santa",
  //               creationTimestamp: new Date().getTime(),
  //               modifierUser: "juan.santa",
  //               modificationTimestamp: new Date().getTime(),
  //               generalInfo: {
  //                 documentType: 'CC',
  //                 document: '1045098765',
  //                 name: driver.name,
  //                 lastname: driver.lastname,
  //                 email: `${driver.name}.${driver.lastname}@email.com`,
  //                 phone: 3125248898,
  //                 languages: [{ name: "EN", active: true }, { name: "FR", active: false },],
  //                 gender: 'M',
  //                 pmr: false
  //               },
  //               state: true,
  //               businessId: 'q1w2-e3-r4t5-y6u7-u7i8'
  //             },
  //             user: "juan.santa",
  //             timestamp: Date.now(),
  //             av: 164
  //           })
  //             .pipe(
  //               delay(200)
  //             )
  //         ), 
  //         toArray(),
  //         tap(r => console.log(r)),
  //       )
  //       .subscribe(
  //         evt => {},
  //         error => {
  //           console.error(`sent message failded ${error}`);
  //           return done(error);
  //         },
  //         () => done()
  //       );
  //   });

  // });



  // /**
  //  * CREATE THE VEHICLES
  //  */
  // describe("Create the vehicles", function() {
  //   // busines list demo
  //   const vehicleList = [ 
  //     { _id: uuidv4(), plate: "RGT345" },
  //     { _id: uuidv4(), plate: "JGI259" },
  //     { _id: uuidv4(), plate: "KIJ765" },
  //     { _id: uuidv4(), plate: "DFR346" },
  //     { _id: uuidv4(), plate: "DCF456" },
  //     { _id: uuidv4(), plate: "AXD230" },
  //     { _id: uuidv4(), plate: "SED347" },
  //     { _id: uuidv4(), plate: "CFU572" }        
  //    ]; 

  //   it("Create the 10 vehicles", function(done) {
  //     this.timeout(7200000);
  //     from(vehicleList)
  //       .pipe(
  //         delay(20),
  //         // send the command to create the drivers
  //         tap(v => console.log("ejecutando al vehiculo con ID ==> ", v._id)),
  //         concatMap(vehicle =>
  //           broker.send$("Events", "", {
  //             et: "VehicleCreated",
  //             etv: 1,
  //             at: "Vehicle",
  //             aid: vehicle._id,
  //             data: {
  //               _id: uuidv4(),
  //               creatorUser: "juan.santa",
  //               creationTimestamp: new Date().getTime(),
  //               modifierUser: "juan.santa",
  //               modificationTimestamp: new Date().getTime(),
  //               generalInfo: {
  //                 licensePlate: vehicle.plate,
  //                 model: 2014,
  //                 brand: "MAZDA",
  //                 line: 'SPORT'
  //               },
  //               features: {
  //                 fuel: 'GASOLINE',
  //                 capacity: 4,
  //                 oters: [{name: "AC", active: true}, { name: "PETS", active: false }]
  //               },
  //               blockings: [],
  //               state: true,
  //               businessId: 'q1w2-e3-r4t5-y6u7-u7i8'
  //             },
  //             user: "juan.santa",
  //             timestamp: Date.now(),
  //             av: 164
  //           })
  //           .pipe(
  //             delay(200)
  //           )
  //         ), 
  //         delay(500),
  //         toArray(),
  //         tap(r => console.log(r)),
  //       )
  //       .subscribe(
  //         evt => {},
  //         error => {
  //           console.error(`sent message failded ${error}`);
  //           return done(error);
  //         },
  //         () => done()
  //       );
  //   });

  // });



});