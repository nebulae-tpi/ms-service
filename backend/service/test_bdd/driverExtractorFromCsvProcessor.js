// TEST LIBS
const assert = require("assert");
const uuidv4 = require("uuid/v4");
const expect = require("chai").expect;

const fs = require('fs');   
const es = require('event-stream');

const FILE_PATH = './test_bdd/driverVsVehicles.csv';

const KeyCloak = require('./Keycloak');
const GraphQL = require('./GraphQl');
const graphQL = new GraphQL();
const keyCloak = new KeyCloak();

const DriverGraphQlHelper = require("./driverGraphQlHelper");
const VehicleGraphQlHelper = require("./vehicleGraphQlHelper");

const getRxDefaultSubscription = (evtText, done) => {
    return [
        (evt) => console.log(`${evtText}: ${JSON.stringify(evt)}`),
        (error) => { console.error(error); done(error); },
        () => done()
    ];
};


const { take, mergeMap, map, tap,delay, toArray, reduce, concatMap, filter, catchError } = require("rxjs/operators");
const {forkJoin, of, interval, concat, from, observable, bindNodeCallback, defer, range, merge, throwError } = require("rxjs");

//LIBS FOR TESTING
const MqttBroker = require("../bin/tools/broker/MqttBroker");
const MongoDB = require("../bin/data/MongoDB").MongoDB;

let DriverDA = undefined;
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

        it("start MQTT broker", function (done) {
            broker = new MqttBroker({
                mqttServerUrl: process.env.MQTT_SERVER_URL,
                replyTimeout: process.env.REPLY_TIMEOUT || 2000
            });
            done();
        });

        it('Logging to Keycloak, conect GraphQl client ', function (done) {
            this.timeout(5000);
            merge(
                keyCloak.logIn$().pipe(
                    tap(() => graphQL.jwt = keyCloak.jwt),
                    mergeMap(() => graphQL.connect$()),
                    mergeMap(() => graphQL.testConnection$()),
                ),
                // broker.start$()

            ).subscribe(...getRxDefaultSubscription('Prepare:connect hardware and servers', done));
        });

        it("start service backend and its Database", function (done) {
            this.timeout(60000);
            Object.keys(environment).forEach(envKey => {
                process.env[envKey] = environment[envKey];
                console.log(`env var set => ${envKey}:${process.env[envKey]}`);
            });

            const eventSourcing = require("../bin/tools/EventSourcing")();
            const eventStoreService = require("../bin/services/event-store/EventStoreService")();
            DriverDA = require("../bin/data/DriverDA");
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
                            VehicleDA.start$()
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
        });

      
    });

    describe("Read CSV file and process it", function () {

        it("start service backend and its Database", function (done) {
            this.timeout(600000);
            const DriverMapperHelper = require("./driverMapperHelper");

            return defer(() => {
                const that = this;
                return new Promise((resolve, reject) => {
                    const documentIds = [];
                    const inputStream = fs.createReadStream(`${FILE_PATH}`, 'utf8')
                        .pipe(es.split())
                        .pipe(es.mapSync(function (line) {
                            inputStream.pause();
                            const lineSplited = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/);
                            lineSplited.map(i => i.trim());
                            of(lineSplited)
                                .pipe(
                                    map(lineSplited => {
                                        if (!documentIds.includes(lineSplited[3])) {
                                            documentIds.push(lineSplited[3]);
                                            return lineSplited;
                                        } else {
                                            console.log(`${lineSplited[3]} already processed`)
                                            return null;
                                        }
                                    }),
                                    mergeMap(driverVehicleInfo => driverVehicleInfo === null
                                        ? of({})
                                        : DriverMapperHelper.mapToDriverVehicleObj$(driverVehicleInfo)
                                            .pipe(
                                                mergeMap(({driver, vehicle}) => forkJoin(
                                                    DriverGraphQlHelper.createDriver$(graphQL, driver)
                                                        .pipe(
                                                            catchError(error => {
                                                                if(error.message.code == 22010){
                                                                    console.log(error.message.msg)
                                                                    return of(null);
                                                                }else{
                                                                    return throwError(error)
                                                                }
                                                               
                                                            })
                                                        ),
                                                    VehicleGraphQlHelper.createVehicle$(graphQL, vehicle)
                                                        .pipe(
                                                            catchError(error => {
                                                                if(error.message.code == 22010){
                                                                    console.log(error.message.msg)
                                                                    return of(null);
                                                                }else{
                                                                    return throwError(error)
                                                                }
                                                            })
                                                        ),
                                                    of({vehicle, driver})
                                                )),
                                                delay(100),
                                                mergeMap( ([a,b, { vehicle, driver }]) => forkJoin(
                                                    DriverGraphQlHelper.assignVehicle$(graphQL, driver._id, vehicle.licensePlate),
                                                    DriverGraphQlHelper.createCredentials$(graphQL, driver)
                                                )),
                                                delay(100)

                                            )
                                    ),

                                ).subscribe(() => inputStream.resume(), err => reject(err), () => { })
                        })
                            .on('error', function (err) { reject(err); })
                            .on('end', function () {
                                console.log("TERMINA ACA");
                                resolve({});
                            })
                        )
                });
            })
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

});