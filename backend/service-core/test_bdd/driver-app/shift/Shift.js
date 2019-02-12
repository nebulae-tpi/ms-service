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


    constructor() {
        throw new Error('DO NOT INSTANCE!!!');
    }

    static startShift$(user, vehiclePlate, deviceIdentifier, expectError = false) {
        const query =
            `mutation {
                startShift( ${user.graphQL.convertObjectToInputArgs({ vehiclePlate, deviceIdentifier })} ){
                    accepted
                }
            }`;
        return user.graphQL.executeQuery$(query).pipe(
            catchError(error => {
                if (expectError) {
                    return Rx.empty();
                }
                Rx.throwError(new Error(`Failed to startShift, asError: << ${error} >>   JSON: ${JSON.stringify(error)}`))
            }
            ),
            tap(({ startShift }) => expect(startShift).to.not.be.undefined),
            tap(({ startShift }) => expect(startShift.accepted).to.be.true),
            map(({ startShift }) => startShift.accepted),
            tap(accepted => console.log(`startShift command send and ackwoneldged by server: ${accepted}`))
        );
    }

    static stopShift$(user) {
        const query =
            `mutation {
                stopShift{
                    accepted
                }
            }`;
        return user.graphQL.executeQuery$(query).pipe(
            catchError(error => {
                console.log(JSON.stringify(error, null, 1));

                if (error.extensions.exception.message.code !== 23020) {
                    throw new Error(`Failed to stop shift, asError: << ${error} >>   JSON: ${JSON.stringify(error)}`);
                }
                return Rx.of({ stopShift: { accepted: true } });
            }),
            tap(({ stopShift }) => expect(stopShift).to.not.be.undefined),
            tap(({ stopShift }) => expect(stopShift.accepted).to.be.true),
            map(({ stopShift }) => stopShift),
            tap(accepted => console.log(`stopShift command send and ackwoneldged by server: ${accepted}`))
        );
    }


    static setShiftState$(user, state) {
        const query =
            `mutation {
                setShiftState( ${user.graphQL.convertObjectToInputArgs({ state })} ){
                    accepted
                }
            }`;
        return user.graphQL.executeQuery$(query).pipe(
            catchError(error => Rx.throwError(new Error(`Failed to setShiftState, asError: << ${error} >>   JSON: ${JSON.stringify(error)}`))),
            tap(({ setShiftState }) => expect(setShiftState).to.not.be.undefined),
            tap(({ setShiftState }) => expect(setShiftState.accepted).to.be.true),
            map(({ setShiftState }) => setShiftState.accepted),
            tap(accepted => console.log(`setShiftState command send and ackwoneldged by server: ${accepted}`))
        );
    }

    static queryOpenShift$(user, args) {
        const query =
            `query{
                OpenShift( ${user.graphQL.convertObjectToInputArgs(args)} ){
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
        return user.graphQL.executeQuery$(query).pipe(
            catchError(error => Rx.throwError(new Error(`Failed to startShift, asError: << ${error} >>   JSON: ${JSON.stringify(error)}`))),
            tap(({ OpenShift }) => expect(OpenShift).to.not.be.undefined),
            map(({ OpenShift }) => OpenShift),
            tap(OpenShift => console.log(`query OpenShift: ${OpenShift}`))
        );
    }

}

module.exports = Shift;