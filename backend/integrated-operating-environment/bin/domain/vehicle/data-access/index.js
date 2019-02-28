"use strict";

const Rx = require('rxjs');

const ShiftDA = require("./ShiftDA");
const VehicleDA = require("./VehicleDA");

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: Rx.concat(ShiftDA.start$(), VehicleDA.start$()),
  /**
   * @returns {ShiftDA}
   */
  ShiftDA,
  /**
   * @returns {VehicleDA}
   */
  VehicleDA,
};
