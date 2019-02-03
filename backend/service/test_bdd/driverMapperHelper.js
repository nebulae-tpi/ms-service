'use strict'

const { tap, mergeMap, catchError, map, mapTo, delay, toArray, groupBy, filter } = require('rxjs/operators');
const { Subject, of, from, forkJoin, interval, defer, concat } = require('rxjs');
const fs = require('fs');
const CsvReadableStream = require('csv-reader');     
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
            const inputStream = fs.createReadStream(`${FILE_PATH}`, 'utf8')
                .pipe(es.split())
                .pipe(es.mapSync(function (line) {
                    inputStream.pause();
                    var regex = /(\s*'[^']+'|\s*[^,]+)(?=,|$)/g;
                    var lineSplited = line.replace( /"/g, "'" ).match(regex);
                    lineSplited.forEach((v, i) => lineSplited[i] = v.trim())

                    of(lineSplited)
                        .pipe(
                            mergeMap((line) => that.mapToDriverVehicleObj$(line) ),
                            tap(t => console.log(t)),
                            // tap(t => console.log(t.vehicle.fuelType + "---" + t.vehicle.features))
                            
                        ).subscribe(() => inputStream.resume(), err => reject(err), () => { })

                        // var inputStream = fs.createReadStream(FILE_PATH, 'utf8');            
                        // inputStream
                        //     .pipe(CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true }))
                        //     .on('data', function (row) {
                        //         inputStream.pause();
                        //         console.log('A row arrived: ', row);
                        //     })
                        //     .on('end', function (data) {
                        //         console.log('No more rows!');
                        //         console.log("TERMINA ACA");
                        //         resolve({});
                        //     });
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
        .pipe(
            delay(1000)
        )
    }
}
/**
 * @returns {DriverMapperHelper}
 */
module.exports = DriverMapperHelper