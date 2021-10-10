"use strict";
const { of, from, concat } = require("rxjs");
const eventSourcing = require("../../tools/EventSourcing")();
const { ShiftES } = require("../../domain/shift");
const { DriverES } = require("../../domain/driver");
const { VehicleES } = require("../../domain/vehicle");
const { ServiceES } = require("../../domain/service");
const { WalletES } = require("../../domain/wallet");
const { map, switchMap, filter, mergeMap, concatMap } = require('rxjs/operators');
/**
 * Singleton instance
 */
let instance;
/**
 * Micro-BackEnd key
 */
const mbeKey = "ms-service_mbe_service-core_190205";

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
      eventSourcing.eventStore.ensureAcknowledgeRegistry$(aggregateType,mbeKey).pipe(
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
    return eventSourcing.eventStore.ensureAcknowledgeRegistry$(aggregateType,mbeKey).pipe(
      switchMap(() => eventSourcing.eventStore.retrieveUnacknowledgedEvents$(aggregateType, mbeKey)),
      filter(evt => evt.et === eventType),
      concatMap(evt => concat(
        //MANDATORY:  ACKWOWLEDGE THIS EVENT WAS PROCESSED
        eventSourcing.eventStore.acknowledgeEvent$(evt, mbeKey),
        handler.fn.call(handler.obj, evt),        
      ))
    );
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  /////////////////// CONFIG SECTION, ASSOC EVENTS AND PROCESSORS BELOW     //////////////
  ////////////////////////////////////////////////////////////////////////////////////////

  generateFunctionMap() {
    return {

      //SHIFT 
      ShiftStarted: { fn: ShiftES.handleShiftStarted$, obj: ShiftES },
      ShiftStateChanged: { fn: ShiftES.handleShiftStateChanged$, obj: ShiftES },
      ShiftConnected: { fn: ShiftES.handleShiftConnected$, obj: ShiftES },
      ShiftDisconnected: { fn: ShiftES.handleShiftDisconnected$, obj: ShiftES },
      ShiftStopped: { fn: ShiftES.handleShiftStopped$, obj: ShiftES },
      ShiftVehicleBlockRemoved: { fn: ShiftES.handleShiftVehicleBlockRemoved$, obj: ShiftES },
      ShiftVehicleBlockAdded: { fn: ShiftES.handleShiftVehicleBlockAdded$, obj: ShiftES },
      ShiftDriverBlockRemoved: { fn: ShiftES.handleShiftDriverBlockRemoved$, obj: ShiftES },
      ShiftDriverBlockAdded: { fn: ShiftES.handleShiftDriverBlockAdded$, obj: ShiftES },
      ShiftLocationReported: { fn: ShiftES.handleShiftLocationReported$, obj: ShiftES },
      //DRIVER
      DriverBlockRemoved: { fn: DriverES.handleDriverBlockRemoved$, obj: DriverES },
      DriverBlockAdded: { fn: DriverES.handleDriverBlockAdded$, obj: DriverES },
      DriverCodeAdded: { fn: DriverES.handleDriverCodeAdded$, obj: DriverES },
      //VEHICLE
      VehicleBlockRemoved: { fn: VehicleES.handleVehicleBlockRemoved$, obj: VehicleES },
      VehicleBlockAdded: { fn: VehicleES.handleVehicleBlockAdded$, obj: VehicleES },
      VehicleSubscriptionTypeUpdated: { fn: VehicleES.handleVehicleSubscriptionTypeUpdated$, obj: VehicleES },
      //SERVICE
      ServiceRequested: { fn: ServiceES.handleServiceRequested$, obj: ServiceES },
      ServiceAssigned: { fn: ServiceES.handleServiceAssigned$, obj: ServiceES },
      ServicePickUpETAReported: { fn: ServiceES.handleServicePickUpETAReported$, obj: ServiceES },
      ServiceLocationReported: { fn: ServiceES.handleServiceLocationReported$, obj: ServiceES },
      ServiceArrived: { fn: ServiceES.handleServiceArrived$, obj: ServiceES },
      ServicePassengerBoarded: { fn: ServiceES.handleServicePassengerBoarded$, obj: ServiceES },
      ServiceCompleted: { fn: ServiceES.handleServiceCompleted$, obj: ServiceES },
      ServiceDropOffETAReported: { fn: ServiceES.handleServiceDropOffETAReported$, obj: ServiceES },
      ServiceCancelledByDriver: { fn: ServiceES.handleServiceCancelledByDriver$, obj: ServiceES },
      ServiceCancelledByClient: { fn: ServiceES.handleServiceCancelledByClient$, obj: ServiceES },
      ServiceCancelledByOperator: { fn: ServiceES.handleServiceCancelledByOperator$, obj: ServiceES },
      ServiceCancelledBySystem: { fn: ServiceES.handleServiceCancelledBySystem$, obj: ServiceES },
      ServiceClosed: { fn: ServiceES.handleServiceClosed$, obj: ServiceES },
      ServiceMessageSent: { fn: ServiceES.handleServiceMessageSent$, obj: ServiceES },
      // WALLET
      WalletUpdated: { fn: WalletES.handleWalletUpdated$, obj: WalletES }
    };
  }

  /**
  * Generates a map that assocs each AggretateType withs its events
  */
  generateAggregateEventsArray() {
    return [
      //SHIFT
      { aggregateType: "Shift", eventType: "ShiftStarted" },
      { aggregateType: "Shift", eventType: "ShiftStateChanged" },
      { aggregateType: "Shift", eventType: "ShiftConnected" },
      { aggregateType: "Shift", eventType: "ShiftDisconnected" },
      { aggregateType: "Shift", eventType: "ShiftStopped" },
      { aggregateType: "Shift", eventType: "ShiftVehicleBlockRemoved" },
      { aggregateType: "Shift", eventType: "ShiftVehicleBlockAdded" },
      { aggregateType: "Shift", eventType: "ShiftDriverBlockRemoved" },
      { aggregateType: "Shift", eventType: "ShiftDriverBlockAdded" },
      { aggregateType: "Shift", eventType: "ShiftLocationReported" },
      //VEHICLE
      { aggregateType: "Vehicle", eventType: "VehicleBlockRemoved" },
      { aggregateType: "Vehicle", eventType: "VehicleBlockAdded" },
      { aggregateType: "Vehicle", eventType: "VehicleSubscriptionTypeUpdated" },
      //DRIVER  
      { aggregateType: "Driver", eventType: "DriverBlockRemoved" },
      { aggregateType: "Driver", eventType: "DriverBlockAdded" },
      {
        aggregateType: "Driver",
        eventType: "DriverCodeAdded"
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
      { aggregateType: "Service", eventType: "ServiceCancelledBySystem" },      
      { aggregateType: "Service", eventType: "ServiceClosed" },
      { aggregateType: "Service", eventType: "ServiceMessageSent" },
      //WALLET
      { aggregateType: "Wallet", eventType: "WalletUpdated" },
    ]
  }
}

/**
 * @returns {EventStoreService}
 */
module.exports = () => {
  if (!instance) {
    instance = new EventStoreService();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};

