"use strict";

const { concat } = require('rxjs');

const ServiceDA = require('./ServiceDA');
const ShiftDA = require('./ShiftDA');
const ClientDA = require('./ClientDA');
const BusinessDA = require('./BusinessDA')

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: concat(ServiceDA.start$(),ShiftDA.start$(), ClientDA.start$(), BusinessDA.start$()),
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
  /**
   * @returns {BusinessDA}
   */
  BusinessDA
}; 
