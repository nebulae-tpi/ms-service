"use strict";

const { concat } = require('rxjs');

const BusinessDA = require('./BusinessDA');
const BotConversationDA = require('./BotConversationDA')
const ClientDA = require('./ClientDA')

module.exports = {
  /**
   * Data-Access start workflow
   */
  start$: concat(BusinessDA.start$(), BotConversationDA.start$(), ClientDA.start$()),
  /**
   * @returns {BusinessDA}
   */
  BusinessDA,
  /**
   * @returns {BotConversationDA}
   */
   BotConversationDA,
   /**
   * @returns {ClientDA}
   */
    ClientDA
}; 
