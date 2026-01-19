'use strict'

const { of, Observable, bindNodeCallback } = require('rxjs');
const { map, tap, mergeMap, switchMapTo, catchError } = require('rxjs/operators');

const broker = require("../../broker/BrokerFactory")();
const RoleValidator = require('../../tools/RoleValidator');
const {handleError$} = require('../../tools/GraphqlResponseTools');
const { ApolloError } = require("apollo-server");

const INTERNAL_SERVER_ERROR_CODE = 23001;
const USERS_PERMISSION_DENIED_ERROR_CODE = 23002;

function getResponseFromBackEnd$(response) {
  return of(response)
  .pipe(
      map(({result, data}) => {            
          if (result.code != 200 && result.error) {
              throw new ApolloError(result.error.msg, result.code, result.error );
          }
          return data;
      })
  );
}
 

module.exports = {

  Query: {
    ServiceCoreService: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'ServiceCoreService', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN" , "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR", ]).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.query.ServiceCoreService", { root, args, jwt: context.encodedToken }, 2000)
        ),        
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
  },

  Mutation: {
    ServiceCoreRequestService: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'v', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN" , "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"]).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.mutation.ServiceCoreRequestService", { root, args, jwt: context.encodedToken }, 2000)
        ),
        catchError(err => handleError$(err, "ServiceCoreRequestService")),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    ServiceCoreCancelService: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'v', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN" , "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"]).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.mutation.ServiceCoreCancelService", { root, args, jwt: context.encodedToken }, 2000)
        ),
        catchError(err => handleError$(err, "ServiceCoreCancelService")),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    ServiceCoreAssignService: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'v', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN" , "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"]).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.mutation.ServiceCoreAssignService", { root, args, jwt: context.encodedToken }, 2000)
        ),
        catchError(err => handleError$(err, "ServiceCoreAssignService")),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    
    ServiceCoreReportServicePickupETA: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'v', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN" , "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"]).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.mutation.ServiceCoreReportServicePickupETA", { root, args, jwt: context.encodedToken }, 2000)
        ),
        catchError(err => handleError$(err, "ServiceCoreReportServicePickupETA")),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    ServiceCoreReportServiceAsArrived: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'v', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN" , "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"]).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.mutation.ServiceCoreReportServiceAsArrived", { root, args, jwt: context.encodedToken }, 2000)
        ),
        catchError(err => handleError$(err, "ServiceCoreReportServiceAsArrived")),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    ServiceCoreReportServiceAsPickedUp: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'v', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN" , "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"]).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.mutation.ServiceCoreReportServiceAsPickedUp", { root, args, jwt: context.encodedToken }, 2000)
        ),
        catchError(err => handleError$(err, "ServiceCoreReportServiceAsPickedUp")),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },

    ServiceCoreReportServiceAsCompleted: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'v', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN" , "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"]).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "emigateway.graphql.mutation.ServiceCoreReportServiceAsCompleted", { root, args, jwt: context.encodedToken }, 2000)
        ),
        catchError(err => handleError$(err, "ServiceCoreReportServiceAsCompleted")),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
  },
}




