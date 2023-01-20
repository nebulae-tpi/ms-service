"use strict";

const Rx = require('rxjs');
const ClientBotLinkCQRS = require("./ClientBotLinkCQRS")();
const DataAccess = require("./data-access");

module.exports = {
  /**
   * @returns {ClientBotLinkCQRS}
   */
   ClientBotLinkCQRS,
};
