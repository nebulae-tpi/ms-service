"use strict";

const DriverCQRS = require("./DriverCQRS")();
const DriverES = require("./DriverES")();

module.exports = {
  /**
   * @returns {DriverCQRS}
   */
  DriverCQRS,
  /**
   * @returns {DriverES}
   */
  DriverES
};
