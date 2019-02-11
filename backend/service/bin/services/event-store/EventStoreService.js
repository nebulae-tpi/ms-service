"use strict";
const { of, from, concat } = require("rxjs");
const eventSourcing = require("../../tools/EventSourcing")();
const { DriverES } = require("../../domain/driver");
const { ClientES } = require("../../domain/client");
const { VehicleES } = require("../../domain/vehicle");
const { ServiceES } = require("../../domain/service");
const { CronJobES } = require("../../domain/cronjob");
const { map, switchMap, filter, mergeMap, concatMap } = require('rxjs/operators');
/**
 * Singleton instance
 */
let instance;
/**
 * Micro-BackEnd key
 */
const mbeKey = "ms-service_mbe_service";

class EventStoreService {
  constructor() {
    this.functionMap = this.generateFunctionMap();
    this.subscriptions = [];
    this.aggregateEventsArray = this.generateAggregateEventsArray();
  }

  /**
   * Starts listening to the EventStore
   * Returns observable that resolves to each subscribe agregate/event
   *    emit value: { aggregateType, eventType, handlerName}
   */
  start$() {
    //default error handler
    const onErrorHandler = error => {
      console.error("Error handling  EventStore incoming event", error);
      process.exit(1);
    };
    //default onComplete handler
    const onCompleteHandler = () => {
      () => console.log("EventStore incoming event subscription completed");
    };
    console.log("EventStoreService starting ...");

    return from(this.aggregateEventsArray).pipe(
      map(aggregateEvent => ({ ...aggregateEvent, onErrorHandler, onCompleteHandler })),
      map(params => this.subscribeEventHandler(params))
    );      
  }

  /**
   * Stops listening to the Event store
   * Returns observable that resolves to each unsubscribed subscription as string
   */
  stop$() {
    return from(this.subscriptions).pipe(
      map(subscription => {
        subscription.subscription.unsubscribe();
        return `Unsubscribed: aggregateType=${aggregateType}, eventType=${eventType}, handlerName=${handlerName}`;
      })
    );
  }

  /**
     * Create a subscrition to the event store and returns the subscription info     
     * @param {{aggregateType, eventType, onErrorHandler, onCompleteHandler}} params
     * @return { aggregateType, eventType, handlerName  }
     */
  subscribeEventHandler({ aggregateType, eventType, onErrorHandler, onCompleteHandler }) {
    const handler = this.functionMap[eventType];
    const subscription =
      //MANDATORY:  AVOIDS ACK REGISTRY DUPLICATIONS
      eventSourcing.eventStore.ensureAcknowledgeRegistry$(aggregateType).pipe(
        mergeMap(() => eventSourcing.eventStore.getEventListener$(aggregateType, mbeKey, false)),
        filter(evt => evt.et === eventType),
        mergeMap(evt => concat(
          handler.fn.call(handler.obj, evt),
          //MANDATORY:  ACKWOWLEDGE THIS EVENT WAS PROCESSED
          eventSourcing.eventStore.acknowledgeEvent$(evt, mbeKey),
        ))
      )
        .subscribe(
          (evt) => {
            // console.log(`EventStoreService: ${eventType} process: ${evt}`);
          },
          onErrorHandler,
          onCompleteHandler
        );
    this.subscriptions.push({ aggregateType, eventType, handlerName: handler.fn.name, subscription });
    return { aggregateType, eventType, handlerName: `${handler.obj.name}.${handler.fn.name}` };
  }

  /**
  * Starts listening to the EventStore
  * Returns observable that resolves to each subscribe agregate/event
  *    emit value: { aggregateType, eventType, handlerName}
  */
  syncState$() {
    return from(this.aggregateEventsArray).pipe(
      concatMap(params => this.subscribeEventRetrieval$(params))
    )
  }


  /**
   * Create a subscrition to the event store and returns the subscription info     
   * @param {{aggregateType, eventType, onErrorHandler, onCompleteHandler}} params
   * @return { aggregateType, eventType, handlerName  }
   */
  subscribeEventRetrieval$({ aggregateType, eventType }) {
    const handler = this.functionMap[eventType];
    //MANDATORY:  AVOIDS ACK REGISTRY DUPLICATIONS
    return eventSourcing.eventStore.ensureAcknowledgeRegistry$(aggregateType).pipe(
      switchMap(() => eventSourcing.eventStore.retrieveUnacknowledgedEvents$(aggregateType, mbeKey)),
      filter(evt => evt.et === eventType),
      concatMap(evt => concat(
        handler.fn.call(handler.obj, evt),
        //MANDATORY:  ACKWOWLEDGE THIS EVENT WAS PROCESSED
        eventSourcing.eventStore.acknowledgeEvent$(evt, mbeKey)
      ))
    );
  }

  
  ////////////////////////////////////////////////////////////////////////////////////////
  /////////////////// CONFIG SECTION, ASSOC EVENTS AND PROCESSORS BELOW     //////////////
  ////////////////////////////////////////////////////////////////////////////////////////

  generateFunctionMap() {
    return {
      //DRIVER
      DriverCreated: {
        fn: DriverES.handleDriverCreated$,
        obj: DriverES
      },
      DriverGeneralInfoUpdated: {
        fn: DriverES.handleDriverGeneralInfoUpdated$,
        obj: DriverES
      },
      DriverStateUpdated: {
        fn: DriverES.handleDriverStateUpdated$,
        obj: DriverES
      },
      DriverAuthCreated: {
        fn: DriverES.handleDriverAuthCreated$,
        obj: DriverES 
      },
      DriverAuthDeleted: {
        fn: DriverES.handleDriverAuthDeleted$,
        obj: DriverES 
      },
      VehicleAssigned: {
        fn: DriverES.handleVehicleAssigned$,
        obj: DriverES
      },
      VehicleUnassigned: {
        fn: DriverES.handleVehicleUnassigned$,
        obj: DriverES
      },
      //VEHICLE
      VehicleCreated: {
        fn: VehicleES.handleVehicleCreated$,
        obj: VehicleES
      },
      VehicleGeneralInfoUpdated: {
        fn: VehicleES.handleVehicleGeneralInfoUpdated$,
        obj: VehicleES
      },
      VehicleStateUpdated: {
        fn: VehicleES.handleVehicleStateUpdated$,
        obj: VehicleES
      },
      VehicleFeaturesUpdated: {
        fn: VehicleES.handleVehicleFeaturesUpdated$,
        obj: VehicleES
      },      
      VehicleBlockRemoved: {
        fn: VehicleES.handleVehicleBlockRemoved$,
        obj: VehicleES
      },
      VehicleBlockAdded: {
        fn: VehicleES.handleVehicleBlockAdded$,
        obj: VehicleES
      },

      //CLIENT
      ClientSatelliteEnabled: {
        fn: ClientES.handleClientSatelliteEnabled$,
        obj: ClientES
      },
      //SERVICE
      ServiceRequested: { fn: ServiceES.handleServiceEvents$, obj: ServiceES },
      ServiceAssigned: { fn: ServiceES.handleServiceEvents$, obj: ServiceES },
      ServicePickUpETAReported: { fn: ServiceES.handleServiceEvents$, obj: ServiceES },
      ServiceLocationReported: { fn: ServiceES.handleServiceEvents$, obj: ServiceES },
      ServiceArrived: { fn: ServiceES.handleServiceEvents$, obj: ServiceES },
      ServicePassengerBoarded: { fn: ServiceES.handleServiceEvents$, obj: ServiceES },
      ServiceCompleted: { fn: ServiceES.handleServiceEvents$, obj: ServiceES },
      ServiceDropOffETAReported: { fn: ServiceES.handleServiceEvents$, obj: ServiceES },
      ServiceCancelledByDriver: { fn: ServiceES.handleServiceEvents$, obj: ServiceES },
      ServiceCancelledByClient: { fn: ServiceES.handleServiceEvents$, obj: ServiceES },
      ServiceCancelledByOperator: { fn: ServiceES.handleServiceEvents$, obj: ServiceES },
      ServiceClosed: { fn: ServiceES.handleServiceClosed$, obj: ServiceES },
      // SHIFT
      ShiftLocationReported: { fn: ServiceES.handleShiftEvents$, obj: ServiceES },
      // CRONJOB
      PeriodicFiveMinutes: {
        fn: CronJobES.handlePeriodicFiveMinutes$,
        obj: CronJobES
      },
      PeriodicFifteenMinutes: {
        fn: CronJobES.handlePeriodicFifMinutes$,
        obj: CronJobES
      }
    };
  }

  /**
  * Generates a map that assocs each AggretateType withs its events
  */
  generateAggregateEventsArray() {
    return [
      {
        aggregateType: "Driver",
        eventType: "DriverCreated"
      },
      {
        aggregateType: "Driver",
        eventType: "DriverGeneralInfoUpdated"
      },
      {
        aggregateType: "Driver",
        eventType: "DriverStateUpdated"
      },
      {
        aggregateType: "Driver",
        eventType: "DriverAuthCreated"
      },
      {
        aggregateType: "Driver",
        eventType: "DriverAuthDeleted"
      },
      {
        aggregateType: "Vehicle",
        eventType: "VehicleCreated"
      },
      {
        aggregateType: "Vehicle",
        eventType: "VehicleGeneralInfoUpdated"
      },
      {
        aggregateType: "Vehicle",
        eventType: "VehicleStateUpdated"
      },
      {
        aggregateType: "Vehicle",
        eventType: "VehicleFeaturesUpdated"
      },
      {
        aggregateType: "Driver",
        eventType: "VehicleAssigned"
      },
      {
        aggregateType: "Driver",
        eventType: "VehicleUnassigned"
      },
      {
        aggregateType: "Vehicle",
        eventType: "VehicleBlockRemoved"
      },
      {
        aggregateType: "Vehicle",
        eventType: "VehicleBlockAdded"
      },
      // CLIENT
      {
        aggregateType: "Client",
        eventType: "ClientSatelliteEnabled"
      },
      //SERVICE
      { aggregateType: "Service", eventType: "ServiceRequested" },
      { aggregateType: "Service", eventType: "ServiceAssigned" },
      { aggregateType: "Service", eventType: "ServicePickUpETAReported" },
      { aggregateType: "Service", eventType: "ServiceLocationReported" },
      { aggregateType: "Service", eventType: "ServiceArrived" },
      { aggregateType: "Service", eventType: "ServicePassengerBoarded" },
      { aggregateType: "Service", eventType: "ServiceCompleted" },
      { aggregateType: "Service", eventType: "ServiceDropOffETAReported" },
      { aggregateType: "Service", eventType: "ServiceCancelledByDriver" },
      { aggregateType: "Service", eventType: "ServiceCancelledByClient" },
      { aggregateType: "Service", eventType: "ServiceCancelledByOperator" }, 
      { aggregateType: "Service", eventType: "ServiceClosed" },
      // SHIFT
      { aggregateType: "Shift", eventType: "ShiftLocationReported" },
      // Cronjob
      { aggregateType: "Cronjob", eventType: "PeriodicFiveMinutes" },
      { aggregateType: "Cronjob", eventType: "PeriodicFifteenMinutes" },
    ]
  }
}

/**
 * @returns {EventStoreService}
 */
module.exports = () => {
  if (!instance) {
    instance = new EventStoreService();
    console.log("NEW  EventStore instance  !!");
  }
  return instance;
};

