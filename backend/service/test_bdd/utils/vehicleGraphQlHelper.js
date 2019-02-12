'use strict'

const { tap, mergeMap, catchError, map, mapTo, delay, toArray, groupBy, filter } = require('rxjs/operators');
const { Subject, of, from, forkJoin, interval, defer, concat, throwError } = require('rxjs');
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
                businessId: vehicle.businessId
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
                catchError(error => {
                    // lICENSE PLATE ALREADY USED
                    if(error.message.code == 22010){  
                        // console.log(`############## ${vehicle.licensePlate} lICENSE PLATE ALREADY IN DATABASE  ######################`);
                        return of(null);
                    }else{
                        return of(null);
                    }
                }),
                // tap(() => console.log("VEHICLE CREATED"))
            );


    }


    static findByPlate$(graphQlInstance, licensePlate){   
        return of({
            responseFields: "_id",
            queryArgs: {
                filterInput: {
                    licensePlate: licensePlate
                },
                paginationInput: {
                    page: 0,
                    count: 1,
                    sort: 1
                }
            }
        })
            .pipe(
                //   tap(({ responseFields, queryArgs }) => console.log("################################", `mutation{VehicleCreateVehicle(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`, "######################") ),
                mergeMap(({ responseFields, queryArgs }) =>
                    graphQlInstance.executeQuery$(
                        `query{VehicleVehicles(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`

                    )
                    .pipe(
                        mergeMap(response => 
                            response.VehicleVehicles.length == 0
                             ? throwError( new Error("Vehicle no found") )
                             : of(response.VehicleVehicles[0])
                        )
                    )
                ),
                catchError(error => {
                    // lICENSE PLATE ALREADY USED
                    if(error.message == "Vehicle no found"){
                        return of({})
                        .pipe(
                            tap(() => console.log("waiting for vehicle creation")),
                            delay(200),
                            mergeMap(() => this.findByPlate$(graphQlInstance, licensePlate))
                        )  

                    }else{
                        return throwError(error)
                    }
                }),
                // tap(r => console.log("VEHICLUCO ENCONTRADO  ==> ", r))
            );

    }

}
/**
 * @returns {VehicleGraphQlHelper}
 */
module.exports = VehicleGraphQlHelper