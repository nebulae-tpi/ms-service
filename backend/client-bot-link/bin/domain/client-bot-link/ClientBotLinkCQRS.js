'use strict'


const { of, timer, forkJoin, Observable, iif, from, empty, defer } = require("rxjs");
const { toArray, mergeMap, map, tap, filter, delay, mapTo, switchMap } = require('rxjs/operators');
const dateFormat = require('dateformat');
const uuidv4 = require("uuid/v4");
const https = require('https');
const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();

const BUSINESS_UNIT_IDS_WITH_SIMULTANEOUS_OFFERS = (process.env.BUSINESS_UNIT_IDS_WITH_SIMULTANEOUS_OFFERS || "").split(',');

const { BusinessDA } = require('./data-access')

/**
 * Singleton instance
 */
let instance;

class ClientBotLinkCQRS {

  constructor() {
  }


  //#region Object builders

  processMessageReceived$({ args }, authToken) {
    console.log("MESSAGES ====> ", JSON.stringify(args));
    if (args.messages) {
      return from(args.messages).pipe(
        tap(message => {
          this.markMessageAsRead(message)
          const content = {
            "recipient_type": "individual",
            "to": message.from,
            "type": "text",
            "text": {
              "body": "ESTOY VIVO!!!!!"
            }
          }
          const options = {
            protocol: 'https:',
            hostname: 'waba.360dialog.io',
            path: '/v1/messages/',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'D360-API-KEY': process.env.D360_API_KEY,
            }
          }
          const req = https.request(options, res => {
            let data = ''

            res.on('data', chunk => {
              data += chunk
            })

            res.on('end', () => {
              console.log(JSON.parse(data))
            })
          })
            .on('error', err => {
              console.log('Error: ', err.message)
            })
          req.write(JSON.stringify(content))
          req.end();
        })
      )
    } else {
      return of("IGNORED")
    }

  }


  markMessageAsRead(message) {
    const content = {
      "status": "read"
    }
    const options = {
      protocol: 'https:',
      hostname: 'waba.360dialog.io',
      path: `/v1/messages/${message.id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': process.env.D360_API_KEY,
      }
    }
    const req = https.request(options, res => {
      let data = ''

      res.on('data', chunk => {
        data += chunk
      })

      res.on('end', () => {
        console.log(JSON.parse(data))
      })
    })
      .on('error', err => {
        console.log('Error: ', err.message)
      })
    req.write(JSON.stringify(content))
    req.end()
  }
  //#endregion





  //#region NOT BEING CALLED AT THE MOMENT


  /**
   * Logs an error at the console.error printing only the message and the stack related to the project source code
   * @param {Error} error 
   */
  static logError(error) {
    if (!error.stack) {
      console.error(error);
      return;
    }
    try {
      const stackLines = error.stack.split('\n');
      console.error(
        new Date().toString() + ': ' + stackLines[0] + '\n' + stackLines.filter(line => line.includes('client-bot-link/bin')).join('\n') + '\n'
      );
    }
    catch (e) {
      console.error(e);
      console.error(error);
    }
  }
}

/**
 * @returns {ClientBotLinkCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new ClientBotLinkCQRS();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};