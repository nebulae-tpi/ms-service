"use strict";

const { DriverCQRS } = require("../../domain/driver");
const { ShiftCQRS } = require("../../domain/shift");
const { ServiceCQRS } = require("../../domain/service");
const { ClientCQRS } = require("../../domain/client");
const broker = require("../../tools/broker/BrokerFactory")();
const { of, from } = require("rxjs");
const jsonwebtoken = require("jsonwebtoken");
const { map, mergeMap, catchError, tap } = require('rxjs/operators');
const jwtPublicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");
const {handleError$} = require('../../tools/GraphqlResponseTools');


let instance;

class GraphQlService {


  constructor() {
    this.functionMap = this.generateFunctionMap();
    this.subscriptions = [];
  }

  /**
   * Starts GraphQL actions listener
   */
  start$() {
      //default on error handler
      const onErrorHandler = (error) => {
        console.error("Error handling  GraphQl incoming event", error);
        process.exit(1);
      };
  
      //default onComplete handler
      const onCompleteHandler = () => {
        () => console.log("GraphQlService incoming event subscription completed");
      };
    return from(this.getSubscriptionDescriptors()).pipe(
      map(aggregateEvent => ({ ...aggregateEvent, onErrorHandler, onCompleteHandler })),
      map(params => this.subscribeEventHandler(params))
    )
  }

  /**
   * build a Broker listener to handle GraphQL requests procesor
   * @param {*} descriptor 
   */
  subscribeEventHandler({
    aggregateType,
    messageType,
    onErrorHandler,
    onCompleteHandler
  }) {
    const handler = this.functionMap[messageType];
    const subscription = broker
      .getMessageListener$([aggregateType], [messageType]).pipe(
        mergeMap(message => this.verifyRequest$(message)),
        mergeMap(request => ( request.failedValidations.length > 0)
          ? of(request.errorResponse)
          : of(request).pipe(
              //ROUTE MESSAGE TO RESOLVER
              mergeMap(({ authToken, message }) =>
              handler.fn
                .call(handler.obj, message.data, authToken).pipe(
                  map(response => ({ response, correlationId: message.id, replyTo: message.attributes.replyTo }))
                )
            )
          )
        )    
        ,mergeMap(msg => this.sendResponseBack$(msg))
      )
      .subscribe(
        msg => { /* console.log(`GraphQlService: ${messageType} process: ${msg}`); */ },
        onErrorHandler,
        onCompleteHandler
      );
    this.subscriptions.push({
      aggregateType,
      messageType,
      handlerName: handler.fn.name,
      subscription
    });
    return {
      aggregateType,
      messageType,
      handlerName: `${handler.obj.name}.${handler.fn.name}`
    };
  }

    /**
   * Verify the message if the request is valid.
   * @param {any} request request message
   * @returns { Rx.Observable< []{request: any, failedValidations: [] }>}  Observable object that containg the original request and the failed validations
   */
  verifyRequest$(request) {
    return of(request).pipe(
      //decode and verify the jwt token
      mergeMap(message =>
        of(message).pipe(
          map(message => ({ authToken: jsonwebtoken.verify(message.data.jwt, jwtPublicKey), message, failedValidations: [] })),
          catchError(err =>
            handleError$(err).pipe(
              map(response => ({
                errorResponse: { response, correlationId: message.id, replyTo: message.attributes.replyTo },
                failedValidations: ['JWT']
              }
              ))
            )
          )
        )
      )
    )
  }

 /**
  * 
  * @param {any} msg Object with data necessary  to send response
  */
 sendResponseBack$(msg) {
   return of(msg).pipe(mergeMap(
    ({ response, correlationId, replyTo }) =>
      replyTo
        ? broker.send$(replyTo, "emigateway.graphql.Query.response", response, {
            correlationId
          })
        : of(undefined)
  ));
}

  stop$() {
    from(this.subscriptions).pipe(
      map(subscription => {
        subscription.subscription.unsubscribe();
        return `Unsubscribed: aggregateType=${aggregateType}, eventType=${eventType}, handlerName=${handlerName}`;
      })
    );
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  /////////////////// CONFIG SECTION, ASSOC EVENTS AND PROCESSORS BELOW  /////////////////
  ////////////////////////////////////////////////////////////////////////////////////////


  /**
   * returns an array of broker subscriptions for listening to GraphQL requests
   */
  getSubscriptionDescriptors() {
    console.log("GraphQl Service starting ...");
    return [
      {
        aggregateType: "Driver",
        messageType: "emigateway.graphql.query.ServiceDrivers"
      },
      {
        aggregateType: "Driver",
        messageType: "emigateway.graphql.query.ServiceDriversSize"
      },
      {
        aggregateType: "Driver",
        messageType: "emigateway.graphql.query.ServiceDriver"
      },
      {
        aggregateType: "Driver",
        messageType: "emigateway.graphql.query.serviceDriverVehicleList"
      },
      {
        aggregateType: "Driver",
        messageType: "emigateway.graphql.mutation.assignVehicleToDriver"
      },
      {
        aggregateType: "Driver",
        messageType: "emigateway.graphql.mutation.unassignVehicleFromDriver"
      },
      // SERVICES
      {
        aggregateType: "Service",
        messageType: "emigateway.graphql.query.ServiceServices"
      },              
      {
        aggregateType: "Service",
        messageType: "emigateway.graphql.query.ServiceServicesSize"
      },
      {
        aggregateType: "Service",
        messageType: "emigateway.graphql.query.ServiceService"
      },
      {
        aggregateType: "Service",
        messageType: "emigateway.graphql.query.ServiceServicesSatellite"
      },
      // CLIENT
      {
        aggregateType: "Client",
        messageType: "emigateway.graphql.query.ServiceClientSatellite"
      },
      {
        aggregateType: "Client",
        messageType: "emigateway.graphql.query.ServiceClientSatellites"
      },
      // SHIFTs
      {
        aggregateType: "Shift",
        messageType: "emigateway.graphql.query.serviceShifts"
      },
      {
        aggregateType: "Shift",
        messageType: "emigateway.graphql.query.serviceShift"
      },
      {
        aggregateType: "Shift",
        messageType: "emigateway.graphql.query.serviceShiftsSize"
      },
      {
        aggregateType: "Shift",
        messageType: "emigateway.graphql.query.serviceShiftStateChangesList"
      },
      {
        aggregateType: "Shift",
        messageType: "emigateway.graphql.query.serviceShiftStateChangesListSize"
      },
      {
        aggregateType: "Shift",
        messageType: "emigateway.graphql.query.serviceShiftOnlineChangesList"
      },
      {
        aggregateType: "Shift",
        messageType: "emigateway.graphql.query.serviceShiftOnlineChangesListSize"
      },
      {
        aggregateType: "Shift",
        messageType: "emigateway.graphql.mutation.serviceShiftClose"
      }

    ];
  }


  /**
   * returns a map that assocs GraphQL request with its processor
   */
  generateFunctionMap() {
    //DRIVERS VEHICLE ASSIGNMENT
    return {
      "emigateway.graphql.query.ServiceDrivers": {
        fn: DriverCQRS.getDriverList$,
        obj: DriverCQRS
      },
      "emigateway.graphql.query.ServiceDriversSize": {
        fn: DriverCQRS.getDriverListSize$,
        obj: DriverCQRS
      },
      "emigateway.graphql.query.ServiceDriver": {
        fn: DriverCQRS.getDriver$,
        obj: DriverCQRS
      },
      "emigateway.graphql.query.serviceDriverVehicleList": {
        fn: DriverCQRS.getDriverVehicles$,
        obj: DriverCQRS
      },
      "emigateway.graphql.mutation.assignVehicleToDriver": {
        fn: DriverCQRS.assignVehicleToDriver$,
        obj: DriverCQRS
      },
      "emigateway.graphql.mutation.unassignVehicleFromDriver": {
        fn: DriverCQRS.unassignVehicleFromDriver$,
        obj: DriverCQRS
      },
      // SERVICES
      "emigateway.graphql.query.ServiceServices": {
        fn: ServiceCQRS.getServiceList$,
        obj: ServiceCQRS
      },
      "emigateway.graphql.query.ServiceServicesSize": {
        fn: ServiceCQRS.getServiceListSize$,
        obj: ServiceCQRS
      },
      "emigateway.graphql.query.ServiceService": {
        fn: ServiceCQRS.getService$,
        obj: ServiceCQRS
      },
      "emigateway.graphql.query.ServiceServicesSatellite": {
        fn: ServiceCQRS.getServiceSatelliteList$,
        obj: ServiceCQRS
      }, 
      // CLIENT
      "emigateway.graphql.query.ServiceClientSatellite": {
        fn: ClientCQRS.getClientSatellite$,
        obj: ClientCQRS
      },
      "emigateway.graphql.query.ServiceClientSatellites": {
        fn: ClientCQRS.getSatelliteClients$,
        obj: ClientCQRS
      },  
      // SHIFTS
      "emigateway.graphql.query.serviceShifts": {
        fn: ShiftCQRS.getShiftList$,
        obj: ShiftCQRS
      },
      "emigateway.graphql.query.serviceShift": {
        fn: ShiftCQRS.getShift$,
        obj: ShiftCQRS
      },
      "emigateway.graphql.query.serviceShiftsSize": {
        fn: ShiftCQRS.getShiftListSize$,
        obj: ShiftCQRS
      },
      "emigateway.graphql.query.serviceShiftStateChangesList": {
        fn: ShiftCQRS.getShiftStateChangesList$,
        obj: ShiftCQRS
      },
      "emigateway.graphql.query.serviceShiftStateChangesListSize": {
        fn: ShiftCQRS.getShiftStateChangesListSize$,
        obj: ShiftCQRS
      },
      "emigateway.graphql.query.serviceShiftOnlineChangesList": {
        fn: ShiftCQRS.getShiftOnlineChangesList$,
        obj: ShiftCQRS
      },
      "emigateway.graphql.query.serviceShiftOnlineChangesListSize": {
        fn: ShiftCQRS.getShiftOnlineChangesListSize$,
        obj: ShiftCQRS
      },
      "emigateway.graphql.mutation.serviceShiftClose": {
        fn: ShiftCQRS.closeShift$,
        obj: ShiftCQRS
      }

    };
  }
}

/**
 * @returns {GraphQlService}
 */
module.exports = () => {
  if (!instance) {
    instance = new GraphQlService();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
