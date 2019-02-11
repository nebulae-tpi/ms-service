'use strict'

const { tap, mergeMap, catchError, map, mapTo, delay, toArray, groupBy, filter } = require('rxjs/operators');
const { Subject, of, from, forkJoin, interval, defer, concat, throwError } = require('rxjs');
const uuidv4 = require("uuid/v4");


class DriverGraphQlHelper {

    static createDriver$(graphQlInstance, driver) {
        return of({
          responseFields: "code, message",
          queryArgs: {
            input: {
                generalInfo: {
                    documentType: driver.documentType,
                    document: driver.documentId,
                    name: driver.name,
                    lastname: driver.lastname,
                    email: driver.email,
                    phone: parseInt(driver.phone),
                    languages: driver.languages,
                    gender: driver.gender,
                    pmr: driver.pmr
              },
              state: true,
              businessId: driver.businessId
            }
          }
        }).pipe(
            // tap(({ responseFields, queryArgs }) => console.log("################################", `mutation{DriverCreateDriver(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`, "######################")),
            mergeMap(({ responseFields, queryArgs }) =>
                graphQlInstance.executeQuery$(
                    `mutation{DriverCreateDriver(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`
                )
            ),
            catchError(error => {
                // EMAIL ALREADY USED
                if (error.message.code == 20014) {
                    console.log("##################  EMAIL ALREADY USED  ##########################");
                    console.log(driver.email);
                    console.log("##################################################################");
                    driver.email = `${driver.documentId}@autogen.com`;
                    return this.createDriver$(graphQlInstance, driver);
                }               
                else {
                    console.log("#############################################################################");
                    console.log("#######################  UNEXPECTED EXCEPTION  ##############################");
                    console.log(JSON.stringify(error));
                    console.log("#############################################################################");
                    return throwError(error)
                }
            }),
           
            tap(r => console.log("DRIVER CREATED"))
        );
    }

    static finDriverId$(graphQlInstance, documentId){
        return of({
            responseFields: "_id",
            queryArgs: {
                filterInput: {
                    documentId: documentId
                },
                paginationInput: {
                    page: 0,
                    count: 1,
                    sort: 1
                }
            }
        })
          .pipe(
              mergeMap(({ responseFields, queryArgs }) =>
                  graphQlInstance.executeQuery$(
                      `query{ServiceDrivers(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`
                  )
                      .pipe(
                          catchError(error => {
                              console.log(error);
                              return this.finDriverId$(graphQlInstance, documentId);
                          }),
                          delay(5),
                          map(response => response.ServiceDrivers[0]._id)
                      )
              ),
              tap(r => console.log( "DRIVER ENCONTRADO ==> ", r ))
          );


    }

    static assignVehicle$(graphQlInstance, driverId, vehicleId){
        return of({
            responseFields: "code, message",
            queryArgs: {
                driverId: driverId,
                vehiclePlate: vehicleId
            }
          }).pipe(
            //   tap(({ responseFields, queryArgs }) => console.log("################################", `mutation{ServiceAssignVehicleToDriver(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`, "######################")),
              mergeMap(({ responseFields, queryArgs }) =>
                  graphQlInstance.executeQuery$(
                      `mutation{ServiceAssignVehicleToDriver(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`
                    // `mutation{createAuthor(${graphQlInstance.convertObjectToInputArgs({firstName: "felipe", lastName:"santa"})}){firstName, lastName}}`
                  )                  
              ),
              catchError(error => {
                if(error.message.code == 23011){
                    console.log(error.message.msg)
                    return of(null);
                }else{
                    return throwError(error)
                }
            }),
            tap(() => console.log(`${vehicleId} assigned to `, driverId))
          );

    }

    static createCredentials$(graphQlInstance, driver){
          return of({
            responseFields: "code, message",
            queryArgs: {
                id: driver._id,
                username: driver.username,
                input: {
                    username: driver.username,
                    password: driver.documentId,
                    temporary: false
                }
            }
          }).pipe(
              tap(({queryArgs}) => console.log("CREDENCIALES => ", queryArgs.input) ),
              mergeMap(({ responseFields, queryArgs }) =>
                  graphQlInstance.executeQuery$(
                      `mutation{DriverCreateDriverAuth(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`
                  )                 
              ),
              catchError(error => {
                  // USERNAME ALREADY USED
                  if (error.message.code == 20011) {
                      console.log("############################################");
                      console.log(error.message.msg, driver.username);                      
                      driver.username = `${driver.username}${driver.documentId.substring(driver.documentId.length - 2)}`;
                      console.log("TRYING WITH  ==> ", driver.username);
                      console.log("############################################");
                      return this.createCredentials$(graphQlInstance, driver);
                  }
                  console.log("#############################################################################");
                  console.log("#######################  UNEXPECTED EXCEPTION  ##############################");
                  console.log(JSON.stringify(error));
                  console.log("#############################################################################");
                  return throwError(error)
              }),
              tap(() => console.log("AUTH WAS CREATED") )
          );
    }

    static removeAuth$(graphQlInstance, driverId){
        return of({
          responseFields: "code, message",
          queryArgs: {
              id: driverId
          }
        }).pipe(
            mergeMap(({ responseFields, queryArgs }) =>
                graphQlInstance.executeQuery$(
                    `mutation{DriverRemoveDriverAuth(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`
                )
                .pipe(                  
                    catchError(error => {
                        console.log("#############################################################################");
                        console.log("#######################  UNEXPECTED EXCEPTION  ##############################");
                        console.log(JSON.stringify(error));
                        console.log("#############################################################################");
                        return throwError(error)
                    })

                )                
            ),
            tap(() => console.log( driverId, "AUTH REMOVED"))
        );
  }
}
/**
 * @returns {DriverGraphQlHelper}
 */
module.exports = DriverGraphQlHelper