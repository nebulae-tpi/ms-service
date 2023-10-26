"use strict";

const ServiceCQRS = require("./ServiceCQRS")();
const ServiceES = require("./ServiceES")();
const DataAccess = require("./data-access");
const { concat } = require('rxjs');

module.exports = {
  start$: concat(DataAccess.start$),
  /**
   * @returns {ServiceCQRS}
   */
  ServiceCQRS,
  /**
   * @returns {ServiceES}
   */
  ServiceES
};
