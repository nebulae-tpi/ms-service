"use strict";


const dateFormat = require('dateformat');
const uuidv4 = require("uuid/v4");
const { of, interval, forkJoin, } = require("rxjs");
const { mapTo, mergeMap, catchError, map, mergeMapTo, tap, first, toArray } = require('rxjs/operators');

const RoleValidator = require("../../tools/RoleValidator");
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();
const broker = require("../../tools/broker/BrokerFactory")();
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const Crosscutting = require('../../tools/Crosscutting');
const {
  CustomError,
  DefaultError,
  INTERNAL_SERVER_ERROR_CODE,
  PERMISSION_DENIED,
  ERROR_23100, ERROR_23101, ERROR_23102, ERROR_23103, ERROR_23104, ERROR_23105,
  ERROR_23200, ERROR_23201, ERROR_23202, ERROR_23203, ERROR_23204, ERROR_23205, ERROR_23206, ERROR_23207, ERROR_23208, ERROR_23209, ERROR_23210, ERROR_23211,
  ERROR_23220, ERROR_23221, ERROR_23222, ERROR_23223, ERROR_23224, ERROR_23225, ERROR_23226, ERROR_23227, ERROR_23228, ERROR_23229,
} = require("../../tools/customError");

const { ShiftDA, ServiceDA } = require('./data-access')


const VALID_SERVICE_CLIENT_TIP_TYPES = ['CASH', 'VIRTUAL_WALLET'];
const VALID_SERVICE_PAYMENT_TYPES = ['CASH', 'CREDIT_CARD'];
const VALID_SERVICE_REQUEST_FEATURES = ['AC', 'TRUNK', 'ROOF_RACK', 'PETS', 'BIKE_RACK'];
const VALID_SERVICE_CANCEL_BY_DRIVER_REASONS = ['MECHANICAL_FAILURE', 'INVALID_ADDRESS', 'USER_DOESNT_ANSWER', 'CONGESTION_ON_THE_ROAD', 'DRUNK_USER', 'BRING_PET', 'USER_IS_NOT_HERE', 'VEHICLE_FROM_OTHER_COMPANY', 'DIFFERENT_TRIP_SERVICE', 'SERVICE_CODE'];
const VALID_SERVICE_CANCEL_BY_CLIENT_REASONS = ['PLATE_DOESNT_MATCH', 'IS_NOT_THE_DRIVER', 'IT_TAKES_TOO_MUCH_TIME', 'DOESNT_REQUIRED'];
const VALID_SERVICE_CANCEL_BY_OPERATOR_REASONS = ['IT_TAKES_TOO_MUCH_TIME', 'DOESNT_REQUIRED', 'OTHER'];
const VALID_SERVICE_CANCEL_BY_AUTHORS = ['DRIVER', 'CLIENT', 'OPERATOR'];
const VALID_SERVICE_CANCEL_REASON_BY_AUTHOR = { 'DRIVER': VALID_SERVICE_CANCEL_BY_DRIVER_REASONS, 'CLIENT': VALID_SERVICE_CANCEL_BY_CLIENT_REASONS, 'OPERATOR': VALID_SERVICE_CANCEL_BY_OPERATOR_REASONS };

/**
 * Singleton instance
 */
let instance;

class ServiceCQRS {
  constructor() {
  }


  //#region DRIVER-GATEWAY

  SendMessageToDriver$({ root, args, jwt }, authToken) {
    //ServiceCQRS.log(`ServiceCQRS.reportServiceAsArrived RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
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
          to: service.serviceId,
          message: {
            predefinedMessageId: message.predefinedMessageId,
            textMessage: message.textMessage
          }
        },
        authToken))), //Build and send event (event-sourcing)
      mapTo(this.buildCommandAck()), // async command acknowledge
      //tap(x => ServiceCQRS.log(`ServiceCQRS.reportServiceAsArrived RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

    /**  
   * Send message to the client
   */
  sendMessageToClient$({ root, args, jwt }, authToken) {
    ServiceCQRS.log(`ServiceCQRS.sendMessageToClient RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "sendMessageToClient", PERMISSION_DENIED, ["DRIVER"]).pipe(
      mapTo(args),
      // tap(request => this.validateServiceAssignRequestInput(request)),
      mergeMap(message => ServiceDA.findById$(message.serviceId, { _id: 1, 'client.username': 1 }).pipe(first(v => v, undefined), map(service => ({ service, message })))),
      tap(({ service, message }) => { if (!service) throw ERROR_23223; }),// shift does not exists
      tap(({ service, message }) => { if (service.closed) throw ERROR_23224; }),// shift is already closed

      mergeMap(({ service, message }) => {
        console.log('Envia mensaje a ES');
        return eventSourcing.eventStore.emitEvent$(this.buildEventSourcingEvent(
        'Service',
        message.serviceId,
        'ServiceMessageSent',
        {
          from: authToken.preferred_username,
          to: service.client.username,
          message: {
            predefinedMessageId: message.message.predefinedMessageId,
            textMessage: message.message.textMessage
          },
          type: 'CLIENT'
        },
        authToken))}), //Build and send event (event-sourcing)
      mapTo(this.buildCommandAck()), // async command acknowledge
      //tap(x => ServiceCQRS.log(`ServiceCQRS.assignService RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  /**
   * Command to try to accept service offer
   * @param {*} param0 
   * @param {*} authToken 
   */
  acceptServiceOffer$({ root, args, jwt }, authToken) {
    const { serviceId, shiftId } = args;
    const location = !args.location ? undefined : {
      type: "Point",
      coordinates: [args.location.lng, args.location.lat]
    }
    //ServiceCQRS.log(`ServiceCQRS.acceptServiceOffer RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "acceptServiceOffer", PERMISSION_DENIED, ["DRIVER"]).pipe(
      mapTo(args),
      tap(request => this.validateServiceAcceptOfferInput(request)),
      mergeMap(request => ShiftDA.findOpenShiftById$(request.shiftId, { state: 1, driver: 1, vehicle: 1 })),
      first(shift => shift, undefined),
      tap(shift => { if (!shift) { throw ERROR_23101; }; }),//  invalid shift
      map(shift => ({
        _id: shift._id,
        vehicle: {
          licensePlate: shift.vehicle.licensePlate,
          id: shift.vehicle.id
        },
        driver: {
          fullname: shift.driver.fullname,
          username: shift.driver.username,
          documentId: shift.driver.documentId,
          id: shift.driver.id
        },
      })),
      mergeMap(shift => ServiceDA.assignService$(serviceId, shift._id, shift.driver, shift.vehicle, location, { shiftId: 1, vehicle: 1, driver: 1, location: 1, _id: 0 })),
      mergeMap(service => eventSourcing.eventStore.emitEvent$(this.buildEventSourcingEvent(
        'Service',
        serviceId,
        'ServiceAssigned',
        { ...service, skipPersist: true },
        authToken))), //Build and send event (event-sourcing)
      mapTo(this.buildCommandAck()), // async command acknowledge
      //tap(x => ServiceCQRS.log(`ServiceCQRS.acceptServiceOffer RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  /**
   * queries a driver open service
   * @param {*} param0 
   * @param {*} authToken 
   */
  queryAssignedService$({ root, args, jwt }, authToken) {
    const { driverId } = authToken;
    //ServiceCQRS.log(`ServiceCQRS.queryAssignedService RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "queryAssignedService", PERMISSION_DENIED, ["DRIVER"]).pipe(
      mergeMap(() => ServiceDA.findOpenAssignedServiceByDriver$(driverId)),
      map(service => this.formatServiceToGraphQLSchema(service)),
      //tap(x => ServiceCQRS.log(`ServiceCQRS.queryAssignedService RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }



  /**  
   * Queries and return a Service by its ID
   */
  queryService$({ root, args, jwt }, authToken) {

    const { driverId } = authToken;

    //ServiceCQRS.log(`ServiceCQRS.queryService RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE

    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "queryService", PERMISSION_DENIED, ["DRIVER"]).pipe(
      mergeMapTo(ServiceDA.findOpenAssignedServiceByDriver$(driverId)),
      map(service => this.formatServiceToGraphQLSchema(service)),
      //tap(x => ServiceCQRS.log(`ServiceCQRS.queryService RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }


  /**  
   * Queries and return a historical Service done by the driver
   */
  queryHistoricalDriverServices$({ root, args, jwt }, authToken) {

    const { driverId } = authToken;
    let { year, month, page, count } = args;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    year = (!year || year < 2019 || year > currentYear) ? currentYear : year;
    month = (!month || month < 1 || month > 12) ? currentMonth : month;
    page = (!page || page < 0 || page > 100) ? 0 : page;
    count = (!count || count < 1 || count > 100) ? 20 : count;

    //ServiceCQRS.log(`ServiceCQRS.queryHistoricalDriverServices RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE

    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "queryService", PERMISSION_DENIED, ["DRIVER"]).pipe(
      mergeMapTo(ServiceDA.findHistoricalServiceByDriver$(driverId, year, month, page, count, {
        timestamp: 1, client: 1, pickUp: 1, tripCost: 1,
        dropOff: 1, verificationCode: 1, requestedFeatures: 1,
        paymentType: 1, fareDiscount: 1, fare: 1, tip: 1, route: 1, state: 1
      })),
      map(service => this.formatServiceToGraphQLSchema(service)),
      toArray(),
      first(arr => arr, []),
      //tap(x => ServiceCQRS.log(`ServiceCQRS.queryHistoricalDriverServices RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINEs
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  //#endregion

  //#region EMI-GATEWAY

  /**
   * Command to request a new Service.
   * @param {*} param0 
   * @param {*} authToken 
   */
  requestServices$({ root, args, jwt }, authToken) {
    const { id } = args;
    //ServiceCQRS.log(`ServiceCQRS.requestServices RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "requestServices", PERMISSION_DENIED, ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"]).pipe(
      mapTo(args),
      tap(request => this.validateServiceRequestInput({ ...request, businessId: authToken.businessId })),
      mergeMap(request => eventSourcing.eventStore.emitEvent$(this.buildServiceRequestedEsEvent(authToken, request))), //Build and send ServiceRequested event (event-sourcing)
      mapTo(this.buildCommandAck()), // async command acknowledge
      //tap(x => ServiceCQRS.log(`ServiceCQRS.requestServices RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }


  /**  
   * cancelService
   */
  cancelService$({ root, args, jwt }, authToken) {
    //ServiceCQRS.log(`ServiceCQRS.cancelService RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "cancelService", PERMISSION_DENIED, ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"]).pipe(
      mapTo(args),
      tap(request => this.validateServiceCancellationRequestInput(request)),
      mergeMap(request => ServiceDA.findById$(request.id, { _id: 1, state: 1, closed: 1 }).pipe(first(v => v, undefined), map(service => ({ service, request })))),
      tap(({ service, request }) => { if (!service) throw ERROR_23223; }),// service does not exists
      tap(({ service, request }) => { if (service.closed || ["ON_BOARD", "DONE", "CANCELLED_CLIENT", "CANCELLED_OPERATOR", "CANCELLED_DRIVER"].includes(service.state)) throw ERROR_23224; }),// service is already closed
      mergeMap(({ service, request }) => eventSourcing.eventStore.emitEvent$(this.buildEventSourcingEvent(
        'Service',
        request.id,
        request.authorType === 'CLIENT' ? 'ServiceCancelledByClient' : request.authorType === 'DRIVER' ? 'ServiceCancelledByDriver' : 'ServiceCancelledByOperator',
        { reason: request.reason, notes: request.notes },
        authToken))), //Build and send event (event-sourcing)
      mapTo(this.buildCommandAck()), // async command acknowledge
      //tap(x => ServiceCQRS.log(`ServiceCQRS.cancelService RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  /**  
   * assignService
   */
  assignService$({ root, args, jwt }, authToken) {
    //ServiceCQRS.log(`ServiceCQRS.assignService RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "assignService", PERMISSION_DENIED, ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"]).pipe(
      mapTo(args),
      tap(request => this.validateServiceAssignRequestInput(request)),
      mergeMap(request => ServiceDA.findById$(request.id, { _id: 1 }).pipe(first(v => v, undefined), map(service => ({ service, request })))),
      tap(({ service, request }) => { if (!service) throw ERROR_23223; }),// shift does not exists
      tap(({ service, request }) => { if (!service.open) throw ERROR_23224; }),// shift is already closed

      // mergeMap(({ service }) => forkJoin(
      //   iif( () =>  args.shiftId )
      // )),

      //TODO: HIGH PRIORITY
      //En caso de mandar el shiftId se debe recuperar el shift, si esta cerrado(23229) o no existe (23228) mandar exception .  desde el turno se extrae la info del driver y vehicle
      // debe tener driver.username para poder mandar el reporte al movil

      mergeMap(({ service, request }) => eventSourcing.eventStore.emitEvent$(this.buildEventSourcingEvent(
        'Service',
        request.id,
        'ServiceAssigned',
        { driver: request.driver, vehicle: request.vehicle },
        authToken))), //Build and send event (event-sourcing)
      mapTo(this.buildCommandAck()), // async command acknowledge
      //tap(x => ServiceCQRS.log(`ServiceCQRS.assignService RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  /**  
   * reportServiceAsArrived
   */
  reportServiceAsArrived$({ root, args, jwt }, authToken) {
    //ServiceCQRS.log(`ServiceCQRS.reportServiceAsArrived RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "reportServiceAsArrived", PERMISSION_DENIED, ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"]).pipe(
      mapTo(args),
      mergeMap(request => ServiceDA.findById$(request.id, { _id: 1 }).pipe(first(v => v, undefined), map(service => ({ service, request })))),
      tap(({ service, request }) => { if (!service) throw ERROR_23223; }),// service does not exists
      tap(({ service, request }) => { if (!service.open) throw ERROR_23224; }),// service is already closed
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
   * reportServicePickupETAh
   */
  reportServicePickupETA$({ root, args, jwt }, authToken) {
    //ServiceCQRS.log(`ServiceCQRS.reportServicePickupETA RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "reportServicePickupETA", PERMISSION_DENIED, ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"]).pipe(

      //tap(x => ServiceCQRS.log(`ServiceCQRS.reportServicePickupETA RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }

  /**  
   * reportServiceAsPickedUp
   */
  reportServiceAsPickedUp$({ root, args, jwt }, authToken) {
    //ServiceCQRS.log(`ServiceCQRS.reportServiceAsPickedUp RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "reportServiceAsPickedUp", PERMISSION_DENIED, ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"]).pipe(
      mapTo(args),
      mergeMap(request => ServiceDA.findById$(request.id, { _id: 1 }).pipe(first(v => v, undefined), map(service => ({ service, request })))),
      tap(({ service, request }) => { if (!service) throw ERROR_23223; }),// service does not exists
      tap(({ service, request }) => { if (!service.open) throw ERROR_23224; }),// service is already closed
      mergeMap(({ service, request }) => eventSourcing.eventStore.emitEvent$(this.buildEventSourcingEvent(
        'Service',
        request.id,
        'ServicePickedUp',
        {},
        authToken))), //Build and send event (event-sourcing)
      mapTo(this.buildCommandAck()), // async command acknowledge
      //tap(x => ServiceCQRS.log(`ServiceCQRS.reportServiceAsPickedUp RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err, true))
    );
  }


  /**  
   * reportServiceAsCompleted
   */
  reportServiceAsCompleted$({ root, args, jwt }, authToken) {
    //ServiceCQRS.log(`ServiceCQRS.reportServiceAsCompleted RQST: ${JSON.stringify(args)}`); //DEBUG: DELETE LINE
    return RoleValidator.checkPermissions$(authToken.realm_access.roles, "service-core.ServiceCQRS", "reportServiceAsCompleted", PERMISSION_DENIED, ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR", "OPERATION-SUPERVISOR"]).pipe(
      mapTo(args),
      mergeMap(request => ServiceDA.findById$(request.id, { _id: 1 }).pipe(first(v => v, undefined), map(service => ({ service, request })))),
      tap(({ service, request }) => { if (!service) throw ERROR_23223; }),// service does not exists
      tap(({ service, request }) => { if (!service.open) throw ERROR_23224; }),// service is already closed
      mergeMap(({ service, request }) => eventSourcing.eventStore.emitEvent$(this.buildEventSourcingEvent(
        'Service',
        request.id,
        'ServiceCompleted',
        {
          timestamp : Date.now()
        },
        authToken))), //Build and send event (event-sourcing)
      mapTo(this.buildCommandAck()), // async command acknowledge
      //tap(x => ServiceCQRS.log(`ServiceCQRS.reportServiceAsCompleted RESP: ${JSON.stringify(x)}`)),//DEBUG: DELETE LINE
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
    if (!client || !pickUp || !paymentType || !businessId) throw ERROR_23200; // insuficient data: businessId, client, pickup and payment are mandatory 
    if (!client.fullname || client.fullname.trim().length > 50 || client.fullname.trim().length < 4) throw ERROR_23201; // invalid client name
    if (client.tipType && VALID_SERVICE_CLIENT_TIP_TYPES.indexOf(client.tipType) == -1) throw ERROR_23202; // invalid tip type
    if (client.tip && (client.tip < 0 || client.tip > 10000)) throw ERROR_23203; // invalid tip amount
    if (!pickUp.marker && !pickUp.polygon) throw ERROR_23204; // pickUp location undefined
    if (!pickUp.addressLine1) throw ERROR_23205; //  pickup address not specified
    if (VALID_SERVICE_PAYMENT_TYPES.indexOf(paymentType) == -1) throw ERROR_23206; // invalid payment type
    if (requestedFeatures && requestedFeatures.filter(v => VALID_SERVICE_REQUEST_FEATURES.indexOf(v) == -1).length > 0) throw ERROR_23207; // invalid requested Features    
    if (dropOff && !dropOff.marker && !dropOff.polygon) throw ERROR_23208; // dropOff location undefined
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
    if (VALID_SERVICE_CANCEL_BY_AUTHORS.indexOf(authorType) == -1) throw ERROR_23221; // invalid Author type
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
  buildServiceRequestedEsEvent(authToken, request) {

    let { requestedFeatures, fareDiscount, fare, pickUp, tip, dropOff } = request;

    pickUp = !pickUp ? undefined : {
      ...pickUp,
      marker: pickUp.marker ? { type: "Point", coordinates: [pickUp.marker.lng, pickUp.marker.lat] } : {},
      polygon: undefined, //TODO: se debe convertir de graphql a geoJSON
    };
    dropOff = !dropOff ? undefined : {
      ...dropOff,
      marker: dropOff.marker ? { type: "Point", coordinates: [dropOff.marker.lng, dropOff.marker.lat] } : {},
      polygon: undefined, //TODO: se debe convertir de graphql a geoJSON
    };


    const _id = Crosscutting.generateDateBasedUuid();

    return new Event({
      aggregateType: 'Service',
      aggregateId: _id,
      eventType: 'ServiceRequested',
      eventTypeVersion: 1,
      user: authToken.preferred_username,
      data: {
        ...request,
        pickUp,
        dropOff,
        client: {
          id: authToken.clientId,
          businessId: authToken.businessId,
          username: authToken.preferred_username,
          ...request.client,
        },
        _id,
        businessId: authToken.businessId,
        timestamp: Date.now(),
        requestedFeatures: (requestedFeatures && requestedFeatures.length == 0) ? undefined : requestedFeatures,//no empty requestedFeatures
        fareDiscount: fareDiscount < 0.01 ? undefined : fareDiscount,
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
    const pickUpMarker = (!service || !service.pickUp || !service.pickUp.marker) ? undefined : { lng: service.pickUp.marker.coordinates[0], lat: service.pickUp.marker.coordinates[1] };
    const dropOffMarker = (!service || !service.dropOff || !service.dropOff.marker) ? undefined : { lng: service.dropOff.marker.coordinates[0], lat: service.dropOff.marker.coordinates[1] };

    return !service ? undefined : { ...service,
      vehicle: { plate: service.vehicle ? service.vehicle.licensePlate : '' },
      pickUp: { ...service.pickUp, marker: pickUpMarker },
      dropOff: { ...service.dropOff, marker: dropOffMarker },
      route: undefined, id: service._id };
  }



  //#endregion

  static log(msg) {
    console.log(`${dateFormat(new Date(), "isoDateTime")}: ${msg}`);
  }

}

/**
 * @returns {ServiceCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new ServiceCQRS();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
