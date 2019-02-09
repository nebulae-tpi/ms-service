"use strict";

const { concat } = require('rxjs');

const ServiceDA = require('./ServiceDA');
const ShiftDA = require('./ShiftDA');

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: concat(ServiceDA.start$(),ShiftDA.start$()),
  /**
   * @returns {ServiceDA}
   */
  ServiceDA,
  /**
   * @returns {ShiftDA}
   */
  ShiftDA,
};
