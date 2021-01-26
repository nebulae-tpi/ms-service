"use strict";

const Rx = require('rxjs');
const BusinessES = require("./BusinessES")();
const DataAccess = require("./data-access/");

module.exports = {
  /**
   * domain start workflow
   */
  start$: Rx.concat(DataAccess.start$),
  /**
   * @returns {BusinessES}
   */
  BusinessES,
};
