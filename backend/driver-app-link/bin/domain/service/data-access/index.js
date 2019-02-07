"use strict";

const { concat } = require('rxjs');

const ServiceDA = require('./ServiceDA');

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: concat(ServiceDA.start$()),
  /**
   * @returns {ServiceDA}
   */
  ServiceDA,
};
