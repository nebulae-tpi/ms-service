"use strict";

const Rx = require('rxjs');

const ShiftDA = require("./ShiftDA");
const ServiceDA = require("./ServiceDA");
const ClientDA = require("./ClientDA");
const DriverDA = require("./DriverDA");
const VehicleDA = require("./VehicleDA");

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: Rx.concat(ShiftDA.start$(), ServiceDA.start$(), ClientDA.start$(), DriverDA.start$(), VehicleDA.start$()),
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
  /**
   * @returns {DriverDA}
   */
   DriverDA,
   /**
   * @returns {VehicleDA}
   */
    VehicleDA,
};
