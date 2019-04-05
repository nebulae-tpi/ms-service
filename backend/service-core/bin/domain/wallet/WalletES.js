'use strict'

const {of} = require("rxjs");
const { tap, mergeMap, mergeMapTo, catchError, map, mapTo, delay } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";

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
                DriverDA.updateDriverWallet$(data._id, data),
                // Look for the open shift of the driver
                mergeMapTo(ShiftDA.findOpenShiftByDriver$(driverId)),
                filter(openShift => openShift != null),
                mergeMap(openShift => ShiftDA.updateShiftWallet$(openShift._id, {
                  _id: data._id,
                  pockets: data.pockets,
                  businessId: data.businessId
                })),
                mergeMap(shift => eventSourcing.eventStore.emitEvent$(this.buildShiftWalletUpdatedEsEvent(shift, state))), //Build and send ShiftWalletUpdated event (event-sourcing)
            );
    }


    /**
   * Builds a Event-Sourcing Event of type ShiftWalletUpdated
   * @param {*} shift 
   * @returns {Event}
   */
  buildShiftWalletUpdatedEsEvent(shift, state) {
    return new Event({
      aggregateType: 'Shift',
      aggregateId: shift._id,
      eventType: 'ShiftWalletUpdated',
      eventTypeVersion: 1,
      user: 'SYSTEM',
      data: { state, businessId: shift.businessId, driverUsername: shift.driver.username }
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