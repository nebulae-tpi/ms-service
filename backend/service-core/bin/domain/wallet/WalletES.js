'use strict'

const {of} = require("rxjs");
const { tap, mergeMap, mergeMapTo, catchError, map, mapTo, delay, filter } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();

const { ShiftDA, DriverDA } = require('./data-access');

/**
 * Singleton instance
 */
let instance;

class WalletES {

    constructor() {
    }

    /**
     * Handle wallet updated event
     * @param {*} param0 
     */
    handleWalletUpdated$({ aid, data, user }) {
      console.log('* handleWalletUpdated => ', data);
        return of(data)
            .pipe(
                // DRIVER
                filter(data => data.type == 'DRIVER'),
                // Update driver wallet
                mergeMapTo(DriverDA.updateDriverWallet$(data._id, data)),
                // Look for the open shift of the driver
                mergeMapTo(ShiftDA.findOpenShiftByDriver$(data._id)),
                filter(openShift => openShift != null),
                mergeMap(openShift => ShiftDA.updateShiftWallet$(openShift._id, {
                  _id: data._id,
                  pockets: data.pockets,
                  businessId: data.businessId
                })),
                map(result => result.ops[0]),
                mergeMap(shift => eventSourcing.eventStore.emitEvent$(this.buildShiftWalletUpdatedEsEvent(shift))), //Build and send ShiftWalletUpdated event (event-sourcing)
            );
    }


    /**
   * Builds a Event-Sourcing Event of type ShiftWalletUpdated
   * @param {*} shift 
   * @returns {Event}
   */
  buildShiftWalletUpdatedEsEvent(shift) {
    console.log('buildShiftWalletUpdatedEsEvent => ', shift);
    
    return new Event({
      aggregateType: 'Shift',
      aggregateId: shift._id,
      eventType: 'ShiftWalletUpdated',
      eventTypeVersion: 1,
      user: 'SYSTEM',
      data: { businessId: shift.businessId, driverUsername: shift.driver.username }
    });
  }

    

}



/**
 * @returns {WalletES}
 */
module.exports = () => {
    if (!instance) {
        instance = new WalletES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};