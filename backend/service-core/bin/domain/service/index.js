"use strict";

const Rx = require('rxjs');
const ServiceCQRS = require("./ServiceCQRS")();
const ServiceClientCQRS = require("./ServiceClientCQRS")();
const ServiceES = require("./ServiceES")();
const DataAcess = require("./data-access/");

module.exports = {
  /**
   * domain start workflow
   */
  start$: Rx.concat(DataAcess.start$),
  /**
   * @returns {ServiceES}
   */
  ServiceES,
  /**
   * @returns {ServiceCQRS}
   */
  ServiceCQRS,
  /**
   * @returns {ServiceClientCQRS}
   */
  ServiceClientCQRS
};
