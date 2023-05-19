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

const satelliteAirtportPrices = JSON.parse('{"PORTER_LODGE":5000, "age":30, "HOTEL":10000}')
const availableTestNumbers = ["573155421851", "573015033132", "573013917663"]

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
          return this.initConversation$(message.from, {
            waId: message.from,
            timestamp: message.timestamp,
            client: {},
          }, message)
        }),
        tap(message => {
          //this.markMessageAsRead(message);
        })
      )
    } else {
      return of("IGNORED")
    }

  }

  buildServiceRequestedEsEvent(client, acEnabled, airportTipEnabled, vipEnabled, filters) {
    const pickUp = {
      marker: { type: "Point", coordinates: [client.location.lng, client.location.lat] },
      addressLine1: client.generalInfo.addressLine1,
      addressLine2: client.generalInfo.addressLine2,
      city: client.generalInfo.city,
      neighborhood: client.generalInfo.neighborhood,
      zone: client.generalInfo.zone
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
          businessId: "75cafa6d-0f27-44be-aa27-c2c82807742d",
          username: "N/A",
          fullname: client.generalInfo.name,
          tipClientId: client.associatedClientId,
          tipType: client.satelliteInfo.tipType,
          phone: client.associatedClientPhoneNumber,
          tip: airportTipEnabled ? satelliteAirtportPrices[client.satelliteInfo.satelliteType || "PORTER_LODGE"] : client.satelliteInfo.tip,
          referrerDriverDocumentId: client.satelliteInfo.referrerDriverDocumentId,
          referrerDriverDocumentIds: client.satelliteInfo.referrerDriverDocumentIds,
          offerMinDistance: client.satelliteInfo.offerMinDistance,
          offerMaxDistance: client.satelliteInfo.offerMaxDistance
        },
        _id,
        businessId: "75cafa6d-0f27-44be-aa27-c2c82807742d",
        timestamp: Date.now(),
        requestedFeatures: filters ? filters : (acEnabled) ? ["AC"] : vipEnabled ? ["VIP"] : airportTipEnabled ? ["VIP", "AC"] : undefined,

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
          sourceChannel: "CHAT_SATELITE",
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
        console.log('Error sendTextMessage: ', err.message)
      })
    req.write(JSON.stringify(content))
    req.end();
    console.log("ENVIA MENSAJE ===> ", text, ": ", waId)
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
        console.log('Error sendInteractiveListMessage: ', err.message)
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
        console.log('Error sendInteractiveButtonMessage: ', err.message)
      })
    req.write(JSON.stringify(content))
    req.end();
  }

  sendInteractiveCatalogMessage(headerText, bodyText, waId) {
    const content = {
      "recipient_type": "individual",
      "to": waId,
      "type": "interactive",
      "interactive": {
        "type": "product_list",
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
          "catalog_id": "6099177246837975",
          "sections": [
            {
              "title": "Filtros",
              "product_items": [
                {
                  "product_retailer_id": "AC"
                },
                {
                  "product_retailer_id": "VIP"
                },
                {
                  "product_retailer_id": "TRUNK"
                },
                {
                  "product_retailer_id": "ROOF_RACK"
                },
                {
                  "product_retailer_id": "JUMPER_CABLES"
                },
                {
                  "product_retailer_id": "PETS"
                },
                {
                  "product_retailer_id": "BIKE_RACK"
                }
              ]
            }
          ]
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
        console.log('Error sendInteractiveButtonMessage: ', err.message)
      })
    req.write(JSON.stringify(content))
    req.end();
  }

  requestService$(serviceCount, serviceToRqstCount, specialServiceToRqstCount, client, waId, airportCharCount, message, vipCharCount, filters) {

    try {
      if (this.messageIdCache == null) this.messageIdCache = [];
      if (this.messageIdCache.includes(message.id)) {
        console.log('ClientBotLinkCQRS.requestService: FATAL, whatsapp tried to send the same message more than once from', message.from, 'and will be ignored', message.id);
        return of({});
      }
      this.messageIdCache.push(message.id);
      this.messageIdCache = this.messageIdCache.slice(-20);
    } catch (error) {
      console.error(error);
    }


    const serviceLimit = parseInt(process.env.SATELLITE_SERVICE_LIMIT || "5");
    const availableServiceCount = serviceLimit - serviceCount;
    const servicesToRequest = serviceToRqstCount;
    let specialServiceToRqstCountVal = specialServiceToRqstCount;
    let airportCharCountVal = airportCharCount;
    let vipCharCountVal = vipCharCount;
    const availableServices = availableServiceCount - servicesToRequest;
    if (!((client || {}).location || {}).lng) {
      this.sendTextMessage(`El satelite no tiene la ubicación configurada, por favor comunicarse con soporte `, waId)
      return of({});
    }
    else if (availableServices >= 0 && availableServices <= 5) {
      return range(1, servicesToRequest).pipe(
        mergeMap(() => {
          const acEnabled = (specialServiceToRqstCountVal--) > 0;
          const airportTipEnabled = (airportCharCountVal--) > 0;
          const vipEnabled = (vipCharCountVal--) > 0;
          return eventSourcing.eventStore.emitEvent$(this.buildServiceRequestedEsEvent(client, acEnabled, airportTipEnabled, vipEnabled, filters));
        }),
        toArray(),
        tap(() => {
          if (servicesToRequest > 1) {
            this.sendTextMessage(`Se han solicitado ${servicesToRequest} servicios exitosamente`, waId)
          } else {
            this.sendTextMessage(`Se ha solicitado un servicio exitosamente`, waId)
          }

        })
      )
    } else {
      this.sendTextMessage(`El maximo numero de servicios activos al tiempo son ${serviceLimit}, actualemente tienes posibilidad de tomar ${availableServiceCount} servicios`, waId);
      return of({})
    }
  }

  infoService$(clientId, waId) {
    return ServiceDA.getServices$({ clientId: clientId, states: ["REQUESTED", "ASSIGNED", "ARRIVED"] }).pipe(
      toArray(),
      tap(result => {
        if (result.length > 0) {
          const listElements = result.map(val => {
            const currentDate = new Date(new Date(val.timestamp).toLocaleString(undefined, { timeZone: 'America/Bogota' }));
            const ddhh = dateFormat(currentDate, "HH:MM");
            const assignedData = val.state === "REQUESTED" ? "" : `Conductor ${val.driver.fullname}, Placas: ${val.vehicle.licensePlate}`
            return { id: `CANCEL_${val._id}`, title: `Cancelar servicio ${ddhh}`, description: `${assignedData}` }
          });

          if (listElements.length > 0) {
            listElements.push({ id: `CancelAllServiceBtn`, title: `Cancelar Todos` });
          }
          const aditionalTempText = `\n\nPara solicitar servicios con filtros por favor seleccionar la opción "Servicio con filtros"`;
          this.sendInteractiveListMessage("Tienes el/los siguiente(s) servicios activos con nosotros", `${result.reduce((acc, val) => {
            const currentDate = new Date(new Date(val.timestamp).toLocaleString(undefined, { timeZone: 'America/Bogota' }));
            const ddhh = dateFormat(currentDate, "HH:MM");
            const assignedData = val.state === "REQUESTED" ? "" : `Conductor: ${val.driver.fullname}, Placas: ${val.vehicle.licensePlate}`
            acc = `${acc}- Solicitado a las ${ddhh} ${assignedData}\n`
            return acc;
          }, "")}${aditionalTempText}`, "Lista de Servicios", "Servicios", listElements, waId)
        } else {
          if(availableTestNumbers.includes(waId)){
            const buttons = [
              {
                id: "RequestServiceWithFilters",
                text: "Servicio con filtros"
              }
            ]
            this.sendInteractiveButtonMessage("Actualmente no se tienen servicios activos", `Para solicitar servicios con filtros por favor persionar el boton "Servicio con filtros"`, buttons, waId)
          }else {
            this.sendTextMessage(`Actualmente no se tienen servicios activos`, waId)
          }
        }
      })
    )

  }

  continueConversation$(message, conversationContent, client, serviceCount) {
    if (((message || {}).text || {}).body) {
      if(availableTestNumbers.includes(conversationContent.waId) && message.text.body === "🧐"){
        this.sendInteractiveCatalogMessage(`Solicitar servicio con filtros`, `para solicitar un servicio con filtros por favor presionar el boton "Ver artículos"`, conversationContent.waId);
        return of({})
      }
      let charCount = [...message.text.body].filter(c => "🚗🚌🚎🏎🚓🚑🚒🚐🛻🚚🚛🚔🚍🚕🚖🚜🚙🚘".includes(c)).length;
      let specialCharCount = 0;
      let airportCharCount = 0;
      let vipCharCount = message.text.body.toUpperCase().includes("VIP") ? 1 : 0;
      const emojiPattern = String.raw`(?:❄️|🥶|⛄|🧊)`
      const vipEmojiPattern = String.raw`(?:👑)`;
      let vipEmojiRegex = new RegExp(vipEmojiPattern, "g");
      let emoRegex = new RegExp(emojiPattern, "g");
      const emojiPattern2 = String.raw`(?:✈️|🛫|🛬)`
      let emoRegex2 = new RegExp(emojiPattern2, "g");
      const specialDoubleCharCount = [...message.text.body.matchAll(emoRegex)].length;
      const specialVipCharCount = [...message.text.body.matchAll(vipEmojiRegex)].length;
      const specialDoubleAirportCharCount = [...message.text.body.matchAll(emoRegex2)].length;;
      specialCharCount = specialCharCount + specialDoubleCharCount;
      airportCharCount = airportCharCount + specialDoubleAirportCharCount;
      vipCharCount = vipCharCount + specialVipCharCount;

      charCount = charCount + specialCharCount + airportCharCount + vipCharCount;

      if (charCount > 0) {
        if ((client.satelliteInfo || {}).offerOnlyVip && vipCharCount < 1) {
          ++vipCharCount;
        }
        return this.requestService$(serviceCount, charCount, specialCharCount, client, conversationContent.waId, airportCharCount, message, vipCharCount);
      }
      else if (!isNaN(message.text.body)) {
        if ((client.satelliteInfo || {}).offerOnlyVip && vipCharCount < 1) {
          ++vipCharCount;
        }
        return this.requestService$(serviceCount, parseInt(message.text.body), 0, client, conversationContent.waId, airportCharCount, message, vipCharCount);
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
              },
            ]
            if(availableTestNumbers.includes(conversationContent.waId)){
              buttons.push({
                id: "RequestServiceWithFilters",
                text: "Servicio con filtros"
              })
            }
            this.sendInteractiveButtonMessage("Lo sentimos, no entendimos tu solicitud.", "Este es el menu y la forma de uso\n- Enviar el numero de servicios a pedir, ej 2\n- Enviar uno o varios Emojis de vehiculos segun los servicos a pedir, ej: 🚖. Para solicitar un servicio con aire acondicionado utilizar el emoji 🥶. Para un servicio VIP utilizar el emoji 👑 o para solicitar un servicio para el aeropuerto utilizar el emoji ✈️\n- enviar un signo de pregunta para saber la informacion de tus servicos.  Ej ? o ❓\n- seleccionar una de las siguientes opciones", buttons, conversationContent.waId)
          })
        )
      }
    }
    else if (message.order) {
      const filters = message.order.product_items.map(pi => pi.product_retailer_id);
      console.log("FILTER ===> ", filters)
      return this.requestService$(serviceCount, 1, 0, client, conversationContent.waId, 0, message, 0, filters);
    }
    else {
      const interactiveResp = (((message.interactive || {}).button_reply || {}).id) || ((message.interactive || {}).list_reply || {}).id;
      if (!interactiveResp) {
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
        this.sendInteractiveButtonMessage("Lo sentimos, no entendimos tu solicitud.", "Este es el menu y la forma de uso\n- Enviar el numero de servicios a pedir, ej 2\n- Enviar uno o varios Emojis de vehiculos segun los servicos a pedir, ej: 🚖. Para solicitar un servicio con aire acondicionado utilizar el emoji 🥶. Para un servicio VIP utilizar el emoji 👑 o para solicitar un servicio para el aeropuerto utilizar el emoji ✈️\n- enviar un signo de pregunta para saber la informacion de tus servicos.  Ej ? o ❓\n- seleccionar una de las siguientes opciones", buttons, conversationContent.waId)
        return of({});
      }
      switch (interactiveResp) {
        case "rqstServiceBtn":
          if (((client || {}).location || {}).lng) {
            return this.requestService$(serviceCount, 1, 0, client, conversationContent.waId, 0, message)
          } else {
            return of({}).pipe(
              tap(() => {
                this.sendTextMessage(`El satelite no tiene la ubicación configurada, por favor comunicarse con soporte `, conversationContent.waId)
              })
            )
          }
        case "rqstServiceVipBtn":
          if (((client || {}).location || {}).lng) {
            return this.requestService$(serviceCount, 1, 0, client, conversationContent.waId, 0, message, 1)
          } else {
            return of({}).pipe(
              tap(() => {
                this.sendTextMessage(`El satelite no tiene la ubicación configurada, por favor comunicarse con soporte `, conversationContent.waId)
              })
            )
          }
        case "infoServiceBtn":
          return this.infoService$(client._id, conversationContent.waId)
        case "CancelAllServiceBtn":
          return ServiceDA.getServices$({ clientId: client._id, states: ["REQUESTED", "ASSIGNED", "ARRIVED"] }).pipe(
            mergeMap(val => {
              return eventSourcing.eventStore.emitEvent$(new Event({
                aggregateType: 'Service',
                aggregateId: val._id,
                eventType: "ServiceCancelledByClient",
                eventTypeVersion: 1,
                user: conversationContent.waId,
                data: { reason: null, notes: "" }
              }))
            }),
            toArray(),
            tap(res => {
              console.log("RES ===> ", res);
              if (res.length > 0) {
                this.sendTextMessage(`Todos los servicios pendientes han sido cancelados exitosamente`, conversationContent.waId)
              } else {
                this.sendTextMessage(`Actualmente no hay servicios por cancelar`, conversationContent.waId)
              }
            })
          );
        case "RequestServiceWithFilters":
          this.sendInteractiveCatalogMessage(`Solicitar servicio con filtros`, `para solicitar un servicio con filtros por favor presionar el boton "Ver artículos"`, conversationContent.waId);
        default:
          if (interactiveResp.includes("CANCEL_")) {
            return ServiceDA.getService$(interactiveResp.replace("CANCEL_", "")).pipe(
              mergeMap(val => {
                const STATES_TO_CLOSE_SERVICE = ["ON_BOARD", "DONE", "CANCELLED_DRIVER", "CANCELLED_CLIENT", "CANCELLED_OPERATOR", "CANCELLED_SYSTEM"];
                if (STATES_TO_CLOSE_SERVICE.includes(val.state)) {
                  this.sendTextMessage(`El servicio seleccionado ya se ha finalizado por lo que no se pudo realizar el proceso de cancelación`, conversationContent.waId)
                  return of({})
                }
                else {
                  const currentDate = new Date(new Date(val.timestamp).toLocaleString(undefined, { timeZone: 'America/Bogota' }));
                  const ddhh = dateFormat(currentDate, "HH:MM");
                  this.sendTextMessage(`El servicio creado a las ${ddhh} ha sido cancelado`, conversationContent.waId)
                  return eventSourcing.eventStore.emitEvent$(new Event({
                    aggregateType: 'Service',
                    aggregateId: val._id,
                    eventType: "ServiceCancelledByClient",
                    eventTypeVersion: 1,
                    user: conversationContent.waId,
                    data: { reason: null, notes: "" }
                  }))
                }

              })
            );
          } else {
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
            map(satelliteClient => ({ ...satelliteClient, associatedClientId: client._id, associatedClientPhoneNumber: phoneNumber })),
            mergeMap(c => {
              console.log("CLIENT MESSAGE ===> ", JSON.stringify(message));
              return BotConversationDA.createConversation$(id, { ...conversationContent, client: c }).pipe(
                mergeMap(() => {
                  return ServiceDA.getServiceSize$({ clientId: client._id, states: ["REQUESTED", "ASSIGNED", "ARRIVED"] }).pipe(
                    mergeMap(serviceCount => {
                      return this.continueConversation$(message, conversationContent, c, serviceCount);
                    })
                  )
                })
              )
            })
          )
        } else {
          return of({}).pipe(
            tap(() => {
              this.sendTextMessage(`Hola, Bienvenido al TX BOT\nActualmente el número de telefono no está habilitado para utilizar el chat, por favor comunicarse con soporte de TX Plus para realizar el proceso de registro`, conversationContent.waId)
            })
          )
        }
      })
    )

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
        console.log("RESP  ===> ", data)
      })
    })
      .on('error', err => {
        console.log('Error markMessageAsRead: ', err.message)
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