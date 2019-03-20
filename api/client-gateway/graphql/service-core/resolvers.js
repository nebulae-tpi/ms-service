'use strict'

const withFilter = require("graphql-subscriptions").withFilter;
const PubSub = require("graphql-subscriptions").PubSub;
const pubsub = new PubSub();
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
    HistoricalClientServices: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'HistoricalClientServices', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['CLIENT']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "clientgateway.graphql.query.HistoricalClientServices", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
    NearbyVehicles: (root, args, context, info) => {
      return of('').pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Shift", "clientgateway.graphql.query.NearbyVehicles", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
    CurrentServices: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'CurrentServices', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['CLIENT']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "clientgateway.graphql.query.CurrentServices", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
  },

  Mutation: {
    RequestService: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'RequestService', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['CLIENT']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "clientgateway.graphql.mutation.RequestService", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
    CancelServiceByClient: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'CancelServiceByClient', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ['CLIENT']).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Service", "clientgateway.graphql.mutation.CancelServiceByClient", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    }
  },

  //// SUBSCRIPTIONS ///////
  Subscription: {
    ClientServiceUpdatedSubscription: {
        subscribe: withFilter(
            (payload, variables, context, info) => {
                return pubsub.asyncIterator("ClientServiceUpdatedSubscription");
            },
            (payload, variables, context, info) => {
                const businessId = payload.ClientServiceUpdatedSubscription.businessId;
                const serviceClientId = payload.ClientServiceUpdatedSubscription.client.id;

                if (context.authToken.realm_access.roles.includes("CLIENT")) {
                  // context.authToken.businessId === businessId && 
                  return context.authToken.clientId === serviceClientId;
                }

                return false;
            }
        )
    }
  }
}
