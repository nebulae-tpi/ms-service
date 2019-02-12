'use strict'

const {} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo, groupBy, debounceTime, filter } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const ServiceDA = require('./data-access/ServiceDA');
const  { forkJoin, of, interval, from, throwError, concat, Observable, Subject } = require('rxjs');
const Crosscutting = require('../../tools/Crosscutting');
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";

/**
 * Singleton instance
 */
let instance;

class ServiceES {

  constructor() {
      this.serviceUpdatedEventEmitter$ = new Subject();
      this.startServiceUpdatedEmitter();
  }

  startServiceUpdatedEmitter(){
    this.serviceUpdatedEventEmitter$
    .pipe(
        filter(serviceId => {
          return serviceId != null;
        }),
        groupBy(serviceId => serviceId),
        mergeMap(group$ => group$.pipe(debounceTime(1000))),
        mergeMap(serviceId => this.sendServiceUpdatedEvent$(serviceId))
    ).subscribe(
      (result) => {},
      (err) => { console.log(err) },
      () => { }
    );
  }

   /**
   * Sends an event with the service data updated.
   * @param {*} serviceId 
   */
  sendServiceUpdatedEvent$(serviceId){
    return of(serviceId)
    .pipe(
      mergeMap(serviceId => ServiceDA.getService$(serviceId)),
      map(service => Crosscutting.formatServiceToGraphQLSchema(service)),
      mergeMap(service => {
        return broker.send$(MATERIALIZED_VIEW_TOPIC, 'ServiceServiceUpdatedSubscription', service);
      })
    );
  }  

    /**
     * Handles the service event
     * @param {*} serviceEvent service event
     */
    handleServiceEvents$(serviceEvent) {
      return of(serviceEvent)
      .pipe(
        
        tap(res => {
          this.serviceUpdatedEventEmitter$.next(serviceEvent.aid);
        }),
      );
  }

      /**
     * Handles the shift event
     * @param {*} shiftEvent shift event
     */
    handleShiftEvents$(shiftEvent) {
      //console.log('handleShiftEvents => ', shiftEvent);
      return of(shiftEvent)
      .pipe(        
        tap(res => {
          this.serviceUpdatedEventEmitter$.next(shiftEvent.data.serviceId);
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