"use strict";

const { concat } = require('rxjs');

const ShiftDA = require("./ShiftDA");
const DriverDA = require("./DriverDA");

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: concat(ShiftDA.start$(), DriverDA.start$()),
  /**
   * @returns {ShiftDA}
   */
  ShiftDA,

  /**
   * @returns {DriverDA}
   */
  DriverDA,
};
