"use strict";

const { concat } = require('rxjs');
const BusinessES = require("./BusinessES")();
const DataAccess = require("./data-access");

module.exports = {
  /**
   * domain start workflow
   */
  // start$: concat(DataAccess.start$()),
  start$: concat(DataAccess.start$),
  /**
   * @returns {BusinessES}
   */
  BusinessES
};

