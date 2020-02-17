"use strict";

const Rx = require('rxjs');

const ShiftDA = require("./ShiftDA");
const VehicleDA = require("./VehicleDA");
const DriverDA = require("./DriverDA");
const ServiceDA = require("./ServiceDA");
const BusinessDA = require("./BusinessDA");

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: Rx.concat(ShiftDA.start$(), VehicleDA.start$(), DriverDA.start$(), ServiceDA.start$(), BusinessDA.start$()),
  /**
   * @returns {ShiftDA}
   */
  ShiftDA, 
  /**
   * @returns {VehicleDA}
   */
  VehicleDA, 
  /**
   * @returns {DriverDA}
   */
  DriverDA,
  /**
   * @returns {ServiceDA}
   */
  ServiceDA,
  /**
   * @returns {BusinessDA} 
   */
  BusinessDA
};
