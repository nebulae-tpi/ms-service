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


const READ_WRITE_ROLES = ["OPERATOR", "OPERATION-SUPERVISOR"];
const READ_ROLES = ["PLATFORM-ADMIN", "BUSINESS-OWNER", "OPERATOR", "OPERATION-SUPERVISOR"];

module.exports = {

  Query: {
    IOEService: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'IOEService', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', READ_ROLES).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.query.IOEService", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
    IOEServices: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'IOEServices', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', READ_ROLES).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.query.IOEServices", { root, args, jwt: context.encodedToken }, 3000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
  },


  Mutation: {
    IOERequestService: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'v', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', READ_WRITE_ROLES).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.mutation.IOERequestService", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    IOECancelService: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'v', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', READ_WRITE_ROLES).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.mutation.IOECancelService", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    IOEAssignService: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'v', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', READ_WRITE_ROLES).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.mutation.IOEAssignService", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },


    IOEReportServicePickupETA: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'v', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', READ_WRITE_ROLES).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.mutation.IOEReportServicePickupETA", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    IOEReportServiceAsArrived: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'v', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', READ_WRITE_ROLES).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.mutation.IOEReportServiceAsArrived", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    IOEReportServiceAsPickedUp: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'v', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', READ_WRITE_ROLES).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.mutation.IOEReportServiceAsPickedUp", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    IOEReportServiceAsCompleted: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'v', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', READ_WRITE_ROLES).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.mutation.IOEReportServiceAsCompleted", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
  },
}




