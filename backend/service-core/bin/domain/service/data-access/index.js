"use strict";

const Rx = require('rxjs');

const ShiftDA = require("./ShiftDA");
const ServiceDA = require("./ServiceDA");

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: Rx.concat(ShiftDA.start$(), ServiceDA.start$()),
  /**
   * @returns {ShiftDA}
   */
  ShiftDA,
  /**
   * @returns {ServiceDA}
   */
  ServiceDA,
};
