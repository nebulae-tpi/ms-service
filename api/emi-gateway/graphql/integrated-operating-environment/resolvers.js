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
    IOEShift: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'IOEShift', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', READ_ROLES).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Shift", "emigateway.graphql.query.IOEShift", { root, args, jwt: context.encodedToken }, 2000)
        ),
        mergeMap(response => getResponseFromBackEnd$(response))
      ).toPromise();
    },
    IOEShifts: (root, args, context, info) => {
      return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-service', 'IOEShifts', USERS_PERMISSION_DENIED_ERROR_CODE, 'Permission denied', READ_ROLES).pipe(
        switchMapTo(
          broker.forwardAndGetReply$("Shift", "emigateway.graphql.query.IOEShifts", { root, args, jwt: context.encodedToken }, 3000)
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
  

  //// SUBSCRIPTIONS ///////
  Subscription: {
    IOEService: {
      subscribe: withFilter(
        (payload, variables, context, info) => {
          return pubsub.asyncIterator("IOEService");
        },
        (payload, variables, context, info) => {
          const businessOk = !variables.businessId ? true : payload.IOEService.businessId === variables.businessId;
          const operatorOk = !variables.operatorId ? true : payload.IOEService.request && payload.IOEService.request.ownerOperatorId === variables.operatorId;
          const channelFilter = (payload.IOEService.request && variables.channelsFilter && variables.channelsFilter.includes(payload.IOEService.request.sourceChannel) );
          return businessOk && operatorOk && channelFilter;
        }
      )
    },
    IOEShift: {
      subscribe: withFilter(
        (payload, variables, context, info) => {
          return pubsub.asyncIterator("IOEShift");
        },
        (payload, variables, context, info) => {
          return !variables.businessId ? true : payload.IOEShift.businessId === variables.businessId;
        }
      )
    }
  }

};


//// SUBSCRIPTIONS SOURCES ////

const eventDescriptors = [
  {
    backendEventName: 'IOEService',
    gqlSubscriptionName: 'IOEService',
    dataExtractor: (evt) => evt.data,// OPTIONAL, only use if needed
    onError: (error, descriptor) => console.log(`Error processing ${descriptor.backendEventName}`),// OPTIONAL, only use if needed
    onEvent: (evt, descriptor) => {
      //console.log(`Event of type  ${descriptor.backendEventName} HERE!!!!`);
    },// OPTIONAL, only use if needed
  },
  {
    backendEventName: 'IOEShift',
    gqlSubscriptionName: 'IOEShift',
    dataExtractor: (evt) => evt.data,// OPTIONAL, only use if needed
    onError: (error, descriptor) => console.log(`Error processing ${descriptor.backendEventName}`),// OPTIONAL, only use if needed
    onEvent: (evt, descriptor) => {
      //console.log(`Event of type  ${descriptor.backendEventName} HERE!!!!`);
    },// OPTIONAL, only use if needed
  },
];


/**
* Connects every backend event to the right GQL subscription
*/
eventDescriptors.forEach(descriptor => {
  broker
    .getMaterializedViewsUpdates$([descriptor.backendEventName])
    .subscribe(
      evt => {
        if (descriptor.onEvent) {
          descriptor.onEvent(evt, descriptor);
        }
        const payload = {};
        payload[descriptor.gqlSubscriptionName] = descriptor.dataExtractor ? descriptor.dataExtractor(evt) : evt.data
        pubsub.publish(descriptor.gqlSubscriptionName, payload);
      },

      error => {
        if (descriptor.onError) {
          descriptor.onError(error, descriptor);
        }
        console.error(
          `Error listening ${descriptor.gqlSubscriptionName}`,
          error
        );
      },

      () =>
        console.log(
          `${descriptor.gqlSubscriptionName} listener STOPPED`
        )
    );
});
