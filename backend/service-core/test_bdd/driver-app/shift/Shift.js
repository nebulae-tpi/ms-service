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

class Shift {

    /**
     * @param {GraphQL} graphQL 
     */
    constructor(graphQL) {
        this.graphQL = graphQL;
    }

    startShift$(vehiclePlate) {
        const query =
            `mutation {
                startShift( ${this.graphQL.convertObjectToInputArgs({ vehiclePlate })} ){
                    accepted
                }
            }`;
        return this.graphQL.executeQuery$(query).pipe(
            catchError(error => Rx.throwError(new Error(`Failed to startShift, asError: << ${error} >>   JSON: ${JSON.stringify(error)}`))),
            tap(({ startShift }) => expect(startShift).to.not.be.undefined),
            tap(({ startShift }) => expect(startShift.accepted).to.be.true),
            map(({ startShift }) => startShift.accepted),
            tap(accepted => console.log(`startShift command send and ackwoneldged by server: ${accepted}`))
        );
    }

    stopShift$() {
        const query =
            `mutation {
                stopShift{
                    accepted
                }
            }`;
        return this.graphQL.executeQuery$(query).pipe(
            catchError(error => Rx.throwError(new Error(`Failed to startShift, asError: << ${error} >>   JSON: ${JSON.stringify(error)}`))),
            tap(({ stopShift }) => expect(stopShift).to.not.be.undefined),
            tap(({ stopShift }) => expect(stopShift.accepted).to.be.true),
            map(({ stopShift }) => stopShift.accepted),
            tap(accepted => console.log(`stopShift command send and ackwoneldged by server: ${accepted}`))
        );
    }


    setShiftState$(state) {
        const query =
            `mutation {
                setShiftState( ${this.graphQL.convertObjectToInputArgs({ state })} ){
                    accepted
                }
            }`;
        return this.graphQL.executeQuery$(query).pipe(
            catchError(error => Rx.throwError(new Error(`Failed to startShift, asError: << ${error} >>   JSON: ${JSON.stringify(error)}`))),
            tap(({ setShiftState }) => expect(setShiftState).to.not.be.undefined),
            tap(({ setShiftState }) => expect(setShiftState.accepted).to.be.true),
            map(({ setShiftState }) => setShiftState.accepted),
            tap(accepted => console.log(`setShiftState command send and ackwoneldged by server: ${accepted}`))
        );
    }

    queryOpenShift$() {
        const query =
            `query{
                OpenShift{
                 state,
                  vehicle{
                    plate,
                    blocks{
                      key,
                      notes,
                      startTime,
                      endTime
                    },
                    active
                  },
                  driver{
                    fullname,
                    username,
                    active,
                    blocks{
                      key,
                      notes,
                      startTime,
                      endTime
                    }
                  }
                }
              }`;
        return this.graphQL.executeQuery$(query).pipe(
            catchError(error => Rx.throwError(new Error(`Failed to startShift, asError: << ${error} >>   JSON: ${JSON.stringify(error)}`))),
            tap(({ OpenShift }) => expect(OpenShift).to.not.be.undefined),
            map(({ OpenShift }) => OpenShift),
            tap(OpenShift => console.log(`query OpenShift: ${OpenShift}`))
        );
    }

}

module.exports = Shift;