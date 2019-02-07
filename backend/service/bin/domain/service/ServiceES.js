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
            groupBy(business => business._id),
            mergeMap(group$ => group$.pipe(debounceTime(5000))),

        )
    }

   /**
   * Sends an event with the service data updated.
   * @param {*} service 
   */
  sendServiceUpdatedEvent$(serviceEvent){
    return of(serviceEvent)
    .pipe(
      mergeMap(business => WalletDA.getWallet$(business._id)),
      mergeMap(wallet => {
        return of(wallet)
        .pipe(
          mergeMap(wallet => broker.send$(MATERIALIZED_VIEW_TOPIC, 'walletPocketUpdated', wallet)),
          mergeMap(res => {
            return eventSourcing.eventStore.emitEvent$(
              new Event({
                eventType: 'WalletPocketUpdated',
                eventTypeVersion: 1,
                aggregateType: "Wallet",
                aggregateId: wallet._id,
                data: wallet,
                user: 'SYSTEM'
              })
            );
          })
        )
      })
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