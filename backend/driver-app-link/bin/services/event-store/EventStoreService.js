"use strict";
const { of, from, concat } = require("rxjs");
const eventSourcing = require("../../tools/EventSourcing")();
const { ShiftES } = require("../../domain/shift");
const { ServiceES } = require("../../domain/service");
const { BusinessES } = require("../../domain/business");
const { map, switchMap, filter, mergeMap, concatMap, tap } = require('rxjs/operators');
/**
 * Singleton instance
 */
let instance;
/**
 * Micro-BackEnd key
 */
const mbeKey = "ms-service_mbe_driver-app-link_190205";

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
      filter(evt => (evt.aggregateType != "Service" && evt.aggregateType != "Shift" )),
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
        eventSourcing.eventStore.acknowledgeEvent$(evt, mbeKey),
        handler.fn.call(handler.obj, evt),
        //MANDATORY:  ACKWOWLEDGE THIS EVENT WAS PROCESSED        
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
      ShiftWalletUpdated: { fn: ShiftES.handleShiftWalletUpdated$, obj: ShiftES },
      ShiftConnected: { fn: ShiftES.handleShiftConnected$, obj: ShiftES },
      ShiftDisconnected: { fn: ShiftES.handleShiftDisconnected$, obj: ShiftES },
      ShiftStopped: { fn: ShiftES.handleShiftStopped$, obj: ShiftES },
      ShiftVehicleBlockRemoved: { fn: ShiftES.handleShiftVehicleBlockRemoved$, obj: ShiftES },
      ShiftVehicleBlockAdded: { fn: ShiftES.handleShiftVehicleBlockAdded$, obj: ShiftES },
      ShiftDriverBlockRemoved: { fn: ShiftES.handleShiftDriverBlockRemoved$, obj: ShiftES },
      ShiftDriverBlockAdded: { fn: ShiftES.handleShiftDriverBlockAdded$, obj: ShiftES },
      ShiftLocationReported: { fn: ShiftES.handleShiftLocationReported$, obj: ShiftES },
      //SERVICE
      ServiceRequested: { fn: ServiceES.handleServiceRequested$, obj: ServiceES },
      ServiceAssigned: { fn: ServiceES.handleServiceAssigned$, obj: ServiceES },
      //ServicePickUpETAReported: { fn: ServiceES.handleServicePickUpETAReported$, obj: ServiceES },
      //ServiceLocationReported: { fn: ServiceES.handleServiceLocationReported$, obj: ServiceES },
      ServiceArrived: { fn: ServiceES.handleServiceArrived$, obj: ServiceES },
      ServicePassengerBoarded: { fn: ServiceES.handleServicePassengerBoarded$, obj: ServiceES },
      ServiceCompleted: { fn: ServiceES.handleServiceCompleted$, obj: ServiceES },
      //ServiceDropOffETAReported: { fn: ServiceES.handleServiceDropOffETAReported$, obj: ServiceES },
      ServiceCancelledByDriver: { fn: ServiceES.handleServiceCancelledByDriver$, obj: ServiceES },
      ServiceCancelledByClient: { fn: ServiceES.handleServiceCancelledByClient$, obj: ServiceES },
      ServiceCancelledByOperator: { fn: ServiceES.handleServiceCancelledByOperator$, obj: ServiceES },
      ServiceMessageSent: { fn: ServiceES.handleServiceMessageSent$, obj: ServiceES },
      //BUSINESS
      BusinessCreated: { fn: BusinessES.handleBusinessCreated$, obj: BusinessES },
      BusinessGeneralInfoUpdated: { fn: BusinessES.handleBusinessGeneralInfoUpdated$, obj: BusinessES },
      BusinessAttributesUpdated: { fn: BusinessES.handleBusinessAttributesUpdated$, obj: BusinessES },
      BusinessActivated: { fn: BusinessES.handleBusinessState$, obj: BusinessES },
      BusinessDeactivated: { fn: BusinessES.handleBusinessState$, obj: BusinessES },
      BusinessContactInfoUpdated: { fn: BusinessES.handleBusinessContactInfoUpdated$, obj: BusinessES },

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
      { aggregateType: "Shift", eventType: "ShiftWalletUpdated" },
      //SERVICE
      { aggregateType: "Service", eventType: "ServiceRequested" },
      { aggregateType: "Service", eventType: "ServiceAssigned" },
      //{ aggregateType: "Service", eventType: "ServicePickUpETAReported" },
      //{ aggregateType: "Service", eventType: "ServiceLocationReported" },
      { aggregateType: "Service", eventType: "ServiceArrived" },
      { aggregateType: "Service", eventType: "ServicePassengerBoarded" },
      { aggregateType: "Service", eventType: "ServiceCompleted" },
      //{ aggregateType: "Service", eventType: "ServiceDropOffETAReported" },
      { aggregateType: "Service", eventType: "ServiceCancelledByDriver" },
      { aggregateType: "Service", eventType: "ServiceCancelledByClient" },
      { aggregateType: "Service", eventType: "ServiceCancelledByOperator" }, 
      { aggregateType: "Service", eventType: "ServiceMessageSent" }, 
      //BUSINESS
      { aggregateType: "Business", eventType: "BusinessCreated" },
      { aggregateType: "Business", eventType: "BusinessGeneralInfoUpdated" },
      { aggregateType: "Business", eventType: "BusinessAttributesUpdated" },
      { aggregateType: "Business", eventType: "BusinessActivated" },
      { aggregateType: "Business", eventType: "BusinessDeactivated" },
      { aggregateType: "Business", eventType: "BusinessContactInfoUpdated" },
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

