"use strict";

const Rx = require('rxjs');

const ShiftDA = require("./ShiftDA");
const DriverDA = require("./DriverDA");
const VehicleDA = require("./VehicleDA");

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: Rx.concat(ShiftDA.start$(), DriverDA.start$(), VehicleDA.start$()),
  /**
   * @returns {ShiftDA}
   */
  ShiftDA,
  /**
   * @returns {DriverDA}
   */
  DriverDA,
  /**
   * @returns {VehicleDA}
   */
  VehicleDA,
};
