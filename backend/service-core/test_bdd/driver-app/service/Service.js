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

class Service {


  constructor() {
    throw new Error('DO NOT INSTANCE!!!');
  }

  static requestService$(user, args) {
    const query =
      `mutation {
              ServiceCoreRequestService(${user.graphQL.convertObjectToInputArgs(args)}
              ) {
                accepted
              }
            }
            `;
    return user.graphQL.executeQuery$(query).pipe(
      catchError(error => Rx.throwError(new Error(`Failed to ServiceCoreRequestService, asError: << ${error} >>   JSON: ${JSON.stringify(error)}`))),
      tap(({ ServiceCoreRequestService }) => expect(ServiceCoreRequestService).to.not.be.undefined),
      tap(({ ServiceCoreRequestService }) => expect(ServiceCoreRequestService.accepted).to.be.true),
      map(({ ServiceCoreRequestService }) => ServiceCoreRequestService),
      tap(accepted => console.log(`ServiceCoreRequestService command send and ackwoneldged by server: ${accepted}`))
    );
  }


  static acceptServiceOffer$(user, args) {
    const query =
      `mutation {
        acceptServiceOffer(${user.graphQL.convertObjectToInputArgs(args)}
              ) {
                accepted
              }
            }
            `;
    return user.graphQL.executeQuery$(query).pipe(
      catchError(error => Rx.throwError(new Error(`Failed to acceptServiceOffer, asError: << ${error} >>   JSON: ${JSON.stringify(error)}`))),
      tap(({ acceptServiceOffer }) => expect(acceptServiceOffer).to.not.be.undefined),
      tap(({ acceptServiceOffer }) => expect(acceptServiceOffer.accepted).to.be.true),
      map(({ acceptServiceOffer }) => acceptServiceOffer),
      tap(accepted => console.log(`acceptServiceOffer command send and ackwoneldged by server: ${accepted}`))
    );
  }


  static queryAssignedService$(user, expectNull = false) {
    const query =
      `query{
                AssignedService{
                  _id,
                  timestamp,
                  client{
                    fullname,
                    tip,
                    tipType
                  },
                  pickUp{
                    marker{
                      lat,lng
                    },
                    polygon{
                      lat,lng
                    },
                    city,zone,neighborhood,addressLine1,addressLine1,addressLine2,notes
                  },
                  dropOff{
                    marker{
                      lat,lng
                    },
                    polygon{
                      lat,lng
                    },
                    city,zone,neighborhood,addressLine1,addressLine1,addressLine2,notes
                  },
                  verificationCode,
                  requestedFeatures,
                  paymentType,
                  fareDiscount,
                  fare,
                  tip,
                  route{lat,lng},
                  state
                }
              }`;
    return user.graphQL.executeQuery$(query).pipe(
      catchError(error => Rx.throwError(new Error(`Failed to queryAssignedService, asError: << ${error} >>   JSON: ${JSON.stringify(error, null, 2)}`))),
      tap(({ AssignedService }) => { expectNull ? expect(AssignedService).to.not.exist : expect(AssignedService).to.exist; }),
      map(({ AssignedService }) => AssignedService),
      tap(AssignedService => console.log(`query AssignedService: ${AssignedService}`))
    );
  }



  static queryHistoricalService$(user, expectNull = false) {
    const query =
      `query{
                AssignedService{
                  _id,
                  timestamp,
                  client{
                    fullname,
                    tip,
                    tipType
                  },
                  pickUp{
                    marker{
                      lat,lng
                    },
                    polygon{
                      lat,lng
                    },
                    city,zone,neighborhood,addressLine1,addressLine1,addressLine2,notes
                  },
                  dropOff{
                    marker{
                      lat,lng
                    },
                    polygon{
                      lat,lng
                    },
                    city,zone,neighborhood,addressLine1,addressLine1,addressLine2,notes
                  },
                  verificationCode,
                  requestedFeatures,
                  paymentType,
                  fareDiscount,
                  fare,
                  tip,
                  route{lat,lng},
                  state
                }
              }`;
    return user.graphQL.executeQuery$(query).pipe(
      catchError(error => Rx.throwError(new Error(`Failed to queryAssignedService, asError: << ${error} >>   JSON: ${JSON.stringify(error, null, 2)}`))),
      tap(({ OpenShift }) => { expectNull ? expect(OpenShift).to.be.undefined : expect(OpenShift).to.not.be.undefined; }),
      map(({ OpenShift }) => OpenShift),
      tap(OpenShift => console.log(`query OpenShift: ${OpenShift}`))
    );
  }

}

module.exports = Service;