"use strict";

const ShiftCQRS = require("./ShiftCQRS")();
const ShiftES = require("./ShiftES")();

module.exports = {
  /**
   * @returns {ShiftCQRS}
   */
  ShiftCQRS,
  /**
   * @returns {ShiftES}
   */
  ShiftES
};

