'use strict'

const {} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo, groupBy, debounceTime } = require('rxjs/operators');
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
      this.startServiceUpdatedEmitter();
  }

  startServiceUpdatedEmitter(){
    this.serviceUpdatedEventEmitter$
    .pipe(
        groupBy(serviceEvent => serviceEvent.aid),
        mergeMap(group$ => group$.pipe(debounceTime(5000))),
        mergeMap(service => this.sendServiceUpdatedEvent$(service))
    ).subscribe(
      (result) => {},
      (err) => { console.log(err) },
      () => { }
    );
  }

   /**
   * Sends an event with the service data updated.
   * @param {*} service 
   */
  sendServiceUpdatedEvent$(serviceEvent){
    console.log('sendServiceUpdatedEvent => ', serviceEvent);
    return of(serviceEvent)
    .pipe(
      mergeMap(service => ServiceDA.getService$(service.aid)),
      map(service => Crosscutting.formatServiceToGraphQLSchema(service)),
      mergeMap(service => {
        console.log('ServiceServiceUpdatedSubscription => ', service);
        return broker.send$(MATERIALIZED_VIEW_TOPIC, 'ServiceServiceUpdatedSubscription', service);
      })
    );
  }  

  handleServiceClosed$(ServiceClosedEvt){
    return ServiceDA.closeService$(ServiceClosedEvt.aid)
    .pipe(
      mergeMap(() => this.handleServiceEvents$(ServiceClosedEvt))
    )
  }

    /**
     * Handles the service event
     * @param {*} serviceEvent service event
     */
    handleServiceEvents$(serviceEvent) {
      return of(serviceEvent)
      .pipe(
        
        tap(res => {
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