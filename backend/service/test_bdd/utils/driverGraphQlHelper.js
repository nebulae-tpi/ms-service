'use strict'

const { tap, mergeMap, catchError, map, mapTo, delay, toArray, groupBy, filter } = require('rxjs/operators');
const { Subject, of, from, forkJoin, interval, defer, concat, throwError } = require('rxjs');
const uuidv4 = require("uuid/v4");
const util = require('util');


class DriverGraphQlHelper {

  static createOrUpdateDriver$(graphQlInstance, driver) {
    return this.finDriverId$(graphQlInstance, driver.documentId).pipe(
      mergeMap(driverIdFound => driverIdFound
          ? this.updateDriverGeneralInfo$(graphQlInstance, driverIdFound, driver)
          : this.createDriver$(graphQlInstance, driver)          
      )
    );
  }

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
                console.log(driver.documentId, driver.name, driver.lastname);
                console.log("#############################################################################");
                return of(null)
            }
        }),

        // tap(r => console.log("DRIVER CREATED")),
        mergeMap(() => of(null) )
    );
  }

  static updateDriverGeneralInfo$(graphQlInstance, driverId, driver){
    return of({
        responseFields: "code, message",
        queryArgs: {
            id: driverId,
            input: {
                documentType: driver.documentType,
                document: driver.documentId,
                name: driver.name,
                lastname: driver.lastname,
                email: driver.email,
                phone: parseInt(driver.phone),
                languages: driver.languages,
                gender: driver.gender,
                pmr: driver.pmr
            }
        }
      }).pipe(
          // tap(({ responseFields, queryArgs }) => console.log("################################", `mutation{DriverCreateDriver(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`, "######################")),
          mergeMap(({ responseFields, queryArgs }) =>
              graphQlInstance.executeQuery$(
                  `mutation{DriverUpdateDriverGeneralInfo(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`
              )
          ),
          catchError(error => {
            console.log("############################################################################");
            console.log("############", driver.documentId, driver.name, driver.lastname, "###########");
            // console.log("###############", JSON.stringify(error), "###############");
            return of(null)
          }),  
          // tap(r => console.log("DRIVER GENERAL INFO UPDATED"))
          mergeMap(() => of(driverId) )
      );

  }

  static finDriverId$(graphQlInstance, documentId) {
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
    }).pipe(
      mergeMap(({ responseFields, queryArgs }) =>
        graphQlInstance
          .executeQuery$(`query{ServiceDrivers(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`)
          .pipe(
            catchError(error => {
              console.log(util.inspect(error, {showHidden: false, depth: null}));
              return of(null);
              // return this.finDriverId$(graphQlInstance, documentId);
            }),
            map(response =>
              response && response.ServiceDrivers && response.ServiceDrivers[0]
                ? response.ServiceDrivers[0]._id
                : undefined
            )
          )
      ),
      // tap(r => console.log("DRIVER ENCONTRADO ==> ", r))
    );
  }

  static assignVehicle$(graphQlInstance, driverId, vehicleId) {
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
          `mutation{ServiceAssignVehicleToDriver(${graphQlInstance.convertObjectToInputArgs(
            queryArgs
          )}){${responseFields}}}`
          // `mutation{createAuthor(${graphQlInstance.convertObjectToInputArgs({firstName: "felipe", lastName:"santa"})}){firstName, lastName}}`
        )
      ),
      catchError(error => {
        // Vehicle license ALREADY ASSIGNED
        if (error.message.code == 23011) {
          return of(null);
        } else {
          console.log("ERROR IN VEHICLE ASSIGNMENT", "VEHICLE_ID: ", vehicleId, "DRIVER_ID: ", driverId);
          return of(null);
        }
      }),
      // tap(() => console.log(`${vehicleId} assigned to `, driverId))
    );
  }



  static createCredentials$(graphQlInstance, driver) {

    return this.removeAuth$(graphQlInstance, driver._id)
      .pipe(
        map(() => ({
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
        })),
        // tap(({ queryArgs }) => console.log("CREDENCIALES => ", queryArgs.input)),
        mergeMap(({ responseFields, queryArgs }) =>
          graphQlInstance.executeQuery$(`mutation{DriverCreateDriverAuth(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`)
        ),
        catchError(error => {
          // USERNAME ALREADY USED
          if (error.message.code == 20011) {
            console.log("#####################  USERNAME ALREADY USED  #######################");
            console.log(error.message.msg, driver.username);
            driver.username = `${driver.username}${driver.documentId.substring(driver.documentId.length - 2)}`;
            console.log("TRYING WITH  ==> ", driver.username);
            console.log("############################################");
            return this.createCredentials$(graphQlInstance, driver);
          }
          console.log("##############  UNEXPECTED EXCEPTION  ##################");
          console.log(JSON.stringify(error));
          this.logUnsuccessfulProcess$(driver);
          console.log( "########################################################" );
          return of(null);
        }),
        // tap(() => console.log("AUTH WAS CREATED"))

      )
  }

  static removeAuth$(graphQlInstance, driverId) {
    return of({
      responseFields: "code, message",
      queryArgs: {
        id: driverId
      }
    }).pipe(
      mergeMap(({ responseFields, queryArgs }) =>
        graphQlInstance
          .executeQuery$(
            `mutation{DriverRemoveDriverAuth(${graphQlInstance.convertObjectToInputArgs(
              queryArgs
            )}){${responseFields}}}`
          )
          .pipe(
            catchError(error => {
              return of(null)
            })
          )
      ),
      // tap(() => console.log(driverId, "AUTH REMOVED"))
    );
  }

  static logUnsuccessfulProcess$(driver){
    console.log("##########################################################");
    console.log("############", driver.documentId, driver.name, driver.lastname, "#########");
    console.log("#########################################################");
  }
}
/**
 * @returns {DriverGraphQlHelper}
 */
module.exports = DriverGraphQlHelper