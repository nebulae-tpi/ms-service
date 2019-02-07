'use strict'

const {} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const ServiceDA = require('./data-access/ServiceDA');
const  { forkJoin, of, interval, from, throwError, concat, Observable, Subject } = require('rxjs');
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";

/**
 * Singleton instance
 */
let instance;

class ServiceES {

  constructor() {
      this.serviceUpdatedEventEmitter$ = new Subject();
  }

  startServiceUpdatedEmitter(){
    this.serviceUpdatedEventEmitter$
    .pipe(
        groupBy(serviceEvent => serviceEvent.aid),
        mergeMap(group$ => group$.pipe(debounceTime(5000))),
        mergeMap(service => this.sendServiceUpdatedEvent$(service))
    )
  }

   /**
   * Sends an event with the service data updated.
   * @param {*} service 
   */
  sendServiceUpdatedEvent$(serviceEvent){
    return of(serviceEvent)
    .pipe(
      mergeMap(service => ServiceDA.getService$(service._id)),
      mergeMap(service => broker.send$(MATERIALIZED_VIEW_TOPIC, 'ServiceServiceUpdatedSubscription', service))
    ).subscribe(
      (result) => {},
      (err) => { console.log(err) },
      () => { }
    );
  }

  

    /**
     * Handles the service event
     * @param {*} serviceEvent service event
     */
    handleServiceEvents$(serviceEvent) {
      console.log("handleServiceEvents => ", serviceEvent);
      return of(serviceEvent)
      .pipe(
        tap(res => {
          //console.log('serviceEvent => ', res[0])
          this.serviceUpdatedEventEmitter$.next(serviceEvent);
        }),
      );
  }


}



/**
 * @returns {ServiceES}
 */
module.exports = () => {
    if (!instance) {
        instance = new ServiceES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};