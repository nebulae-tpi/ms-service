"use strict";

const Rx = require('rxjs');

const ShiftDA = require("./ShiftDA");
const ServiceDA = require("./ServiceDA");
const ClientDA = require("./ClientDA");

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: Rx.concat(ShiftDA.start$(), ServiceDA.start$(), ClientDA.start$()),
  /**
   * @returns {ShiftDA}
   */
  ShiftDA,
  /**
   * @returns {ServiceDA}
   */
  ServiceDA,
  /**
   * @returns {ClientDA}
   */
  ClientDA,
};
