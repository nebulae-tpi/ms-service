"use strict";

const Rx = require('rxjs');
const ServiceCQRS = require("./ServiceCQRS")();
const ServiceES = require("./ServiceES")();
const ServiceDAL = require("./ServiceDAL")();
const DataAccess = require("./data-access/");

module.exports = {
  /**
   * domain start workflow
   */
  start$: Rx.concat(DataAccess.start$, ServiceDAL.start$()),
  /**
   * @returns {ServiceCQRS}
   */
  ServiceCQRS,
  /**
   * @returns {ServiceES}
   */
  ServiceES,
  /**
   * @returns {ServiceDAL}
   */
  ServiceDAL,
};
