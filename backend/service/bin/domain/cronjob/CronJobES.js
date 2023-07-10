"use strict";

const { of, forkJoin, range } = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo, toArray, delay } = require("rxjs/operators");
const broker = require("../../tools/broker/BrokerFactory")();
const Event = require("@nebulae/event-store").Event;
const eventSourcing = require("../../tools/EventSourcing")();
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";
const { ShiftDA, ServiceDA, BusinessDA } = require("./data-access");
const MongoDB = require("../../data/MongoDB").singleton();

/**
 * Singleton instance
 */
let instance;

class CronJobES {
  constructor() {
  }

  handlePeriodicOneMinute$() {
    return forkJoin(
      this.checkDisconnectedShifts$(),
      //this.checkClosedShifts$(),
      //this.checkServicesToClose$()
    )
  }

  handlePeriodicFiveMinutes$() {
    return forkJoin(
      //this.checkDisconnectedShifts$(),
      //this.checkClosedShifts$(),
      this.checkServicesToClose$(),
      this.checkServicesOnBoardToComplete$()
    )
  }

  handlePeriodicFifteenMinutes$() {
    return forkJoin(      
      this.checkClosedShifts$(),
      //this.checkServicesToClose$()
    )
  }

  handlePeriodicMonthly$(){
    return MongoDB.createIndexesOnHistoricalCollection$()
    .pipe(
      tap(indexCreationResult => console.log(indexCreationResult))
    );
  }

  /**
   * Gonna to search Shift that must to be disconnected and emits event for each found to disconnect it
   */
  checkDisconnectedShifts$() {
    return ShiftDA.getShiftsToDisconnect$()
      .pipe(
        // tap(shift => console.log("SHIFT TO SET AS DISCONNECTED => ", JSON.stringify(shift))),
        mergeMap(shift => this.generateEventStoreEvent$("ShiftDisconnected", 1, "Shift", shift._id, { ...shift }, "SYSTEM")),
        mergeMap(event => eventSourcing.eventStore.emitEvent$(event)),
        toArray(),
        // tap(() => console.log("ALL SHIFTS THAT MATCH WITH THE CONDITIONS WERE DISCONNECTED"))
      )
  }

  /**
   * search the shift that must to be closed and emit an event for each item to close it
   */
  checkClosedShifts$() {
    // console.log("---------- checkClosedShifts$ ------------- ");
    return ShiftDA.getShiftsToClose$()
      .pipe(
        // tap(shift => console.log("SHIFT TO CLOSE => ", JSON.stringify(shift))),
        mergeMap(shift => this.generateEventStoreEvent$("ShiftStateChanged", 1, "Shift", shift._id, { ...shift, state: "CLOSED" }, "SYSTEM")),
        mergeMap(event => eventSourcing.eventStore.emitEvent$(event)),
        toArray(),
        // tap(() => console.log("ALL SHIFTS WERE CLOSED"))
      )
  }

  /**
   * Search the services that are on OnBoard state and emit an event for each service to complete it
   */
  checkServicesOnBoardToComplete$() {
    return BusinessDA.findActiveBusiness$().pipe(
      mergeMap(business => { 
        const serviceCompletedThreshold = business.attributes.find(attr => attr.key ==="AUTO_DONE_THRESHOLD") || "1800000"
        console.log("=========================================")
        console.log("FOUND BUSINESS ===> ", {name: business.generalInfo.name, threshold:serviceCompletedThreshold })
        return ServiceDA.findServicesOnboardToComplete$(business._id, parseInt(serviceCompletedThreshold))
        .pipe(
          // tap(service => console.log("SERVICE TO COMPLETE => ", JSON.stringify(service))),
          mergeMap(service => this.generateEventStoreEvent$("ServiceCompleted", 1, "Service", service._id, { timestamp : Date.now() }, "SYSTEM")),
          mergeMap(event => eventSourcing.eventStore.emitEvent$(event)),
          toArray(),
          // tap(() => console.log("ALL SERVICES THAT MATCH WITH CONDITIONS WERE COMPLETED"))
        )
      }),
      toArray()
    )
  }

  checkServicesToClose$() {
    // console.log("-------- checkServicesToClose$ ---------");
    return ServiceDA.findServicesToClose$()
      .pipe(
        // tap(service => console.log("SERVICE TO CLOSE => ", JSON.stringify(service))),
        mergeMap(service => this.generateEventStoreEvent$("ServiceClosed", 1, "Service", service._id, { ...service }, "SYSTEM")),
        mergeMap(event => eventSourcing.eventStore.emitEvent$(event)),
        toArray(),
        // tap(() => console.log("ALL SERVICES THAT MATCH WITH CONDITIONS WERE CLOSED"))
      )
  }

  generateEventStoreEvent$(eventType, eventVersion, aggregateType, aggregateId, data, user) {
    return of(new Event({
      eventType: eventType,
      eventTypeVersion: eventVersion,
      aggregateType: aggregateType,
      aggregateId: aggregateId,
      data: data,
      user: user
    }))
  }

}

/**
 * @returns {CronJobES}
 */
module.exports = () => {
  if (!instance) {
    instance = new CronJobES();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
