'use strict'

const { tap, mergeMap, catchError, map, mapTo, delay, toArray, groupBy, filter } = require('rxjs/operators');
const { Subject, of, from, forkJoin, interval, defer, concat } = require('rxjs');
const fs = require('fs');
const es = require('event-stream');
const broker = require("../bin/tools/broker/BrokerFactory")();
const FILE_PATH = './test_bdd/driverVsVehicles.csv';


class DriverMapperHelper {

    static processFile$() {
        const that = this;

        // fs.readdir(FILE_PATH, (err, files) => {
        //     files.forEach(file => {
        //       console.log(file);
        //     });
        //   });

        return new Promise((resolve, reject) => {
            let lines = [];
            // console.log('LAs lineas totales son ', totalLines);
            var s = fs.createReadStream(`${FILE_PATH}`)
                .pipe(es.split())
                .pipe(es.mapSync(function (line) {
                    s.pause();
                    const lineSplited = line.split(',');
                    lineSplited.forEach((v, i) => lineSplited[i] = v.trim());

                    of(lineSplited)
                        .pipe(
                            mergeMap((line) => that.mapToDriverVehicleObj$(line) ),
                            tap(t => console.log(t)),
                            // tap(t => console.log(t.vehicle.fuelType + "---" + t.vehicle.features))
                            
                        ).subscribe(() => s.resume(), err => reject(err), () => { })



                })
                    .on('error', function (err) { reject(err); })
                    .on('end', function () {
                        console.log("TERMINA ACA");
                        resolve({});
                    })
                )


        });
    }

    static mapToDriverVehicleObj$(lineAsArray){
        return of({
            driver: {
                name: lineAsArray[1],
                lastname: lineAsArray[2],
                documentId: lineAsArray[3],
                email: lineAsArray[4],
                phone: lineAsArray[5],
                languages: lineAsArray[6] !== '' ? ['EN'] : []
            },
            vehicle: {
                licensePlate: lineAsArray[7].toUpperCase(),
                brand: lineAsArray[8],
                line: lineAsArray[9],
                model: lineAsArray[10],
                fuelType: lineAsArray[11],
                features: lineAsArray[12]
            }
        })
    }
}
/**
 * @returns {DriverMapperHelper}
 */
module.exports = DriverMapperHelper