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
    ServiceCoreService: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'ServiceCoreService', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN" , "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE"]).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.query.ServiceCoreService", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
  },

  
  Mutation: {
    ServiceCoreRequestService: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'v', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN" , "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE"]).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.mutation.ServiceCoreRequestService", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
  },
}




