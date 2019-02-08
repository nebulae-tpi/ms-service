'use strict'

const expect = require('chai').expect
const uuidv4 = require('uuid/v4');
const Rx = require('rxjs');
const {
    tap,
    switchMap,
    delay,
    filter,
    map,
    first,
    mapTo,
    mergeMap,
    concatMap,
    catchError,
    last
} = require('rxjs/operators');

const GraphQL = require('../../GraphQL');

class Driver {
    
    constructor() {
        throw new Error('DO NOT INSTANCE!!!');
    }



    static queryDriverAssignedVehicles$(user) {
        const query =
            `query{
                DriverAssignedVehicles{
                  plate, 
                  blocks{
                    key,notes,startTime,endTime
                  },
                  active
                }
              }`;
        return user.graphQL.executeQuery$(query).pipe(
            catchError(error => Rx.throwError(new Error(`Failed to query DriverAssignedVehicles, Error: << ${error} >>   JSON: ${JSON.stringify(error)}`))),
            tap(({ DriverAssignedVehicles }) => expect(DriverAssignedVehicles).to.not.be.undefined),
            tap(({ DriverAssignedVehicles }) => expect(DriverAssignedVehicles).to.not.be.empty),
            map(({ DriverAssignedVehicles }) => DriverAssignedVehicles),
            tap(accepted => console.log(`startShift command send and ackwoneldged by server: ${JSON.stringify(accepted)}`))
        );
    }

}

module.exports = Driver;