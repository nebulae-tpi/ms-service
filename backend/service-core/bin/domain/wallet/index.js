"use strict";

const Rx = require('rxjs');
const DataAccess = require("./data-access/");
const WalletES = require("./WalletES")();

module.exports = {
  /**
   * @returns {WalletES}
   */
  WalletES,
    /**
   * domain start workflow
   */
  start$: Rx.concat(DataAccess.start$),
};
