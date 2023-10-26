"use strict";

const { concat } = require('rxjs');
const ServiceDA = require("./ServiceDA");
const ClientDA = require("./ClientDA");

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: concat(ServiceDA.start$(), ClientDA.start$()),
  /**
   * @returns {ServiceDA}
   */
  ServiceDA,
  ClientDA
};
