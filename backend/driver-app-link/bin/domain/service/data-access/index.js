"use strict";

const { concat } = require('rxjs');

const ServiceDA = require('./ServiceDA');
const ShiftDA = require('./ShiftDA');
const ClientDA = require('./ClientDA');

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: concat(ServiceDA.start$(),ShiftDA.start$(), ClientDA.start$()),
  /**
   * @returns {ServiceDA}
   */
  ServiceDA,
  /**
   * @returns {ShiftDA}
   */
  ShiftDA,
  /**
   * @returns {ClientDA}
   */
  ClientDA,
}; 
