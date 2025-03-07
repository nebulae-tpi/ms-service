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
    ////// QUERY ///////    
    Query: {
        ServiceServicesSize(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-' + 'Service', 'ServiceServicesSize', PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"])
                .pipe( 
                    mergeMap(() => 
                        broker
                            .forwardAndGetReply$(
                                "Service",
                                "emigateway.graphql.query.ServiceServicesSize",
                                { root, args, jwt: context.encodedToken },
                                20000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceServicesSize")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
        ServiceServicesSatellite(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-' + 'Service', 'ServiceServicesSatellite', PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"])
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Service",
                                "emigateway.graphql.query.ServiceServicesSatellite",
                                { root, args, jwt: context.encodedToken },
                                2000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceServicesSatellite")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
        ServiceClientSatellites(root, args, context) {
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles,
                'ms-' + 'Service', 'ServiceClientSatellites',
                PERMISSION_DENIED_ERROR_CODE, 'Permission denied',
                ["OPERATOR", "OPERATION-SUPERVISOR"])
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Client",
                                "emigateway.graphql.query.ServiceClientSatellites",
                                { root, args, jwt: context.encodedToken },
                                6000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceClientSatellites")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
        ServiceClientSatellite(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-' + 'Service', 'ServiceClientSatellite', PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["SATELLITE"])
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Client",
                                "emigateway.graphql.query.ServiceClientSatellite",
                                { root, args, jwt: context.encodedToken },
                                2000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceClientSatellite")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
        ServiceServices(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-' + 'Service', 'ServiceServices', PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"])
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Service",
                                "emigateway.graphql.query.ServiceServices",
                                { root, args, jwt: context.encodedToken },
                                20000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceServices")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
        ServiceService(root, args, context) {
            return RoleValidator.checkPermissions$(context.authToken.realm_access.roles, 'ms-' + 'Service', 'ServiceService', PERMISSION_DENIED_ERROR_CODE, 'Permission denied', ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"])
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Service",
                                "emigateway.graphql.query.ServiceService",
                                { root, args, jwt: context.encodedToken },
                                2000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceService")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },

        // SHIFT SECTION

        ServiceShifts(root, args, context) {
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles,
                'ms-Service', 'ServiceShifts', PERMISSION_DENIED_ERROR_CODE, 'Permission denied',
                ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "BUSINESS-VIEWER", "OPERATOR", "OPERATION-SUPERVISOR"]
            )
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Shift",
                                "emigateway.graphql.query.serviceShifts",
                                { root, args, jwt: context.encodedToken },
                                2000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceShifts")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
        ServiceShiftsSize(root, args, context) {
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles,
                'ms-Service', 'ServiceShiftsSize', PERMISSION_DENIED_ERROR_CODE, 'Permission denied',
                ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "BUSINESS-VIEWER", "OPERATOR", "OPERATION-SUPERVISOR"]
            )
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Shift",
                                "emigateway.graphql.query.serviceShiftsSize",
                                { root, args, jwt: context.encodedToken },
                                2000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceShiftsSize")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
        ServiceShift(root, args, context) {
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles,
                'ms-Service', 'ServiceShift', PERMISSION_DENIED_ERROR_CODE, 'Permission denied',
                ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "BUSINESS-VIEWER", "OPERATOR", "OPERATION-SUPERVISOR"]
            )
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Shift",
                                "emigateway.graphql.query.serviceShift",
                                { root, args, jwt: context.encodedToken },
                                2000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceShift")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
        ServiceShiftStateChangesList(root, args, context) {
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles,
                'ms-Service', 'ServiceShiftStateChangesList', PERMISSION_DENIED_ERROR_CODE, 'Permission denied',
                ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "BUSINESS-VIEWER", "OPERATOR", "OPERATION-SUPERVISOR"]
            )
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Shift",
                                "emigateway.graphql.query.serviceShiftStateChangesList",
                                { root, args, jwt: context.encodedToken },
                                2000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceShiftStateChangesList")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
        ServiceShiftStateChangesListSize(root, args, context) {
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles,
                'ms-Service', 'ServiceShiftStateChangesListSize', PERMISSION_DENIED_ERROR_CODE, 'Permission denied',
                ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "BUSINESS-VIEWER", "OPERATOR", "OPERATION-SUPERVISOR"]
            )
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Shift",
                                "emigateway.graphql.query.serviceShiftStateChangesListSize",
                                { root, args, jwt: context.encodedToken },
                                2000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceShiftStateChangesListSize")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
        ServiceShiftOnlineChangesList(root, args, context) {
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles,
                'ms-Service', 'ServiceShiftOnlineChangesList', PERMISSION_DENIED_ERROR_CODE, 'Permission denied',
                ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "BUSINESS-VIEWER", "OPERATOR", "OPERATION-SUPERVISOR"]
            )
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Shift",
                                "emigateway.graphql.query.serviceShiftOnlineChangesList",
                                { root, args, jwt: context.encodedToken },
                                2000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceShiftOnlineChangesList")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
        ServiceShiftOnlineChangesListSize(root, args, context) {
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles,
                'ms-Service', 'ServiceShiftOnlineChangesListSize', PERMISSION_DENIED_ERROR_CODE, 'Permission denied',
                ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "BUSINESS-VIEWER", "OPERATOR", "OPERATION-SUPERVISOR"]
            )
                .pipe(
                    mergeMap(() =>
                        broker
                            .forwardAndGetReply$(
                                "Shift",
                                "emigateway.graphql.query.serviceShiftOnlineChangesListSize",
                                { root, args, jwt: context.encodedToken },
                                2000
                            )
                    ),
                    catchError(err => handleError$(err, "ServiceShiftOnlineChangesListSize")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        },
    },

    //// MUTATIONS ///////
    Mutation: {
        ServiceShiftClose(root, args, context) {
            return RoleValidator.checkPermissions$(
                context.authToken.realm_access.roles,
                "Shift", "ServiceShiftClose",
                PERMISSION_DENIED_ERROR_CODE,
                "Permission denied",
                ["PLATFORM-ADMIN", "BUSINESS-OWNER", "OPERATION-SUPERVISOR" ]
            )
                .pipe(
                    mergeMap(() =>
                        context.broker.forwardAndGetReply$(
                            "Shift",
                            "emigateway.graphql.mutation.serviceShiftClose",
                            { root, args, jwt: context.encodedToken },
                            2000
                        )
                    ),
                    catchError(err => handleError$(err, "serviceShiftClose")),
                    mergeMap(response => getResponseFromBackEnd$(response))
                ).toPromise();
        }
    },

    //// SUBSCRIPTIONS ///////
    Subscription: {
        ServiceServiceUpdatedSubscription: {
            subscribe: withFilter(
                (payload, variables, context, info) => {
                    return pubsub.asyncIterator("ServiceServiceUpdatedSubscription");
                },
                (payload, variables, context, info) => {
                    const businessId = payload.ServiceServiceUpdatedSubscription.businessId;
                    const serviceClientId = payload.ServiceServiceUpdatedSubscription.client.id;

                    if ((context.authToken.realm_access.roles.includes("PLATFORM-ADMIN"))) {
                        return true;
                    }

                    if ((context.authToken.realm_access.roles.includes("OPERATOR")) || (context.authToken.realm_access.roles.includes("OPERATION-SUPERVISOR"))) {
                        return context.authToken.businessId === businessId;
                    }

                    if (context.authToken.realm_access.roles.includes("SATELLITE")) {
                        return context.authToken.businessId === businessId && context.authToken.clientId === serviceClientId;
                    }

                    return false;
                }
            )
        }

    }
};

//// SUBSCRIPTIONS SOURCES ////
const eventDescriptors = [
    {
        backendEventName: 'ServiceServiceUpdatedSubscription',
        gqlSubscriptionName: 'ServiceServiceUpdatedSubscription',
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


