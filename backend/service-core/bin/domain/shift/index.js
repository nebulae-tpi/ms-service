"use strict";

const Rx = require('rxjs');
const ShiftCQRS = require("./ShiftCQRS")();
const ShiftES = require("./ShiftES")();
const DataAccess = require("./data-access/");

module.exports = {
  /**
   * domain start workflow
   */
  start$: Rx.concat(DataAccess.start$),
  /**
   * @returns {ShiftCQRS}
   */
  ShiftCQRS,
  /**
   * @returns {ShiftES}
   */
  ShiftES,
};
