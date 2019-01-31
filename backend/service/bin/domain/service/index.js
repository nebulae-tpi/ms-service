"use strict";

const ServiceCQRS = require("./ServiceCQRS")();
const ServiceES = require("./ServiceES")();

module.exports = {
  /**
   * @returns {ServiceCQRS}
   */
  ServiceCQRS,
  /**
   * @returns {ServiceES}
   */
  ServiceES
};
