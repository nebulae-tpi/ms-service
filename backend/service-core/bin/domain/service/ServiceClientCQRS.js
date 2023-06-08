"use strict";


const dateFormat = require('dateformat');
const uuidv4 = require("uuid/v4");
const { of, interval, forkJoin, throwError, iif } = require("rxjs");
const { mapTo, mergeMap, catchError, map, mergeMapTo, tap, first, toArray, filter } = require('rxjs/operators');

const RoleValidator = require("../../tools/RoleValidator");
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();
const broker = require("../../tools/broker/BrokerFactory")();
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const Crosscutting = require('../../tools/Crosscutting');
const {
  CustomError,
  DefaultError, 
  PERMISSION_DENIED,
  ERROR_23100, ERROR_23101, ERROR_23102, ERROR_23103, ERROR_23104, ERROR_23105,
  ERROR_23200, ERROR_23201, ERROR_23202, ERROR_23203, ERROR_23204, ERROR_23205, ERROR_23206, ERROR_23207, ERROR_23208, ERROR_23209, ERROR_23210, ERROR_23211, ERROR_23212,
  ERROR_23220, ERROR_23221, ERROR_23222, ERROR_23223, ERROR_23224, ERROR_23225, ERROR_23226, ERROR_23227, ERROR_23228, ERROR_23229,
} = require("../../tools/customError");

const { ShiftDA, ServiceDA, ClientDA, DriverDA, VehicleDA } = require('./data-access');


const VALID_SERVICE_CLIENT_TIP_TYPES = ['CASH', 'VIRTUAL_WALLET'];
const VALID_SERVICE_PAYMENT_TYPES = ['CASH', 'CREDIT_CARD'];
const VALID_SERVICE_REQUEST_FEATURES = ['AC', 'TRUNK', 'ROOF_RACK', 'VIP', 'JUMPER_CABLES', 'PETS', 'BIKE_RACK'];
const VALID_SERVICE_CANCEL_BY_DRIVER_REASONS = ['MECHANICAL_FAILURE', 'INVALID_ADDRESS', 'USER_DOESNT_ANSWER', 'CONGESTION_ON_THE_ROAD', 'DRUNK_USER', 'BRING_PET', 'USER_IS_NOT_HERE', 'VEHICLE_FROM_OTHER_COMPANY', 'DIFFERENT_TRIP_SERVICE', 'SERVICE_CODE'];
const VALID_SERVICE_CANCEL_BY_CLIENT_REASONS = ['PLATE_DOESNT_MATCH', 'IS_NOT_THE_DRIVER', 'IT_TAKES_TOO_MUCH_TIME', 'DOESNT_REQUIRED'];
const VALID_SERVICE_CANCEL_BY_OPERATOR_REASONS = ['IT_TAKES_TOO_MUCH_TIME', 'DOESNT_REQUIRED', 'OTHER'];
const VALID_SERVICE_CANCEL_BY_AUTHORS = ['DRIVER', 'CLIENT', 'OPERATOR'];
const VALID_SERVICE_CANCEL_REASON_BY_AUTHOR = {
  'CLIENT': VALID_SERVICE_CANCEL_BY_CLIENT_REASONS,
  'APP_CLIENT': VALID_SERVICE_CANCEL_BY_CLIENT_REASONS,
  'APP_DELIVERY': VALID_SERVICE_CANCEL_BY_CLIENT_REASONS
};

/**
 * Singleton instance
 */
let instance;

class ServiceClientCQRS {
  constructor() {
  }


  //#region CLIENT-GATEWAY

  queryClientCurrentServices$({ root, args, jwt }, authToken) {
    const clientId = authToken.clientId || '-1';
    // console.log(`ServiceCQRS.queryClientCurrentServices RQST: ${JSON.stringify(authToken)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceClientCQRS", "queryClientCurrentServices", PERMISSION_DENIED, ["CLIENT", 'SATELLITE']).pipe(
      mergeMap(() => ServiceDA.findCurrentServicesRequestedByClient$(clientId)),
      map(service => this.formatServiceToGraphQLSchema(service)),
      toArray(),
      //tap(x => ServiceCQRS.log(`ServiceCQRS.queryClientCurrentServices RESP: ${JSON.stringify(x)}`)), //DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }


  /**  
 * Queries and return a historical Service done by the client
 */
  queryHistoricalClientServices$({ root, args, jwt }, authToken) {
    const { clientId } = authToken;
    // console.log("CONSULTA CLIENT HISTORY");
    let { year, month, page, count } = args;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    year = (!year || year < 2019 || year > currentYear) ? currentYear : year;
    month = (!month || month < 1 || month > 12) ? currentMonth : month;
    page = (!page || page < 0 || page > 100) ? 0 : page;
    count = (!count || count < 1 || count > 100) ? 20 : count;

    //ServiceCQRS.log(`ServiceCQRS.queryHistoricalClientServices RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "queryHistoricalClientServices", PERMISSION_DENIED, ["CLIENT"])
      .pipe(
        mergeMapTo(ServiceDA.findHistoricalServiceByClient$(clientId, year, month, page, count, {
          timestamp: 1, pickUp: 1, dropOff: 1, requestedFeatures: 1, paymentType: 1, fareDiscount: 1, fare: 1, state: 1
        })),
        map(service => this.formatServiceToGraphQLSchema(service)),
        toArray(),
        first(arr => arr, []),
        //tap(x => ServiceCQRS.log(`ServiceCQRS.queryHistoricalClientServices RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINEs
        mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
        catchError(err => GraphqlResponseTools.handleError$(err, true))
      );
  }

  queryHistoricalDeliveryServices$({ root, args, jwt }, authToken) {
    const { clientId } = authToken;
    // const { initTimestamp, endTimestamp, driverId, vehicleId } = args;
    // console.log("CONSULTA CLIENT HISTORY", args);
    let { year, month, page, count } = args;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    year = (!year || year < 2019 || year > currentYear) ? currentYear : year;
    month = (!month || month < 1 || month > 12) ? currentMonth : month;
    page = (!page || page < 0 || page > 100) ? 0 : page;
    count = (!count || count < 1 || count > 100) ? 20 : count;

    // if (filter.dateInit && filter.dateEnd){
    //   query["metadata.createdAt"] = { $gte: filter.dateInit, $lt: filter.dateEnd }
    // }

    //ServiceCQRS.log(`ServiceCQRS.queryHistoricalClientServices RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "queryHistoricalDeliveryServices", PERMISSION_DENIED, ["CLIENT", "SATELLITE"])
      .pipe(
        mergeMapTo(ServiceDA.findHistoricalServiceByClient$(clientId, args, page, count)),
        map(service => this.formatServiceToGraphQLSchema(service)),
        toArray(),
        first(arr => arr, []),
        mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
        catchError(err => GraphqlResponseTools.handleError$(err, true))
      );
  }

  queryServiceById$({ root, args, jwt }, authToken) {
    console.log("CONSULTA CLIENT HISTORY");
    let { id } = args;

    //ServiceCQRS.log(`ServiceCQRS.queryHistoricalClientServices RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "queryServiceById", PERMISSION_DENIED, ["CLIENT", "SATELLITE"])
      .pipe(
        mergeMapTo(ServiceDA.findById$(id)),
        map(service => this.formatServiceToGraphQLSchema(service)),
        //tap(x => ServiceCQRS.log(`ServiceCQRS.queryHistoricalClientServices RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINEs
        mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
        catchError(err => GraphqlResponseTools.handleError$(err, true))
      );
  }

  /**
   * 
   * @param {*} param0 
   * @param {*} authToken 
   * @returns 
   */
  queryServiceHistoryDriverListing$({ root, args, jwt }, authToken) {
    const { filterInput } = args;

    if(authToken.businessId){
      filterInput.businessId = authToken.businessId;
    }

    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "queryServiceHistoryDriverListing", PERMISSION_DENIED, ["CLIENT", "SATELLITE"])
      .pipe(
        mergeMapTo(DriverDA.getDriverList$(filterInput).pipe(toArray())),
        map((listing) => ({ listing: listing || [] })),
        mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
        catchError(err => GraphqlResponseTools.handleError$(err, true))
      );
  }

  /**
   * 
   * @param {*} param0 
   * @param {*} authToken 
   * @returns 
   */
   queryServiceHistoryVehicleListing$({ root, args, jwt }, authToken) {
    const { filterInput } = args;

    if(authToken.businessId){
      filterInput.businessId = authToken.businessId;
    }

    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "queryServiceHistoryVehicleListing", PERMISSION_DENIED, ["CLIENT", "SATELLITE"])
      .pipe(
        mergeMapTo(VehicleDA.getVehicleList$(filterInput).pipe(toArray())),
        map((listing) => ({ listing: listing || [] })),
        mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
        catchError(err => GraphqlResponseTools.handleError$(err, true))
      );
  }
  /**
   * Handler for request made from client gateway
   * @param {*} param0 
   * @param {*} authToken 
   */
  requestServices$({ root, args, jwt }, authToken) {
    // console.log('ON requestServices$  ==> ', args.dropOff );

    // const discountByBusinessUnit =  {
    //   "75cafa6d-0f27-44be-aa27-c2c82807742d": 0.10, // CALI
    //   "b19c067e-57b4-468f-b970-d0101a31cacb": 0.15  // MANIZALES
    // };

    // const businessId = authToken.businessId;

    const { id, tripCost, client } = args;

    // args.fareDiscount = client ? 0 : 0; // second zero means 0% discount
    // args.fareDiscount = (tripCost && tripCost > 0) ? 0 : args.fareDiscount;

    // ServiceClientCQRS.log(`ServiceCQRS.requestServices RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "requestServices", PERMISSION_DENIED, ["CLIENT"])
      .pipe(
        mergeMap(() => !client
          ? ServiceDA.findCurrentServicesRequestedByClient$(authToken.clientId, { _id: 1 })
            .pipe(
              toArray(),
              mergeMap(services => iif(() => services != null && services.length > 0, throwError(ERROR_23212), of('')))
            )
          : of({})
        ),
        mapTo({ ...args, businessId: authToken.businessId, client: { id: authToken.clientId, businessId: authToken.businessId, ...args.client } }),
        // tap(request => console.log('CLIENT REQUEST ==> ', {...request})),
        tap(request => this.validateServiceRequestInput(request)),
        mergeMap(request => eventSourcing.eventStore.emitEvent$(this.buildServiceRequestedEsEvent(authToken, request))), //Build and send ServiceRequested event (event-sourcing)
        mapTo(this.buildCommandAck()), // async command acknowledge
        // tap(x => ServiceCQRS.log(`ServiceCQRS.requestServices RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
        mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
        catchError(err => GraphqlResponseTools.handleError$(err, true))
      );
  }

  partialPaymentService$({ root, args, jwt }, authToken) {

    const { serviceId, amount } = args;
    // console.log("PAYMENT ARGS ====> ", args);
    // ServiceClientCQRS.log(`ServiceCQRS.requestServices RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "partialPaymentService", PERMISSION_DENIED, ["CLIENT"])
      .pipe(
        mergeMap(() => ServiceDA.findById$(serviceId, { _id: 1, client: 1, driver: 1 })),
        map(service => {
          return {
            _id: Crosscutting.generateDateBasedUuid(),
            businessId: authToken.businessId,
            type: "MOVEMENT",
            // notes: mba.notes,
            concept: "APP_CLIENT_PARTIAL_PAYMENT",
            timestamp: Date.now(),
            amount: amount,
            fromId: service.client.id,
            toId: service.driver.id
          };
        }),
        mergeMap(tx => !tx ? of({}) : eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: "WalletTransactionCommited",
            eventTypeVersion: 1,
            aggregateType: "Wallet",
            aggregateId: uuidv4(),
            data: tx,
            user: "SYSTEM"
          })
        )
        ),
        mapTo(this.buildCommandAck()), // async command acknowledge
        // tap(x => ServiceCQRS.log(`ServiceCQRS.requestServices RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
        mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
        catchError(err => GraphqlResponseTools.handleError$(err, true))
      );
  }

  requestAppServices$({ root, args, jwt }, authToken) {

    const { id, tripCost, client, destinationCost } = args;
    
    args.fareDiscount = undefined;
    
    //TODO: SE COMENTA DE MOMENTO EL COSTO DEL SERVICIO Y EL DESCUENTO DEL SERVICIO
    //args.fareDiscount = client ? 0 : 0; // second zero means 0% discount
    //args.fareDiscount = (tripCost && tripCost > 0) ? 0 : args.fareDiscount;
    //args.destinationCost = (destinationCost && destinationCost > 0 && destinationCost < 4200) ? 4200 : args.destinationCost


    // ServiceClientCQRS.log(`ServiceCQRS.requestServices RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "requestServices", PERMISSION_DENIED, ["CLIENT"])
      .pipe(
        mergeMap(() => !client
          ? ServiceDA.findCurrentServicesRequestedByClient$(authToken.clientId, { _id: 1 })
            .pipe(
              toArray(),
              mergeMap(services => iif(() => services != null && services.length > 0, throwError(ERROR_23212), of('')))
            )
          : of({})
        ),
        mergeMap(() => {
          return ClientDA.findById$(authToken.clientId).pipe(
            map(tempClient => {
              return { ...args, businessId: authToken.businessId, client: { id: authToken.clientId, referrerDriverCode: tempClient.referrerDriverCode, businessId: authToken.businessId, ...args.client } }
            })
          )
        }),
        // tap(request => console.log('CLIENT REQUEST ==> ', {...request})),
        tap(request => this.validateServiceRequestInput(request)),
        mergeMap(request => eventSourcing.eventStore.emitEvent$(this.buildServiceRequestedEsEvent(authToken, request, "APP_CLIENT"))), //Build and send ServiceRequested event (event-sourcing)
        mapTo(this.buildCommandAck()), // async command acknowledge
        // tap(x => ServiceCQRS.log(`ServiceCQRS.requestServices RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
        mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
        catchError(err => GraphqlResponseTools.handleError$(err, true))
      );
  }

  RequestDeliveryService$({ root, args, jwt }, authToken) {

    const { client } = args;
    // ServiceClientCQRS.log(`ServiceCQRS.requestServices RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "requestServices", PERMISSION_DENIED, ["CLIENT", "SATELLITE"])
      .pipe(
        mergeMap(() => {
          return ClientDA.findById$(authToken.clientId).pipe(
            map(tempClient => {
              return { ...args, businessId: authToken.businessId, client: { id: authToken.clientId, businessId: authToken.businessId, ...args.client } }
            })
          )
        }),
        // tap(request => console.log('CLIENT REQUEST ==> ', {...request})),
        tap(request => this.validateServiceRequestInput(request)),
        mergeMap(request => {
          const newService = this.buildServiceRequestedEsEvent(authToken, request, "APP_DELIVERY");
          return eventSourcing.eventStore.emitEvent$(newService).pipe(mapTo(newService))
        }), //Build and send ServiceRequested event (event-sourcing)
        mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$({ ...rawResponse.data, _id: rawResponse.aid })),
        catchError(err => GraphqlResponseTools.handleError$(err, true))
      );
  }

  /**  
 * cancelService
 */
  cancelServicebyClient$({ root, args, jwt }, authToken) {
    //ServiceCQRS.log(`ServiceCQRS.cancelServicebyClient RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "cancelServicebyClient", PERMISSION_DENIED, ["CLIENT", "SATELLITE"]).pipe(
      mapTo(args),
      tap(request => this.validateServiceCancellationRequestInput({ ...request, authorType: 'CLIENT' })),
      mergeMap(request => ServiceDA.markedAsCancelledAndReturnService$(request.id, { _id: 1, state: 1, closed: 1, cancelationTryTimestamp: 1 }).pipe(first(v => v, undefined), map(service => ({ service, request })))),
      tap(({ service, request }) => { if (!service) throw ERROR_23223; }),// service does not exists
      tap(({ service, request }) => { if (service.closed || ["ON_BOARD", "DONE", "CANCELLED_CLIENT", "CANCELLED_OPERATOR", "CANCELLED_DRIVER"].includes(service.state)) throw ERROR_23224; }),// service is already closed
      mergeMap(({ service, request }) => eventSourcing.eventStore.emitEvent$(this.buildEventSourcingEvent(
        'Service',
        request.id,
        'ServiceCancelledByClient',
        { reason: request.reason, notes: request.notes },
        authToken))), //Build and send event (event-sourcing)
      mapTo(this.buildCommandAck()), // async command acknowledge
      //tap(x => ServiceCQRS.log(`ServiceCQRS.cancelServicebyClient RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  /**  
   * cancelService
   */
  cancelAppServicebyClient$({ root, args, jwt }, authToken) {
    //ServiceCQRS.log(`ServiceCQRS.cancelServicebyClient RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "cancelServicebyClient", PERMISSION_DENIED, ["CLIENT", "SATELLITE"]).pipe(
      mapTo(args),
      tap(request => this.validateServiceCancellationRequestInput({ ...request, authorType: 'APP_CLIENT' })),
      mergeMap(request => ServiceDA.markedAsCancelledAndReturnService$(request.id, { _id: 1, state: 1, businessId: 1, closed: 1, cancelationTryTimestamp: 1 }).pipe(first(v => v, undefined), map(service => ({ service, request })))),
      tap(({ service, request }) =>{
        if (service.cancelationTryTimestamp && (service.cancelationTryTimestamp + 60000) > Date.now()  ) throw ERROR_23224;
      }),
      tap(({ service, request }) => { if (!service) throw ERROR_23223; }),// service does not exists
      tap(({ service, request }) => { if (service.closed || ["ON_BOARD", "DONE", "CANCELLED_CLIENT", "CANCELLED_OPERATOR", "CANCELLED_DRIVER"].includes(service.state)) throw ERROR_23224; }),// service is already closed
      mergeMap(({ service, request }) => eventSourcing.eventStore.emitEvent$(this.buildEventSourcingEvent(
        'Service',
        request.id,
        'ServiceCancelledByClient',
        { reason: request.reason, notes: request.notes },
        authToken))), //Build and send event (event-sourcing)
      mapTo(this.buildCommandAck()), // async command acknowledge
      //tap(x => ServiceCQRS.log(`ServiceCQRS.cancelServicebyClient RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  // /**  
  //  * cancelService
  //  */
  // changeServiceState$({ root, args, jwt }, authToken) {
  //   //ServiceCQRS.log(`ServiceCQRS.cancelServicebyClient RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
  //   return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "cancelServicebyClient", PERMISSION_DENIED, ["CLIENT"]).pipe(
  //     mapTo(args),
  //     tap(request => this.validateServiceCancellationRequestInput({...request, authorType: 'CLIENT'})),
  //     mergeMap(request => ServiceDA.findById$(request.id, { _id: 1 }).pipe(first(v => v, undefined), map(service => ({ service, request })))),
  //     tap(({ service, request }) => { if (!service) throw ERROR_23223; }),// service does not exists
  //     tap(({ service, request }) => { if (service.closed || ["ON_BOARD", "DONE", "CANCELLED_CLIENT", "CANCELLED_OPERATOR", "CANCELLED_DRIVER"].includes(service.state)) throw ERROR_23224; }),// service is already closed
  //     mergeMap(({ service, request }) => eventSourcing.eventStore.emitEvent$(this.buildEventSourcingEvent(
  //       'Service',
  //       request.id,
  //       'ServiceCancelledByClient',
  //       { reason: request.reason, notes: request.notes },
  //       authToken))), //Build and send event (event-sourcing)
  //     mapTo(this.buildCommandAck()), // async command acknowledge
  //     //tap(x => ServiceCQRS.log(`ServiceCQRS.cancelServicebyClient RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
  //     mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
  //     catchError(err => GraphqlResponseTools.handleError$(err, true))
  //   );
  // }


  /**  
 * reportServiceAsArrived
 */
  changeServiceState$({ root, args, jwt }, authToken) {
    //ServiceCQRS.log(`ServiceCQRS.reportServiceAsArrived RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceClientCQRS", "changeServiceState", PERMISSION_DENIED, ["CLIENT"]).pipe(
      mapTo(args),
      mergeMap(request => ServiceDA.findById$(request.id, { _id: 1 }).pipe(first(v => v, undefined), map(service => ({ service, request })))),
      tap(({ service, request }) => { if (!service) throw ERROR_23223; }),// service does not exists
      tap(({ service, request }) => { if (service.closed) throw ERROR_23224; }),// service is already closed
      mergeMap(({ service, request }) => eventSourcing.eventStore.emitEvent$(this.buildEventSourcingEvent(
        'Service',
        request.id,
        'ServiceArrived',
        {},
        authToken))), //Build and send event (event-sourcing)
      mapTo(this.buildCommandAck()), // async command acknowledge
      //tap(x => ServiceCQRS.log(`ServiceCQRS.reportServiceAsArrived RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  /**
   * Send messages to the driver
   * @param {*} param0 
   * @param {*} authToken 
   */
  sendMessageToDriver$({ root, args, jwt }, authToken) {
    ServiceClientCQRS.log(`ServiceCQRS.sendMessageToDriver RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceClientCQRS", "SendMessageToDriver", PERMISSION_DENIED, ["CLIENT"]).pipe(
      mapTo(args),
      mergeMap(message =>
        ServiceDA.findById$(message.serviceId, { _id: 1, state: 1, closed: 1 }).pipe(first(v => v, undefined), map(service => ({ service, message })))
      ),
      tap(({ service, message }) => { if (!service) throw ERROR_23223; }),// service does not exists
      tap(({ service, message }) => { if (service.closed) throw ERROR_23224; }),// service is already closed
      mergeMap(({ service, message }) => eventSourcing.eventStore.emitEvent$(this.buildEventSourcingEvent(
        'Service',
        message.serviceId,
        'ServiceMessageSent',
        {
          from: authToken.preferred_username,
          to: message.driverUsername,
          message: {
            predefinedMessageId: message.message.predefinedMessageId,
            textMessage: message.message.textMessage
          },
          type: 'DRIVER'
        },
        authToken))), //Build and send event (event-sourcing)
      mapTo(this.buildCommandAck()), // async command acknowledge
      //tap(x => ServiceCQRS.log(`ServiceCQRS.reportServiceAsArrived RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  //#endregion

  //#region REQUEST VALIDATIONS


  /**
   * Verifies and validates all input data
   * @param {*} service request input params
   */
  validateServiceRequestInput({ businessId, client, pickUp, paymentType, requestedFeatures, dropOff, fareDiscount, fare, tip }) {
    if (!client || !client.id || !pickUp || !paymentType || !businessId) throw ERROR_23200; // insuficient data: businessId, client, pickup and payment are mandatory 
    //if (!client.fullname || client.fullname.trim().length > 50 || client.fullname.trim().length < 4) throw ERROR_23201; // invalid client name
    if (client && client.tipType && VALID_SERVICE_CLIENT_TIP_TYPES.indexOf(client.tipType) == -1) throw ERROR_23202; // invalid tip type
    if (client && client.tip && (client.tip < 0 || client.tip > 10000)) throw ERROR_23203; // invalid tip amount
    if (!pickUp.marker && !pickUp.polygon) throw ERROR_23204; // pickUp location undefined
    // if (!pickUp.addressLine1) throw ERROR_23205; //  pickup address not specified
    if (VALID_SERVICE_PAYMENT_TYPES.indexOf(paymentType) == -1) throw ERROR_23206; // invalid payment type
    if (requestedFeatures && requestedFeatures.filter(v => VALID_SERVICE_REQUEST_FEATURES.indexOf(v) == -1).length > 0) throw ERROR_23207; // invalid requested Features    
    if (dropOff && !dropOff.marker) throw ERROR_23208; //(!dropOff.polygon) dropOff location undefined
    if (fareDiscount && (fareDiscount < 0.01 || fareDiscount > 1.00)) throw ERROR_23209; // invalid fare discount amount
    if (fare && (fare < 0 || fare > 500000)) throw ERROR_23210; // invalid fare amount
    if (tip && (tip < 500 || tip > 100000)) throw ERROR_23211; // invalid tip amount
  }


  /**
   * Verifies and validates all input data
   * @param {*}  request input params
   */
  validateServiceCancellationRequestInput({ id, reason, authorType, notes }) {
    if (!id || !reason || !authorType) throw ERROR_23220; // insuficient data id, authorType and  and reason are mandatory
    if (VALID_SERVICE_CANCEL_REASON_BY_AUTHOR[authorType].indexOf(reason) == -1) throw ERROR_23222; // invalid reason type
  }

  /**
   * Verifies and validates all input data
   * @param {*}  request input params
   */
  validateServiceAssignRequestInput({ id, shiftId, vehicle, driver }) {
    if (!id || (!shiftId && (!vehicle || !driver))) throw ERROR_23225; // insuficient data: a shiftId or a driver-vehicle pair must be input
    if (shiftId && (vehicle || driver)) throw ERROR_23225; // insuficient data: a shiftId or a driver-vehicle pair must be input
    if ((vehicle && !vehicle.licensePlate) || (vehicle.licensePlate.length != 6)) throw ERROR_23226; // invalid license plate
    if ((driver && !driver.fullname) || (driver.fullname.length < 4)) throw ERROR_23227; // invalid drivers name    
  }

  /**
   * Verifies and validates all input data
   * @param {*}  request input params
   */
  validateServiceAcceptOfferInput({ serviceId, location }) {
    if (!serviceId || !location) throw ERROR_23100; // insuficient data: service and location needed
    if (!location.lat || !location.lng) throw ERROR_23100; // insuficient data: service and location needed
  }

  //#endregion

  //#region EventSourcing Events generators
  /**
   * Builds a Event-Sourcing Event of type ServiceRequested
   * @param {*} shift 
   * @returns {Event}
   */
  buildServiceRequestedEsEvent(authToken, request, sourceChannel = "CLIENT") {
    // console.log("REQUEST PARA CONSTRUIR ===> ", request);
    // All of the request performed by a client must have a fare discount of 0.1 (10%)
    let { requestedFeatures, fare, pickUp, tip, dropOff, tripCost, fareDiscount = 0 } = request;

    pickUp = !pickUp ? undefined : {
      ...pickUp,
      marker: pickUp.marker ? { type: "Point", coordinates: [pickUp.marker.lng, pickUp.marker.lat] } : {},
      polygon: undefined, //TODO: se debe convertir de graphql a geoJSON
      // addressLine1: pickUp.addressLine1 ? pickUp.addressLine1: 'Solicitud', // TODO: Eliminar cuando todas las app conductor esten actualizadas
      // zone: (pickUp.addressLine1 ? pickUp.zone: 'Solicitud'), // TODO: Eliminar cuando todas las app conductor esten actualizadas
      // neighborhood: (pickUp.addressLine1 ? pickUp.neighborhood: 'aplicativo'), // TODO: Eliminar cuando todas las app conductor esten actualizadas
    };
    dropOff = !dropOff ? undefined : {
      ...dropOff,
      marker: dropOff.marker ? { type: "Point", coordinates: [dropOff.marker.lng, dropOff.marker.lat] } : {},
      polygon: undefined, //TODO: se debe convertir de graphql a geoJSON
    };
    // console.log('on buildServiceRequestedEsEvent dropOf ==> ', dropOff);



    const _id = Crosscutting.generateDateBasedUuid();

    return new Event({
      aggregateType: 'Service',
      aggregateId: _id,
      eventType: 'ServiceRequested',
      eventTypeVersion: 1,
      sessionState: authToken.session_state,
      user: authToken.preferred_username,
      data: {
        ...request,
        pickUp,
        dropOff,
        client: {
          id: authToken.clientId,
          businessId: authToken.businessId,
          username: authToken.preferred_username,
          fullname: authToken.name,
          ...request.client,
        },
        _id,
        businessId: authToken.businessId,
        timestamp: Date.now(),
        requestedFeatures: (requestedFeatures && requestedFeatures.length == 0) ? undefined : requestedFeatures,//no empty requestedFeatures
        // fareDiscount: fareDiscount < 0.01 ? undefined : fareDiscount,
        fare: fare <= 0 ? undefined : fare,
        state: 'REQUESTED',
        stateChanges: [{
          state: 'REQUESTED',
          timestamp: Date.now(),
          location: pickUp.marker,
        }],
        tip: tip <= 0 ? undefined : tip,
        route: { type: "LineString", coordinates: [] },
        lastModificationTimestamp: Date.now(),
        closed: false,
        request: {
          sourceChannel,
          destChannel: "DRIVER_APP",
          // creationOperatorId: authToken.userId,
          // creationOperatorUsername: authToken.preferred_username,
          // ownerOperatorId: authToken.userId,
          // ownerOperatorUsername: authToken.preferred_username,
        }
      }
    });
  }

  /**
   * Generates an EventSourcing Event
   * @param {*} aggregateType 
   * @param {*} aggregateId defaults to generated DateBased Uuid
   * @param {*} eventType 
   * @param {*} data defaults to {}
   * @param {*} authToken defaults to undefined
   * @param {*} eventTypeVersion defaults to 1
   */
  buildEventSourcingEvent(aggregateType, aggregateId = Crosscutting.generateDateBasedUuid(), eventType, data = {}, authToken, eventTypeVersion = 1) {
    return new Event({
      aggregateType,
      aggregateId,
      eventType,
      eventTypeVersion,
      user: authToken.preferred_username,
      data
    });
  }

  /**
   * Build regular Command Accepted ACK
   */
  buildCommandAck() {
    return { accepted: true };
  }

  //#endregion


  //#region GraphQL response formatters

  formatServiceToGraphQLSchema(service) {
    const marker = (!service || !service.pickUp || !service.pickUp.marker) ? undefined : { lng: service.pickUp.marker.coordinates[0], lat: service.pickUp.marker.coordinates[1] };
    const dropOffMarker = (!service || !service.dropOff || !service.dropOff.marker) ? undefined : { lng: service.dropOff.marker.coordinates[0], lat: service.dropOff.marker.coordinates[1] };

    const location = (!service || !service.location) ? undefined : { lng: service.location.coordinates[0], lat: service.location.coordinates[1] };

    return !service ? undefined : { ...service, vehicle: { plate: service.vehicle ? service.vehicle.licensePlate : '' }, dropOff: { ...service.dropOff, marker: dropOffMarker }, pickUp: { ...service.pickUp, marker }, route: undefined, id: service._id, location: location };
  }



  //#endregion

  static log(msg) {
    console.log(`${dateFormat(new Date(), "isoDateTime")}: ${msg}`);
  }

}

/**
 * @returns {ServiceClientCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new ServiceClientCQRS();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
