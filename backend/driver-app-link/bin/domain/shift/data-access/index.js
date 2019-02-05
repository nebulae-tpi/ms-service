"use strict";

const { concat } = require('rxjs');

const ShiftDA = require('./ShiftDA');

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: concat(ShiftDA.start$()),
  /**
   * @returns {ShiftDA}
   */
  ShiftDA,
};
