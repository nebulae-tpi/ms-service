"use strict";

const { of, forkJoin } = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo, toArray, delay } = require("rxjs/operators");
const broker = require("../../tools/broker/BrokerFactory")();
const Event = require("@nebulae/event-store").Event;
const eventSourcing = require("../../tools/EventSourcing")();
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";
const { ShiftDA, ServiceDA } = require("./data-access");

/**
 * Singleton instance
 */
let instance;

class CronJobES {
  constructor() {

    of({})
    .pipe(
      delay(2000),
      mergeMap(() => 
        eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: "PeriodicFiveMinutes",
            eventTypeVersion: 1,
            aggregateType: "CronJob",
            aggregateId: 1,
            data: { },
            user: "SYSTEM"
          }))

      )
    )
    .subscribe(() =>{}, e => console.log(e), () => {});

  }

  handlePeriodicFiveMinutes$() {   
    console.log("------- handlePeriodicFiveMinutes$ ----------"); 
    return forkJoin(
      this.checkDisconnectedShifts$(),
      this.checkClosedShifts$()
    )
  }

  /**
   * Gonna to search Shift that must to be disconnected and emits event for each found to disconnect it
   */
  checkDisconnectedShifts$() {
    return ShiftDA.getShiftsToDisconnect$()
      .pipe(
        tap(shift => console.log("SHIFT TO SET AS DISCONNECTED => ", JSON.stringify(shift))),
        mergeMap(shiftToDisconnect =>
          eventSourcing.eventStore.emitEvent$(
            new Event({
              eventType: "ShiftDisconnected",
              eventTypeVersion: 1,
              aggregateType: "Shift",
              aggregateId: shiftToDisconnect._id,
              data: { ...shiftToDisconnect },
              user: "SYSTEM"
            }))
        ),
        toArray(),
        tap(() => console.log("ALL SHIFTS WERE DISCONNECTED"))
      )
  }

  /**
   * search the shift that must to be closed and emit an event for each item to close it
   */
  checkClosedShifts$(){
    return ShiftDA.getShiftsToClose$()
      .pipe(
        tap(shift => console.log("SHIFT TO CLOSE => ", JSON.stringify(shift))),
        mergeMap(shiftToClose =>
          eventSourcing.eventStore.emitEvent$(
            new Event({
              eventType: "ShiftStateChanged",
              eventTypeVersion: 1,
              aggregateType: "Shift",
              aggregateId: shiftToClose._id,
              data: { ...shiftToClose, state: "CLOSED" },
              user: "SYSTEM"
            }))
        ),
        toArray(),
        tap(() => console.log("ALL SHIFTS WERE CLOSED"))
      )

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
