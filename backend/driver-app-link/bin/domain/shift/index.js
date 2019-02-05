"use strict";

const Rx = require('rxjs');
const ShiftCQRS = require("./ShiftCQRS")();
const ShiftES = require("./ShiftES")();
const ShiftDAL = require("./ShiftDAL")();
const DataAccess = require("./data-access/");

module.exports = {
  /**
   * domain start workflow
   */
  start$: Rx.concat(DataAccess.start$, ShiftDAL.start$()),
  /**
   * @returns {ShiftCQRS}
   */
  ShiftCQRS,
  /**
   * @returns {ShiftES}
   */
  ShiftES,
  /**
   * @returns {ShiftDAL}
   */
  ShiftDAL,
};
