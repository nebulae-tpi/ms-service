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
          this.markMessageAsRead(message);
          const content = this.assignAction(message);
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
              //console.log(JSON.parse(data))
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

  assignAction(message) {
    const content = {
      "recipient_type": "individual",
      "to": message.from,
      "type": "interactive",
    }

    switch (message.text.body) {
      case "Nueva Lista":
        content.interactive = {
          "type": "list",
          "header": {
            "type": "text",
            "text": "Hola, Bienvenido al TX Bot"
          },
          "body": {
            "text": "Nueva lista generada"
          },
          "footer": {
            "text": ""
          },
          "action": {
            "button": "cta-button-content",
            "sections": [
              {
                "title": "Opciones Interactivas",
                "rows": [
                  {
                    "id": "c337ed8f-63d5-4749-8919-7ae2d523b6cf",
                    "title": "Nueva Lista"
                  },
                  {
                    "id": "49139d97-0962-4f87-bfd9-a3d572db8e80",
                    "title": "Nuevo Boton"
                  }
                ]
              }
            ]
          }
        }
        break;
      case "Nuevo Boton":
        content.interactive = {
          "type": "button",
          "header": {
            "type": "text",
            "text": "Ejemplo Boton Interactivo"
          },
          "body": {
            "text": "Este es un ejemplo de boton interactivo"
          },
          "footer": {
            "text": "pie de pagína"
          },
          "action": {
            "buttons": [
              {
                "type": "reply",
                "reply": {
                  "id": "a3c3596f-6339-4cdd-870b-26b7957285cb",
                  "title": "Boton 1"
                }
              },
              {
                "type": "reply",
                "reply": {
                  "id": "a4d5f308-e3b6-4b3a-b820-3699b47cbfb8",
                  "title": "Boton 2"
                }
              }
            ]
          }
        }
        break;
      default:
        content.interactive = {
          "type": "list",
          "header": {
            "type": "text",
            "text": "Hola, Bienvenido al TX Bot"
          },
          "body": {
            "text": "Este es un ejemplo de mensajes interactivos, por favor seleccione una opción de la lista presentada"
          },
          "footer": {
            "text": ""
          },
          "action": {
            "button": "cta-button-content",
            "sections": [
              {
                "title": "Opciones Interactivas",
                "rows": [
                  {
                    "id": "c337ed8f-63d5-4749-8919-7ae2d523b6cf",
                    "title": "Nueva Lista"
                  },
                  {
                    "id": "49139d97-0962-4f87-bfd9-a3d572db8e80",
                    "title": "Nuevo Boton"
                  }
                ]
              }
            ]
          }
        }
        break;
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
        console.log("RESP  ===> ", JSON.parse(data))
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