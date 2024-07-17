"use strict";

const { concat } = require('rxjs');

const ShiftDA = require("./ShiftDA");
const DriverDA = require("./DriverDA");
const ClientDA = require("./ClientDA");

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: concat(ShiftDA.start$(), DriverDA.start$(), ClientDA.start$()),
  /**
   * @returns {ShiftDA}
   */
  ShiftDA,

  /**
   * @returns {DriverDA}
   */
  DriverDA,

  ClientDA
};
