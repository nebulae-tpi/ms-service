"use strict";

const { concat } = require('rxjs');
const CronJobES = require("./CronJobES")();

const DataAccess = require("./data-access/");

module.exports = {
  /**
   * domain start workflow
   */
  // start$: concat(DataAccess.start$()),
  start$: concat(DataAccess.start$),
  /**
   * @returns {CronJobES}
   */
  CronJobES
};

