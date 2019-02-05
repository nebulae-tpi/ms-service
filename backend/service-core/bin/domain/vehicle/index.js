"use strict";

const Rx = require('rxjs');
const VehicleCQRS = require("./VehicleCQRS")();
const VehicleES = require("./VehicleES")();
const DataAcess = require("./data-access/");

module.exports = {
  /**
   * domain start workflow
   */
  start$: Rx.concat(DataAcess.start$),
  /**
   * @returns {VehicleCQRS}
   */
  VehicleCQRS,
  /**
   * @returns {VehicleES}
   */
  VehicleES,
};
