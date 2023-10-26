"use strict";

const { of, forkJoin, range } = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo, toArray, delay } = require("rxjs/operators");
const { BusinessDA } = require("./data-access");

/**
 * Singleton instance
 * @type {BusinessES}
 */
let instance;

class BusinessES {
  constructor() {
  }
 
   /**
     * updates the business general info on the materialized view according to the received data from the event store.
     * @param {*} businessGeneralInfoUpdatedEvent business general info updated event
     */
    handleBusinessGeneralInfoUpdated$({ aid, data }) {  
      return BusinessDA.updateBusinessGeneralInfo$(aid, data)
  }

}

/**
 * @returns {BusinessES}
 */
module.exports = () => {
  if (!instance) {
    instance = new BusinessES();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
