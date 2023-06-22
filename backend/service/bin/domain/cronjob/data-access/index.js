"use strict";

const { concat } = require('rxjs');

const ShiftDA = require("./ShiftDA");
const ServiceDA = require("./ServiceDA");
const BusinessDA = require("./BusinessDA");

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: concat(ShiftDA.start$(), ServiceDA.start$(), BusinessDA.start$()),
  /**
   * @returns {ShiftDA}
   */
  ShiftDA, 
  /**
   * @returns {ServiceDA}
   */
  ServiceDA,
  BusinessDA
};
