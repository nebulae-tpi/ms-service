"use strict";

const { concat } = require('rxjs');

const BusinessDA = require('./BusinessDA');

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: concat(BusinessDA.start$()),
  /**
   * @returns {BusinessDA}
   */
  BusinessDA
}; 
