'use strict'


const { of, timer, forkJoin, Observable, iif, from, empty, defer, range } = require("rxjs");
const { toArray, mergeMap, map, tap, filter, delay, mapTo, switchMap } = require('rxjs/operators');
const dateFormat = require('dateformat');
const uuidv4 = require("uuid/v4");
const https = require('https');
const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();

const BUSINESS_UNIT_IDS_WITH_SIMULTANEOUS_OFFERS = (process.env.BUSINESS_UNIT_IDS_WITH_SIMULTANEOUS_OFFERS || "").split(',');

const { BusinessDA, BotConversationDA, ClientDA, ServiceDA } = require('./data-access')

/**
 * Singleton instance
 */
let instance;

class ClientBotLinkCQRS {

  constructor() {
  }


  //#region Object builders

  processMessageReceived$({ args }, authToken) {
    if (args.messages) {
      const concacts = args.contacts;
      return from(args.messages).pipe(
        mergeMap(message => {
          return BotConversationDA.getBotConversation$(message.from).pipe(
            mergeMap(conversation => {
              if ((conversation || {})._id) {
                return ServiceDA.getServiceSize$({ clientId: conversation.client._id, states: ["REQUESTED", "ASSIGNED", "ARRIVED"] }).pipe(
                  mergeMap(serviceCount => {
                    return this.continueConversation$(message, conversation, conversation.client, serviceCount)
                  })
                )

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
      marker: { type: "Point", coordinates: [client.location.lng, client.location.lat] },
      addressLine1: client.generalInfo.addressLine1,
      addressLine2: client.generalInfo.addressLine2,
      city: client.generalInfo.city,
      neighborhood: client.generalInfo.neighborhood,
      zone: client.generalInfo.zone
    };

    const _id = Crosscutting.generateDateBasedUuid();
    console.log("SERVICE ID ===> ", _id)
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
          phone: client.associatedClientPhoneNumber,
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
          sourceChannel: "CHAT_SATELLITE",
          destChannel: "DRIVER_APP"
        }

      }
    };
    return new Event(requestObj);
  }

  sendTextMessage(text, waId) {
    const content = {
      "recipient_type": "individual",
      "to": waId,
      "type": "text",
      "text": {
        "body": text
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

  sendInteractiveListMessage(headerText, bodyText, listButton, listTitle, list, waId) {
    const content = {
      "recipient_type": "individual",
      "to": waId,
      "type": "interactive",
      "interactive": {
        "type": "list",
        "header": {
          "type": "text",
          "text": headerText
        },
        "body": {
          "text": bodyText
        },
        "footer": {
          "text": ""
        },
        "action": {
          "button": listButton,
          "sections": [
            {
              "title": listTitle,
              "rows": list
            }
          ]
        }
      }
    }

    console.log("CONTENT ===> ", JSON.stringify(content))

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

  sendInteractiveButtonMessage(headerText, bodyText, buttons, waId) {
    const content = {
      "recipient_type": "individual",
      "to": waId,
      "type": "interactive",
      "interactive": {
        "type": "button",
        "header": {
          "type": "text",
          "text": headerText
        },
        "body": {
          "text": bodyText
        },
        "footer": {
          "text": ""
        },
        "action": {
          "buttons": buttons.map(button => {
            return {
              "type": "reply",
              "reply": {
                "id": button.id,
                "title": button.text
              }
            }
          })
        }
      }
    }
    console.log("CONTENT ===> ", JSON.stringify(content));
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

  requestService$(serviceCount, serviceToRqstCount, client, waId) {
    const serviceLimit = parseInt(process.env.SATELLITE_SERVICE_LIMIT || "5");
    const availableServiceCount = serviceLimit - serviceCount;
    const servicesToRequest = serviceToRqstCount;
    const availableServices = availableServiceCount - servicesToRequest
    if (availableServices >= 0 && availableServices <= 5) {
      return range(1, servicesToRequest).pipe(
        mergeMap(() => {
          return eventSourcing.eventStore.emitEvent$(this.buildServiceRequestedEsEvent(client));
        }),
        toArray(),
        tap(() => {
          this.sendTextMessage(`Servicio creado exitosamente`, waId)
        })
      )
    } else {
      this.sendTextMessage(`El maximo numero de servicios activos al tiempo son ${serviceLimit}, actualemente tienes posibilidad de tomar ${availableServiceCount} servicios`, waId);
      return of({})
    }
  }

  infoService$(clientId, waId){
    return ServiceDA.getServices$({ clientId: clientId, states: ["REQUESTED", "ASSIGNED", "ARRIVED"] }).pipe(
      toArray(),
      tap(result => {
        if (result.length > 0) {
          const listElements = result.map(val => {
            const currentDate = new Date(new Date(val.timestamp).toLocaleString(undefined, { timeZone: 'America/Bogota' }));
            const ddhh = dateFormat(currentDate, "HH:MM");
            const assignedData = val.state === "REQUESTED" ? "" : `, tomado por ${val.driver.fullname} en el vehículo identificado con las placas ${val.vehicle.licensePlate}`
            return { id: `CANCEL_${val._id}`, title: `Hora ${ddhh}`, description: `${val.pickUp.addressLine1}${assignedData}` }
          });
          this.sendInteractiveListMessage("Tienes el/los siguiente(s) servicios activos con nosotros", result.reduce((acc, val) => {
            const currentDate = new Date(new Date(val.timestamp).toLocaleString(undefined, { timeZone: 'America/Bogota' }));
            const ddhh = dateFormat(currentDate, "HH:MM");
            const assignedData = val.state === "REQUESTED" ? "" : `, tomado por ${val.driver.fullname} en el vehículo identificado con las placas ${val.vehicle.licensePlate}`
            acc = `- ${val.pickUp.addressLine1} solicitado a las ${ddhh}${assignedData}\n`
            return acc;
          }, ""), "Cancelar Servicio", "Servicios", listElements, waId)
        } else {
          this.sendTextMessage(`Actualmente no se tienen servicios activos`, waId)
        }
      })
    )
    
  }

  continueConversation$(message, conversationContent, client, serviceCount) {
    let content;
    const serviceLimit = parseInt(process.env.SATELLITE_SERVICE_LIMIT || "5");
    const availableServiceCount = serviceLimit - serviceCount;
    if (((message || {}).text || {}).body) {
      if (message.text.body.includes("🚕") || message.text.body.includes("🚖") || message.text.body.includes("🚙") || message.text.body.includes("🚘")) {
        return this.requestService$(serviceCount, message.text.body.length / 2, client, conversationContent.waId);
      }
      else if (!isNaN(message.text.body)) {
        return this.requestService$(serviceCount, parseInt(message.text.body), client, conversationContent.waId);
      }
      else if (message.text.body === "?" || message.text.body === "❓") {
        return this.infoService$(client._id, conversationContent.waId)
      }
      else {
        return of({}).pipe(
          tap(() => {
            const buttons = [
              {
                id: "rqstServiceBtn",
                text: "Solicitar 1 servicio"
              },
              {
                id: "infoServiceBtn",
                text: "Info de servicios"
              }
            ]
            this.sendInteractiveButtonMessage("Lo sentimos, no entendimos tu solicitud.", "Este es el menu y la forma de uso\n- Enviar el numero de servicios a pedir, ej 2\n- Enviar uno o varios Emojis de vehiculos segun los servicos a pedir, ej: 🚖\n- enviar un signo de pregunta para saber la informacion de tus servicos.  Ej ? o ❓\n- seleccionar una de las siguientes opciones", buttons, conversationContent.waId)
          })
        )
      }
    }
    else {
      const interactiveResp = (((message.interactive || {}).button_reply || {}).id) || ((message.interactive || {}).list_reply || {}).id;
      console.log("MESSAGE ===> ", message);
      switch (interactiveResp) {
        case "rqstServiceBtn":
          return this.requestService$(serviceCount, 1, client, conversationContent.waId)
        case "infoServiceBtn":
          return of({}).pipe(
            tap(() => {
              this.infoService$(client._id, conversationContent.waId)
            })
          )
        default:
          if(interactiveResp.includes("CANCEL_")){
            return ServiceDA.setCancelStateAndReturnService$(interactiveResp.replace("CANCEL_",""), "CANCELLED_CLIENT", Date.now(), {timestamp: 1}).pipe(
              tap(val => {
                const currentDate = new Date(new Date(val.timestamp).toLocaleString(undefined, { timeZone: 'America/Bogota' }));
                const ddhh = dateFormat(currentDate, "HH:MM");
                this.sendTextMessage(`El servicio creado a las ${ddhh} ha sido cancelado`, conversationContent.waId)
              })
            )
          }else {
            return of({});
          }
      }
    }


  }

  initConversation$(id, conversationContent, message) {
    const phoneNumber = conversationContent.waId.replace("57", "");
    return ClientDA.getClientByPhoneNumber$(parseInt(phoneNumber, { satelliteId: 1 })).pipe(
      mergeMap(client => {
        if ((client || {})._id) {
          return ClientDA.getClient$(client.satelliteId).pipe(
            mergeMap(satelliteClient => {
              const c = { ...satelliteClient, associatedClientId: client._id, associatedClientPhoneNumber: phoneNumber }
              return BotConversationDA.createConversation$(id, { ...conversationContent, client: c }).pipe(
                mergeMap(() => {
                  return ServiceDA.getServiceSize$({ clientId: client._id, states: ["REQUESTED", "ASSIGNED", "ARRIVED"] }).pipe(
                    mergeMap(result => {
                      console.log("RESULT ==> ", result)
                      return this.continueConversation$(message, conversationContent, c);
                    })
                  )
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