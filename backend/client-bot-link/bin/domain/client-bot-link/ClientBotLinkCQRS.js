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

const { BusinessDA, BotConversationDA, ClientDA } = require('./data-access')

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
      const concacts = args.contacts;
      return from(args.messages).pipe(
        mergeMap(message => {
          return BotConversationDA.getBotConversation$(message.from).pipe(
            mergeMap(conversation => {
              if ((conversation || {})._id) {
                this.continueConversation(message, conversation, conversation.client)
                //ACA REALIZAR EL PROCESO DE SOLICITUD DE SERVICIO
                return of({});
              } else {
                return this.initConversation$(message.from, {
                  waId: message.from,
                  timestamp: message.timestamp,
                  client: {},
                }, message)
              }
            })
          )
        }),
        tap(message => {
          this.markMessageAsRead(message);
          const profileName = ((concacts.find(c => c.wa_id === message.from) || {}).profile || {}).name;
          const content = this.assignAction(message, profileName);
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

  buildServiceRequestedEsEvent(client) {
    const pickUp = {
      marker:  { type: "Point", coordinates: [client.location.lng, client.location.lat] },
    };

    const _id = Crosscutting.generateDateBasedUuid();
    const requestObj = {
      aggregateType: 'Service',
      aggregateId: _id,
      eventType: 'ServiceRequested',
      eventTypeVersion: 1,
      user: "SYSTEM",
      data: {
        pickUp,
        dropOff: undefined,
        client: {
          id: client._id,
          businessId: "bf2807e4-e97f-43eb-b15d-09c2aff8b2ab",
          username: "N/A",
          fullname: client.generalInfo.name,
          tipClientId: client.associatedClientId,
          tip: client.satelliteInfo.tip,
          referrerDriverDocumentId: client.referrerDriverDocumentId,
          offerMinDistance: client.satelliteInfo.offerMinDistance,
          offerMaxDistance: client.satelliteInfo.offerMaxDistance
        },
        _id,
        businessId: "bf2807e4-e97f-43eb-b15d-09c2aff8b2ab",
        timestamp: Date.now(),
        requestedFeatures: undefined,
        
        //TODO: SE COMENTA DE MOMENTO EL COSTO DEL SERVICIO Y EL DESCUENTO DEL SERVICIO
        //fareDiscount: fareDiscount < 0.01 ? undefined : fareDiscount,
        fare: 0,
        state: 'REQUESTED',
        stateChanges: [{
          state: 'REQUESTED',
          timestamp: Date.now(),
          location: pickUp.marker,
        }],
        tip: 0,
        route: { type: "LineString", coordinates: [] },
        lastModificationTimestamp: Date.now(),
        closed: false,
        request: {
            sourceChannel : "CLIENT",
            destChannel : "DRIVER_APP"
          }
        
      }
    };
    return new Event(requestObj);
  }
  
  continueConversation(message, conversationContent, client) {
    let content;
    if (((message || {}).text || {}).body) {
      if (message.text.body.contains("🚕") || message.text.body.contains("🚖") || message.text.body.contains("🚙") || message.text.body.contains("🚘")) {+
        eventSourcing.eventStore.emitEvent$(this.buildServiceRequestedEsEvent(client));
        content = {
          "recipient_type": "individual",
          "to": conversationContent.waId,
          "type": "text",
          "text": {
            "body": `Servicio ejecutado correctamente`
          }
        }
        message.text.body.length
      }
      else if (!isNaN(message.text.body)) {
        content = {
          "recipient_type": "individual",
          "to": conversationContent.waId,
          "type": "text",
          "text": {
            "body": `ELSE IF`
          }
        }
      }else{
        content = {
          "recipient_type": "individual",
          "to": conversationContent.waId,
          "type": "text",
          "text": {
            "body": `ELSE`
          }
        }
      }
    }
    else {
      switch (((message.interactive || {}).button_reply || {}).id) {
        case "a3c3596f-6339-4cdd-870b-26b7957285cb":
          content = {
            "recipient_type": "individual",
            "to": conversationContent.waId,
            "type": "text",
            "text": {
              "body": `Para poder realizar la solicitud de servicio se debe compartir la ubicación (Presionar el icono 📎 o +, seleccionar la opción "ubicación" y "envia tu ubicación actual. \nPuedes ver un video tutorial para compartir la ubicación desde el celular \n VIDEO AQUI)`
            }
          }
          break;
        default:
          content = {
            "recipient_type": "individual",
            "to": conversationContent.waId,
            "type": "text",
            "text": {
              "body": `UBICACION ===> ${(message.location || {}).latitude}, ${(message.location || {}).longitude}`
            }
          }
          break;
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
        //console.log(JSON.parse(data))
      })
    })
      .on('error', err => {
        console.log('Error: ', err.message)
      })
    req.write(JSON.stringify(content))
    req.end();
  }

  initConversation$(id, conversationContent, message) {
    const phoneNumber = conversationContent.waId.replace("57", "");
    return ClientDA.getClientByPhoneNumber$(parseInt(phoneNumber, {satelliteId: 1})).pipe(
      mergeMap(client => {
        if ((client || {})._id) {
          return ClientDA.getClient$(client._id).pipe(
            mergeMap(satelliteClient => {
              const c = {...satelliteClient, associatedClientId: client._id}
              return BotConversationDA.createConversation$(id, { ...conversationContent, client: c }).pipe(
                tap(() => {
                  this.continueConversation(message, conversationContent,c);
                })
              )
            })
          )
        } else {
          return of({}).pipe(
            tap(() => {
              const content = {
                "recipient_type": "individual",
                "to": conversationContent.waId,
                "type": "interactive",
                "interactive": {
                  "type": "button",
                  "header": {
                    "type": "text",
                    "text": "Hola, Bienvenido al TX BOT"
                  },
                  "body": {
                    "text": "Actualmente no hay un usuario registrado en nuestro sistema,  se requiere hacer el proceso de registro para poder utilizar las funciones del BOT"
                  },
                  "footer": {
                    "text": ""
                  },
                  "action": {
                    "buttons": [
                      {
                        "type": "reply",
                        "reply": {
                          "id": "a3c3596f-6339-4cdd-870b-26b7957285cb",
                          "title": "OK"
                        }
                      }
                    ]
                  }
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
        }
      })
    )

  }

  assignAction(message, name) {
    const content = {
      "recipient_type": "individual",
      "to": message.from,
      "type": "interactive",
    }

    switch (((message.interactive || {}).list_reply || {}).title) {
      case "Nueva Lista":
        content.interactive = {
          "type": "list",
          "header": {
            "type": "text",
            "text": `Hola ${name}, Bienvenido al TX Bot`
          },
          "body": {
            "text": "Nueva lista generada"
          },
          "footer": {
            "text": ""
          },
          "action": {
            "button": "menú",
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
            "text": `Hola ${name}, Bienvenido al TX Bot`
          },
          "body": {
            "text": "Este es un ejemplo de mensajes interactivos, por favor seleccione una opción de la lista presentada"
          },
          "footer": {
            "text": ""
          },
          "action": {
            "button": "menú",
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
    return content;
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