"use strict";

const { ShiftCQRS } = require("../../domain/shift");
const { ShiftClientCQRS } = require("../../domain/shift");
const { DriverCQRS } = require("../../domain/driver");
const { ServiceCQRS } = require("../../domain/service");
const { ServiceClientCQRS } = require("../../domain/service");
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
    onCompleteHandler,
    requireAuth = true
  }) {
    const handler = this.functionMap[messageType];
    const subscription = broker
      .getMessageListener$([aggregateType], [messageType]).pipe(
        mergeMap(message => this.verifyRequest$(message, requireAuth)),
        mergeMap(request => ( request.failedValidations.length > 0)
          ? of(request.errorResponse)
          : of(request).pipe(
              //ROUTE MESSAGE TO RESOLVER
              mergeMap(({ authToken, message }) =>
              handler.fn.call(handler.obj, message.data, authToken).pipe(
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
  verifyRequest$(request, requireAuth = true) {
    return of(request).pipe(
      //decode and verify the jwt token
      mergeMap(message =>
        of(message).pipe(
          map(message => ({ authToken: requireAuth ? jsonwebtoken.verify(message.data.jwt, jwtPublicKey): null, message, failedValidations: [] })),
          catchError(err =>
            {
              return handleError$(err).pipe(
                map(response => ({
                  errorResponse: { response, correlationId: message.id, replyTo: message.attributes.replyTo },
                  failedValidations: ['JWT']
                }
                ))
              )
            }
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
      //SHIFT
      {
        aggregateType: "Shift",
        messageType: "drivergateway.graphql.query.OpenShift"
      },     
      {
        aggregateType: "Shift",
        messageType: "drivergateway.graphql.mutation.startShift"
      },     
      {
        aggregateType: "Shift",
        messageType: "drivergateway.graphql.mutation.setShiftState"
      },     
      {
        aggregateType: "Shift",
        messageType: "drivergateway.graphql.mutation.stopShift"
      },     
      // CLIENT
      {
        aggregateType: "Service",
        messageType: "clientgateway.graphql.query.CurrentServices"
      },
      {
        aggregateType: "Shift",
        messageType: "clientgateway.graphql.query.NearbyVehicles",
        requireAuth: false
      },
      {
        aggregateType: "Service",
        messageType: "clientgateway.graphql.query.HistoricalClientServices"
      },
      {
        aggregateType: "Service",
        messageType: "clientgateway.graphql.mutation.RequestService"
      },
      {
        aggregateType: "Service",
        messageType: "clientgateway.graphql.mutation.RequestAppService"
      },
      {
        aggregateType: "Service",
        messageType: "clientgateway.graphql.mutation.RequestDeliveryService"
      },
      {
        aggregateType: "Service",
        messageType: "clientgateway.graphql.mutation.PartialPaymentService"
      },
      {
        aggregateType: "Service",
        messageType: "clientgateway.graphql.mutation.CancelServiceByClient"
      },
      {
        aggregateType: "Service",
        messageType: "clientgateway.graphql.mutation.CancelAppServiceByClient"
      },
      {
        aggregateType: "Service",
        messageType: "clientgateway.graphql.mutation.ChangeServiceState"
      },
      {
        aggregateType: "Service",
        messageType: "clientgateway.graphql.mutation.SendMessageToDriver"
      },    
      {
        aggregateType: "Service",
        messageType: "clientgateway.graphql.query.ServiceById"
      },    
      //DRIVER
      {
        aggregateType: "Driver",
        messageType: "drivergateway.graphql.query.DriverAssignedVehicles"
      },     

      //SERVICE
      {
        aggregateType: "Service",
        messageType: "emigateway.graphql.query.ServiceCoreService"
      },   
      {
        aggregateType: "Service",
        messageType: "emigateway.graphql.mutation.ServiceCoreRequestService"
      },   
      {
        aggregateType: "Service",
        messageType: "emigateway.graphql.mutation.ServiceCoreCancelService"
      },   
      {
        aggregateType: "Service",
        messageType: "emigateway.graphql.mutation.ServiceCoreAssignService"
      },   
      {
        aggregateType: "Service",
        messageType: "emigateway.graphql.mutation.ServiceCoreReportServicePickupETA"
      },   
      {
        aggregateType: "Service",
        messageType: "emigateway.graphql.mutation.ServiceCoreReportServiceAsArrived"
      },   
      {
        aggregateType: "Service",
        messageType: "emigateway.graphql.mutation.ServiceCoreReportServiceAsPickedUp"
      },   
      {
        aggregateType: "Service",
        messageType: "emigateway.graphql.mutation.ServiceCoreReportServiceAsCompleted"
      },   
      {
        aggregateType: "Service",
        messageType: "drivergateway.graphql.mutation.acceptServiceOffer"
      },   
      {
        aggregateType: "Service",
        messageType: "drivergateway.graphql.query.AssignedService"
      },   
      {
        aggregateType: "Service",
        messageType: "drivergateway.graphql.query.HistoricalDriverServices"
      },
      {
        aggregateType: "Service",
        messageType: "drivergateway.graphql.mutation.sendMessageToClient"
      },  
      
    ];
  }


  /**
   * returns a map that assocs GraphQL request with its processor
   */
  generateFunctionMap() {
    //SHIFT
    return {
      "drivergateway.graphql.query.OpenShift": {
        fn: ShiftCQRS.queryOpenShift$,
        obj: ShiftCQRS
      },
      "drivergateway.graphql.mutation.startShift": {
        fn: ShiftCQRS.startShift$,
        obj: ShiftCQRS
      },
      "drivergateway.graphql.mutation.setShiftState": {
        fn: ShiftCQRS.setShiftState$,
        obj: ShiftCQRS
      },
      "drivergateway.graphql.mutation.stopShift": {
        fn: ShiftCQRS.stopShift$,
        obj: ShiftCQRS
      },      
      
      //DRIVER
      "drivergateway.graphql.query.DriverAssignedVehicles": {
        fn: DriverCQRS.queryDriverAssignedVehicles$,
        obj: DriverCQRS
      },



      
      // CLIENT
      "clientgateway.graphql.query.NearbyVehicles": {
        fn: ShiftClientCQRS.queryNearbyVehicles$,
        obj: ShiftClientCQRS
      },
      "clientgateway.graphql.query.CurrentServices": {
        fn: ServiceClientCQRS.queryClientCurrentServices$,
        obj: ServiceClientCQRS
      },
      "clientgateway.graphql.query.HistoricalClientServices": {
        fn: ServiceClientCQRS.queryHistoricalClientServices$,
        obj: ServiceClientCQRS
      },
      "clientgateway.graphql.query.ServiceById": {
        fn: ServiceClientCQRS.queryServiceById$,
        obj: ServiceClientCQRS
      },
      "clientgateway.graphql.mutation.RequestService": {
        fn: ServiceClientCQRS.requestServices$,
        obj: ServiceClientCQRS
      },
      "clientgateway.graphql.mutation.RequestAppService": {
        fn: ServiceClientCQRS.requestAppServices$,
        obj: ServiceClientCQRS
      },
      "clientgateway.graphql.mutation.RequestDeliveryService": {
        fn: ServiceClientCQRS.RequestDeliveryService$,
        obj: ServiceClientCQRS
      },
      "clientgateway.graphql.mutation.CancelServiceByClient": {
        fn: ServiceClientCQRS.cancelServicebyClient$,
        obj: ServiceClientCQRS
      },
      "clientgateway.graphql.mutation.CancelAppServiceByClient": {
        fn: ServiceClientCQRS.cancelAppServicebyClient$,
        obj: ServiceClientCQRS
      },
      "clientgateway.graphql.mutation.ChangeServiceState": {
        fn: ServiceClientCQRS.changeServiceState$,
        obj: ServiceClientCQRS
      },
      "clientgateway.graphql.mutation.SendMessageToDriver": {
        fn: ServiceClientCQRS.sendMessageToDriver$,
        obj: ServiceClientCQRS
      },      
      "clientgateway.graphql.mutation.PartialPaymentService": {
        fn: ServiceClientCQRS.partialPaymentService$,
        obj: ServiceClientCQRS
      },

      // SERVICES
      "emigateway.graphql.query.ServiceCoreService": {
        fn: ServiceCQRS.queryService$,
        obj: ServiceCQRS
      },
      "emigateway.graphql.mutation.ServiceCoreRequestService": {
        fn: ServiceCQRS.requestServices$,
        obj: ServiceCQRS
      },
      "emigateway.graphql.mutation.ServiceCoreCancelService": {
        fn: ServiceCQRS.cancelService$,
        obj: ServiceCQRS
      },
      "emigateway.graphql.mutation.ServiceCoreAssignService": {
        fn: ServiceCQRS.assignService$,
        obj: ServiceCQRS
      },
      "emigateway.graphql.mutation.ServiceCoreReportServicePickupETA": {
        fn: ServiceCQRS.reportServicePickupETA$,
        obj: ServiceCQRS
      },
      "emigateway.graphql.mutation.ServiceCoreReportServiceAsArrived": {
        fn: ServiceCQRS.reportServiceAsArrived$,
        obj: ServiceCQRS
      },
      "emigateway.graphql.mutation.ServiceCoreReportServiceAsPickedUp": {
        fn: ServiceCQRS.reportServiceAsPickedUp$,
        obj: ServiceCQRS
      },
      "emigateway.graphql.mutation.ServiceCoreReportServiceAsCompleted": {
        fn: ServiceCQRS.reportServiceAsCompleted$,
        obj: ServiceCQRS
      },            
      "drivergateway.graphql.mutation.acceptServiceOffer": {
        fn: ServiceCQRS.acceptServiceOffer$,
        obj: ServiceCQRS
      },                  
      "drivergateway.graphql.query.AssignedService": {
        fn: ServiceCQRS.queryAssignedService$,
        obj: ServiceCQRS
      },            
      "drivergateway.graphql.query.HistoricalDriverServices": {
        fn: ServiceCQRS.queryHistoricalDriverServices$,
        obj: ServiceCQRS
      },
      "drivergateway.graphql.mutation.sendMessageToClient": {
        fn: ServiceCQRS.sendMessageToClient$,
        obj: ServiceCQRS
      },          
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
