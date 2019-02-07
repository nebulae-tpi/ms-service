"use strict";

const { concat } = require('rxjs');
const ShiftCQRS = require("./ShiftCQRS")();
const ShiftES = require("./ShiftES")();

const DataAccess = require("./data-access/ShiftDA");

module.exports = {
  /**
   * domain start workflow
   */
  start$: concat(DataAccess.start$()),
  /**
   * @returns {ShiftCQRS}
   */
  ShiftCQRS,
  /**
   * @returns {ShiftES}
   */
  ShiftES
};

