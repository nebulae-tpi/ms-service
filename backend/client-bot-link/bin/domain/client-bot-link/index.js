"use strict";

const { concat } = require('rxjs');
const ClientBotLinkCQRS = require("./ClientBotLinkCQRS")();
const DataAccess = require("./data-access");

module.exports = {
  start$: concat(DataAccess.start$),
  /**
   * @returns {ClientBotLinkCQRS}
   */
   ClientBotLinkCQRS,
};
