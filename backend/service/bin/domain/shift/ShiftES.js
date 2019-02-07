"use strict";

const { of } = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require("rxjs/operators");
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";

/**
 * Singleton instance
 */
let instance;

class ClientES {
  constructor() {}
}

/**
 * @returns {ClientES}
 */
module.exports = () => {
  if (!instance) {
    instance = new ClientES();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
