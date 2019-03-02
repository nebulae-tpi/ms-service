'use strict'

const { of, Observable, bindNodeCallback } = require('rxjs');
const { map, tap, mergeMap, switchMapTo } = require('rxjs/operators');

const broker = require("../../broker/BrokerFactory")();
const RoleValidator = require('../../tools/RoleValidator');

const INTERNAL_SERVER_ERROR_CODE = 23001;
const USERS_PERMISSION_DENIED_ERROR_CODE = 23002;

function getResponseFromBackEnd$(response) {
  return of(response).pipe(
    map(resp => {
      if (resp.result.code != 200) {
        const err = new Error();
        err.name = 'Error';
        err.message = resp.result.error;
        // this[Symbol()] = resp.result.error;
        Error.captureStackTrace(err, 'Error');
        throw err;
      }
      return resp.data;
    }));
}



module.exports = {

  Query: {
    DriverAssignedVehicles: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'DriverAssignedVehicles', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['DRIVER']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Driver", "drivergateway.graphql.query.DriverAssignedVehicles", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    OpenShift: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'OpenShift', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['DRIVER']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Shift", "drivergateway.graphql.query.OpenShift", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    AssignedService: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'AssignedService', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['DRIVER']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "drivergateway.graphql.query.AssignedService", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    HistoricalDriverServices: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'HistoricalDriverServices', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['DRIVER']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "drivergateway.graphql.query.HistoricalDriverServices", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
  },

  Mutation: {
    startShift: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'startShift', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['DRIVER']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Shift", "drivergateway.graphql.mutation.startShift", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    stopShift: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'stopShift', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['DRIVER']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Shift", "drivergateway.graphql.mutation.stopShift", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    setShiftState: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'setShiftState', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['DRIVER']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Shift", "drivergateway.graphql.mutation.setShiftState", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    acceptServiceOffer: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'acceptServiceOffer', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['DRIVER']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "drivergateway.graphql.mutation.acceptServiceOffer", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

  },
}
