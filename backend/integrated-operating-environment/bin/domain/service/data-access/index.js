"use strict";

const Rx = require('rxjs');

const ShiftDA = require("./ShiftDA");
const ServiceDA = require("./ServiceDA");
const BusinessDA = require("./BusinessDA");

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: Rx.concat(ShiftDA.start$(), ServiceDA.start$(), BusinessDA.start$()),
  /**
   * @returns {ShiftDA}
   */
  ShiftDA,
  /**
   * @returns {ServiceDA}
   */
  ServiceDA,
  /**
   * @returns {BusinessDA}
   */
  BusinessDA,
};
