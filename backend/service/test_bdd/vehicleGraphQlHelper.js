'use strict'

const { tap, mergeMap, catchError, map, mapTo, delay, toArray, groupBy, filter } = require('rxjs/operators');
const { Subject, of, from, forkJoin, interval, defer, concat } = require('rxjs');
const uuidv4 = require("uuid/v4");


class VehicleGraphQlHelper {

    static createVehicle$(graphQlInstance, vehicle) {
        return of({
            responseFields: "code, message",
            queryArgs: {
              input: {
                  generalInfo: {
                      licensePlate: vehicle.licensePlate,
                      model: parseInt(vehicle.model),
                      brand: vehicle.brand,
                      line: vehicle.line
                },                
                state: true,
                features: {
                    fuel: vehicle.fuelType,
                    capacity: vehicle.capacity,
                    others: vehicle.features
                },
                blockings: [],                
                businessId: "q1w2-e3r4-t5y6-u7i8-o9p0"
              }
            }
          })
            .pipe(
                //   tap(({ responseFields, queryArgs }) => console.log("################################", `mutation{VehicleCreateVehicle(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`, "######################") ),
                mergeMap(({ responseFields, queryArgs }) =>
                    graphQlInstance.executeQuery$(
                        `mutation{VehicleCreateVehicle(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`
                        // `mutation{createAuthor(${graphQlInstance.convertObjectToInputArgs({firstName: "felipe", lastName:"santa"})}){firstName, lastName}}`

                    )
                ),
            );


    }
}
/**
 * @returns {VehicleGraphQlHelper}
 */
module.exports = VehicleGraphQlHelper