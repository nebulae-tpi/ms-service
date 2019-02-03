'use strict'

const { tap, mergeMap, catchError, map, mapTo, delay, toArray, groupBy, filter } = require('rxjs/operators');
const { Subject, of, from, forkJoin, interval, defer, concat } = require('rxjs');
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
                    gender: "M",
                    pmr: driver.pmr
              },
              state: true,
              businessId: "q1w2-e3r4-t5y6-u7i8-o9p0"
            }
          }
        }).pipe(
            // tap(({ responseFields, queryArgs }) => console.log("################################", `mutation{DriverCreateDriver(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`, "######################")),
            mergeMap(({ responseFields, queryArgs }) =>
                graphQlInstance.executeQuery$(
                    `mutation{DriverCreateDriver(${graphQlInstance.convertObjectToInputArgs(queryArgs)}){${responseFields}}}`
                    // `mutation{createAuthor(${graphQlInstance.convertObjectToInputArgs({firstName: "felipe", lastName:"santa"})}){firstName, lastName}}`

                )
            )
        );
    }

    static assignVehicle$(graphQlInstance, driverId, vehicleId){
        return graphQlInstance.executeQuery$(`query{ author{id} }`)
            .pipe(
                tap(r => console.log("RESPONSE ==> ", r))
                // tap(({ CivicaCardReloadReaderKey }) => expect(CivicaCardReloadReaderKey.key).to.be.equal('65,67,82,49,50,53,53,85,45,74,49,32,65,117,116,104'))
            )
        // .subscribe(...getRxDefaultSubscription('Civica Card Reload Conversation:Create & retrieve conversation', done))

    }

    static createCredentials$(graphQlInstance, driverInfo){
        return graphQlInstance.executeQuery$(`query{ author{id} }`)
            .pipe(
                tap(r => console.log("RESPONSE ==> ", r))
                // tap(({ CivicaCardReloadReaderKey }) => expect(CivicaCardReloadReaderKey.key).to.be.equal('65,67,82,49,50,53,53,85,45,74,49,32,65,117,116,104'))
            )
        // .subscribe(...getRxDefaultSubscription('Civica Card Reload Conversation:Create & retrieve conversation', done))
    }
}
/**
 * @returns {DriverGraphQlHelper}
 */
module.exports = DriverGraphQlHelper