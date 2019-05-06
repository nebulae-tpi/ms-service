const withFilter = require("graphql-subscriptions").withFilter;
const PubSub = require("graphql-subscriptions").PubSub;
const pubsub = new PubSub();
const { of } = require("rxjs");
const { map, mergeMap, catchError } = require('rxjs/operators');
const broker = require("../../broker/BrokerFactory")();
const RoleValidator = require('../../tools/RoleValidator');
const { handleError$ } = require('../../tools/GraphqlResponseTools');
const { ApolloError } = require("apollo-server");

const INTERNAL_SERVER_ERROR_CODE = 1;
const PERMISSION_DENIED_ERROR_CODE = 2;


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
    //// QUERY ///////
    Query: {
        ServiceDrivers(root, args, context) {
            //console.log("Query.ServiceDrivers", args);
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles, 'ms-Service', 'ServiceDrivers',
                PERMISSION_DENIED_ERROR_CODE, 'Permission denied',
                ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "COORDINATOR", "OPERATION-SUPERVISOR"]
            )
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Driver",
                                "emigateway.graphql.query.ServiceDrivers",
                                { root, args, jwt: context.encodedToken },
                                2000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceDrivers")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
        ServiceDriversSize(root, args, context) {
            //console.log("Query.ServiceDriversSize", args);
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles,
                'ms-Service', 'ServiceDriversSize', PERMISSION_DENIED_ERROR_CODE,
                'Permission denied',
                ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "COORDINATOR", "OPERATION-SUPERVISOR"]
            )
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Driver",
                                "emigateway.graphql.query.ServiceDriversSize",
                                { root, args, jwt: context.encodedToken },
                                2000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceDriversSize")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
        ServiceDriver(root, args, context) {
            //console.log("Query.ServiceDriversSize", args);
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles,
                'ms-Service', 'ServiceDriver',
                PERMISSION_DENIED_ERROR_CODE,
                'Permission denied',
                ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "COORDINATOR", "OPERATION-SUPERVISOR"]
            )
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Driver",
                                "emigateway.graphql.query.ServiceDriver",
                                { root, args, jwt: context.encodedToken },
                                2000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceDriver")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
        ServiceDriverVehicleList(root, args, context) {
            // console.log("ServiceDriverVehicleList", args);
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles, 'ms-Service', 'ServiceDriverVehicleList',
                PERMISSION_DENIED_ERROR_CODE, 'Permission denied',
                ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "COORDINATOR", "OPERATION-SUPERVISOR"]
            )
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Driver",
                                "emigateway.graphql.query.serviceDriverVehicleList",
                                { root, args, jwt: context.encodedToken },
                                2000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceDriverVehicleList")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
    },



    //// MUTATIONS ///////
    Mutation: {
        ServiceAssignVehicleToDriver(root, args, context) {
            // console.log("ServiceAssignVehicleToDriver", args);
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles,
                'ms-Service', 'assignVehicleToDriver',
                PERMISSION_DENIED_ERROR_CODE,
                'Permission denied',
                ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "COORDINATOR", "OPERATION-SUPERVISOR"]
            )
                .pipe(
                    mergeMap(() =>
                        context.broker.forwardAndGetReply$(
                            "Driver",
                            "emigateway.graphql.mutation.assignVehicleToDriver",
                            { root, args, jwt: context.encodedToken },
                            2000
                        )
                    ),
                    catchError(err => handleError$(err, "persistBusiness")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                )
                .toPromise();
        },

        ServiceUnassignVehicleToDriver(root, args, context) {
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles,
                'ms-Service', 'unassignVehicleFromDriver',
                PERMISSION_DENIED_ERROR_CODE,
                'Permission denied',
                ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "COORDINATOR", "OPERATION-SUPERVISOR"]
            )
                .pipe(
                    mergeMap(() =>
                        context.broker.forwardAndGetReply$(
                            "Driver",
                            "emigateway.graphql.mutation.unassignVehicleFromDriver",
                            { root, args, jwt: context.encodedToken },
                            2000
                        )
                    ),
                    catchError(err => handleError$(err, "persistBusiness")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                )
                .toPromise();
        }
    },
    //// SUBSCRIPTIONS ///////
    Subscription: {
        ServiceDriverVehicleAssignedSubscription: {
            subscribe: withFilter(
                (payload, variables, context, info) => {
                    return pubsub.asyncIterator("ServiceDriverVehicleAssignedSubscription");
                },
                (payload, variables, context, info) => {
                    return variables.driverId === payload.ServiceDriverVehicleAssignedSubscription.driverId;
                }
            )
        }

    }
};





//// SUBSCRIPTIONS SOURCES ////

const eventDescriptors = [
    {
        backendEventName: 'ServiceDriverVehicleAssigned',
        gqlSubscriptionName: 'ServiceDriverVehicleAssignedSubscription',
        dataExtractor: (evt) => evt.data,// OPTIONAL, only use if needed
        onError: (error, descriptor) => console.log(`Error processing ${descriptor.backendEventName}`),// OPTIONAL, only use if needed
        onEvent: (evt, descriptor) => {
            //console.log(`Event of type  ${descriptor.backendEventName} arraived`);
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


