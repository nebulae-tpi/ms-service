// TEST LIBS
const assert = require("assert");
const uuidv4 = require("uuid/v4");
const expect = require("chai").expect;

const fs = require('fs');   
const es = require('event-stream');

const FILE_PATH = './test_bdd/errors_191502_data.csv';

const KeyCloak = require('./utils/Keycloak');
const GraphQL = require('./utils/GraphQl');
const graphQL = new GraphQL();
const keyCloak = new KeyCloak();

const DriverGraphQlHelper = require("./utils/driverGraphQlHelper");
const VehicleGraphQlHelper = require("./utils/vehicleGraphQlHelper");

const getRxDefaultSubscription = (evtText, done) => {
    return [
        (evt) => console.log(`${evtText}: ${JSON.stringify(evt)}`),
        (error) => { console.error(error); done(error); },
        () => done()
    ];
};


const { take, mergeMap, map, tap,delay, toArray, reduce, concatMap, filter, catchError } = require("rxjs/operators");
const {forkJoin, of, interval, concat, from, observable, bindNodeCallback, defer, range, merge, throwError } = require("rxjs");


describe("BDD - MAIN TEST", function() {
  /*
  * PREAPARE
  */
    describe("Logging to Keycloak, conect GraphQl client", function () {

        it('Logging to Keycloak, conect GraphQl client ', function (done) {
            this.timeout(20000);
            merge(
                keyCloak.logIn$().pipe(
                    tap(() => {
                        console.log("###########################################################################");
                        console.log(keyCloak.jwt);
                        console.log("###########################################################################");
                        graphQL.jwt = keyCloak.jwt;
                    }),
                    mergeMap(() => graphQL.connect$()),
                    mergeMap(() => graphQL.testConnection$()),
                ),
                // broker.start$()

            ).subscribe(...getRxDefaultSubscription('Prepare:connect hardware and servers', done));
        });

      
    });

    describe("Read CSV file and process it", function () {

        it("start service backend and its Database", function (done) {
            this.timeout(6000000);
            const DriverMapperHelper = require("./utils/driverMapperHelper");
            const BUSINESS_ID = "4ab03a09-9e34-40fe-9102-25cc6b5b2176";

            return defer(() => {
                const that = this;
                return new Promise((resolve, reject) => {
                    const documentIds = [];
                    const inputStream = fs.createReadStream(`${FILE_PATH}`, 'utf8')
                        .pipe(es.split())
                        .pipe(es.mapSync(function (line) {
                            inputStream.pause();
                            let lineSplited = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/);
                            lineSplited = lineSplited.map(i => i.trim());
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
                                        : DriverMapperHelper.mapToDriverVehicleObj$(driverVehicleInfo, BUSINESS_ID )
                                            .pipe(
                                                tap(({ driver }) =>
                                                    console.log(`######################### ${driver.documentId} ${driver.name} ${driver.lastname} ########################`)
                                                ),

                                                // TO REMOVE DRIVER AUTH

                                                // mergeMap(({driver, vehicle}) => DriverGraphQlHelper.finDriverId$(graphQL, driver.documentId)),
                                                // mergeMap(driverId => DriverGraphQlHelper.removeAuth$(graphQL, driverId)
                                                //     .pipe(
                                                //         delay(20),
                                                //         catchError(e => of('ERROR', JSON.stringify(e)))

                                                //     )
                                                // ),

                                                // TO INSER DRIVER, VEHICLES, ASSIGN VEHICLES AND  DRIVER AUTH
                                               
                                                mergeMap(({driver, vehicle}) => forkJoin(
                                                    DriverGraphQlHelper.createOrUpdateDriver$(graphQL, driver),
                                                    VehicleGraphQlHelper.createVehicle$(graphQL, vehicle),
                                                    of({vehicle, driver})
                                                )),
                                                mergeMap(([ driverEdited, b, { vehicle, driver }]) =>
                                                    VehicleGraphQlHelper.findByPlate$(graphQL, vehicle.licensePlate)                                                   
                                                    .pipe(
                                                        // tap(() => driverEdited ? console.log('DRIVER EDITED') : console.log('DRIVER CREATED')),
                                                        mergeMap(() => driverEdited 
                                                            ? of(driverEdited) 
                                                            : DriverGraphQlHelper.finDriverId$(graphQL, driver.documentId) 
                                                        ),
                                                        map( driverId => ({ driver: { ...driver, _id: driverId }, vehicle: vehicle  }))
                                                    )
                                                ),
                                                mergeMap(({ vehicle, driver }) => forkJoin(                                                    
                                                    DriverGraphQlHelper.assignVehicle$(graphQL, driver._id, vehicle.licensePlate),
                                                    DriverGraphQlHelper.createCredentials$(graphQL, driver)
                                                )),

                                                 tap(() => console.log("========================================================================================= \n")),
                                                // delay(2000)

                                            )
                                    ),

                                ).subscribe(() => inputStream.resume(), err => reject(err), () => { })
                        })
                            .on('error', function (err) { reject(err); })
                            .on('end', function () {
                                console.log(`\n \n ${documentIds.length} DOCUMENTS WERE PROCESSED`);
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