"use strict";

const Rx = require('rxjs');
const DriverCQRS = require("./DriverCQRS")();
const DriverES = require("./DriverES")();
const DataAcess = require("./data-access/");

module.exports = {
  /**
   * domain start workflow
   */
  start$: Rx.concat(DataAcess.start$),
  /**
   * @returns {DriverCQRS}
   */
  DriverCQRS,
  /**
   * @returns {DriverES}
   */
  DriverES,
};
