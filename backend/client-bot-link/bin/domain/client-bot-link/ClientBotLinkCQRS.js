'use strict'


const { of, timer, forkJoin, Observable, iif, from, empty, defer, range } = require("rxjs");
const { toArray, mergeMap, map, tap, filter, delay, mapTo, switchMap, catchError } = require('rxjs/operators');
const dateFormat = require('dateformat');
const uuidv4 = require("uuid/v4");
const https = require('https');
const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();
const http = require('https');

const BUSINESS_UNIT_IDS_WITH_SIMULTANEOUS_OFFERS = (process.env.BUSINESS_UNIT_IDS_WITH_SIMULTANEOUS_OFFERS || "").split(',');

const { BusinessDA, BotConversationDA, ClientDA, ServiceDA } = require('./data-access')

const satelliteAirtportPrices = JSON.parse('{"PORTER_LODGE":5000, "age":30, "HOTEL":10000}')
const availableTestNumbers = ["573155421851", "573015033132", "573013917663", "3138404790"]
let registerUserList = {};
const requestClientCache = {};
const businessIdVsD360APIKey = {
  "75cafa6d-0f27-44be-aa27-c2c82807742d": {
    D360_KEY: process.env.D360_API_KEY,
    registerTxt: `Bienvenido al TX BOT\n¿Cual es tu nombre?`,
    clientMenu: `- Para solicitar un servicio puedes utilizar el siguiente emoji: 🚖.\n- Para solicitar un servicio con aire acondicionado presionar el boton "Solicitar con aire"\n- Para listar los servicios actualmente activos y cancelarlos puedes enviar el caracter "?" o presionar el boton "Cancelar servicio"\n- Para enviar una peticion queja, reclamo o solicitar un servicio especial por favor presionar el boton "Ayuda"`,
    menu: "Este es el menu y la forma de uso\n- Enviar el numero de servicios a pedir, ej 2\n- Enviar uno o varios Emojis de vehiculos segun los servicos a pedir, ej: 🚖. Para solicitar un servicio con aire acondicionado utilizar el emoji 🥶. Para un servicio VIP utilizar el emoji 👑, para solicitar un servicio para el aeropuerto utilizar el emoji ✈️ o para solicitar un servicio con filtros  utilizar el emoji 🧐\n- enviar un signo de pregunta para saber la informacion de tus servicos.  Ej ? o ❓\n- seleccionar una de las siguientes opciones",
    availableRqstEmojis: "🚗🚌🚎🏎🚓🚑🚒🚐🛻🚚🚛🚔🚍🚕🚖🚜🚙🚘",
    availableRqstSpecialEmojis: "(?:❄️|🥶|⛄|🧊)",
    availableRqstVipEmojis: "(?:👑)",
    availableRqstAirportEmojis: "(?:✈️|🛫|🛬)",
    availableRqstFilterEmojis: "🧐",
    hostname: "waba-v2.360dialog.io",
    path: "/messages"
  },
  "7d95f8ef-4c54-466a-8af9-6dd197dd920a": {
    D360_KEY: process.env.D360_API_KEY_TX_BOGOTA,
    registerTxt: `Bienvenido al TX BOT\n¿Cual es tu nombre?`,
    clientMenu: `- Para solicitar un servicio puedes utilizar el siguiente emoji: 🚖.\n- Para listar los servicios actualmente activos y cancelarlos puedes enviar el caracter "?" o presionar el boton "Cancelar servicio"\n- Para enviar una peticion queja, reclamo o solicitar un servicio especial por favor presionar el boton "Ayuda"\n- Para ver el saldo actual en billetera utiliza el siguiente emoji: 💵`,
    menu: "Este es el menu y la forma de uso\n- Enviar el numero de servicios a pedir, ej 2\n- Enviar uno o varios Emojis de vehiculos segun los servicos a pedir, ej: 🚖. Para solicitar un servicio con aire acondicionado utilizar el emoji 🥶. Para un servicio VIP utilizar el emoji 👑, para solicitar un servicio para el aeropuerto utilizar el emoji ✈️ o para solicitar un servicio con filtros  utilizar el emoji 🧐\n- enviar un signo de pregunta para saber la informacion de tus servicos.  Ej ? o ❓\n- seleccionar una de las siguientes opciones",
    availableRqstEmojis: "🚗🚌🚎🏎🚓🚑🚒🚐🛻🚚🚛🚔🚍🚕🚖🚜🚙🚘",
    availableRqstSpecialEmojis: "(?:❄️|🥶|⛄|🧊)",
    availableRqstVipEmojis: "(?:👑)",
    availableRqstAirportEmojis: "(?:✈️|🛫|🛬)",
    availableRqstFilterEmojis: "🧐",
    hostname: "waba-v2.360dialog.io",
    path: "/messages"
  },
  "bf2807e4-e97f-43eb-b15d-09c2aff8b2ab": {
    D360_KEY: process.env.D360_API_KEY,
    registerTxt: `Hola, Bienvenido al TX BOT\nActualmente el número de telefono no está habilitado para utilizar el chat, por favor comunicarse con soporte de TX Plus para realizar el proceso de registro`,
    menu: "Este es el menu y la forma de uso\n- Enviar el numero de servicios a pedir, ej 2\n- Enviar uno o varios Emojis de vehiculos segun los servicos a pedir, ej: 🚖. Para solicitar un servicio con aire acondicionado utilizar el emoji 🥶. Para un servicio VIP utilizar el emoji 👑, para solicitar un servicio para el aeropuerto utilizar el emoji ✈️ o para solicitar un servicio con filtros  utilizar el emoji 🧐\n- enviar un signo de pregunta para saber la informacion de tus servicos.  Ej ? o ❓\n- seleccionar una de las siguientes opciones",
    availableRqstEmojis: "🚗🚌🚎🏎🚓🚑🚒🚐🛻🚚🚛🚔🚍🚕🚖🚜🚙🚘",
    availableRqstSpecialEmojis: "(?:❄️|🥶|⛄|🧊)",
    availableRqstVipEmojis: "(?:👑)",
    availableRqstAirportEmojis: "(?:✈️|🛫|🛬)",
    availableRqstFilterEmojis: "🧐"
  },
  "2af56175-227e-40e7-97ab-84e8fa9e12ce": {
    D360_KEY: process.env.D360_API_KEY_FREE_DRIVER,
    registerTxt: `Hola, Bienvenido al Free BOT\nActualmente el número de telefono no está habilitado para utilizar el chat, por favor comunicarse con soporte de Free Driver para realizar el proceso de registro`,
    menu: "Este es el menu y la forma de uso\n- Enviar el numero de servicios a pedir, ej 2\n- Enviar uno o varios Emojis de vehiculos segun los servicos a pedir, ej: 🚘. Para solicitar un servicio con aire acondicionado utilizar el emoji 🥶. Para un servicio VIP utilizar el emoji 👑, para solicitar un servicio para el aeropuerto utilizar el emoji ✈️ o para solicitar un servicio con filtros  utilizar el emoji 🧐\n- enviar un signo de pregunta para saber la informacion de tus servicos.  Ej ? o ❓\n- seleccionar una de las siguientes opciones",
    availableRqstEmojis: "🚗🚌🚎🏎🚓🚑🚒🚐🛻🚚🚛🚔🚍🚜🚙🚘",
    availableRqstSpecialEmojis: "(?:❄️|🥶|⛄|🧊)",
    availableRqstVipEmojis: "(?:👑)",
    availableRqstAirportEmojis: "(?:✈️|🛫|🛬)",
    availableRqstFilterEmojis: "🧐"
  }, 
  "ec600f7f-1b57-4c47-af77-c6750a8649bd": {
    D360_KEY: process.env.DIALOG_API_KEY_VILLAVICENCIO,
    registerTxt: `Bienvenido al TX BOT\n¿Cual es tu nombre?`,
    clientMenu: `- Para solicitar un servicio puedes utilizar el siguiente emoji: 🚖.\n- Para listar los servicios actualmente activos y cancelarlos puedes enviar el caracter "?" o presionar el boton "Cancelar servicio"\n- Para enviar una peticion queja, reclamo o solicitar un servicio especial por favor presionar el boton "Ayuda"`,
    menu: "Este es el menu y la forma de uso\n- Enviar el numero de servicios a pedir, ej 2\n- Enviar uno o varios Emojis de vehiculos segun los servicos a pedir, ej: 🚖. Para solicitar un servicio con aire acondicionado utilizar el emoji 🥶. Para un servicio VIP utilizar el emoji 👑, para solicitar un servicio para el aeropuerto utilizar el emoji ✈️ o para solicitar un servicio con filtros  utilizar el emoji 🧐\n- enviar un signo de pregunta para saber la informacion de tus servicos.  Ej ? o ❓\n- seleccionar una de las siguientes opciones",
    availableRqstEmojis: "🚗🚌🚎🏎🚓🚑🚒🚐🛻🚚🚛🚔🚍🚕🚖🚜🚙🚘",
    availableRqstSpecialEmojis: "(?:❄️|🥶|⛄|🧊)",
    availableRqstVipEmojis: "(?:👑)",
    availableRqstAirportEmojis: "(?:✈️|🛫|🛬)",
    availableRqstFilterEmojis: "🧐",
    hostname: "waba-v2.360dialog.io",
    path: "/messages"
  }
}
const {
  ERROR_23224
} = require("../../tools/customError");
const { hostname } = require("os");

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
      businessIdVsD360APIKey["75cafa6d-0f27-44be-aa27-c2c82807742d"].D360_KEY = process.env.D360_API_KEY;
      return from(args.messages).pipe(
        tap(message => {
          const text = "El número del ChatBot se ha reemplazado por el contacto que se va compartir a continuación.\n\nA partir de este momento todas las solicitudes realizadas por este número *no se van a procesar*, por favor realizarlas en el contacto compartido a continuación\n\nNos excusamos por los inconvenientes generados."
          this.sendTextMessage(text, message.from, "75cafa6d-0f27-44be-aa27-c2c82807742d")
        }),
        tap(message => {
          this.sendContact(message.from, "75cafa6d-0f27-44be-aa27-c2c82807742d")
        })
      )
    } else {
      return of("IGNORED")
    }

  }

  processFreeDriverMessageReceived$({ args }, authToken) {
    console.log("LLEGA MENSAJE FREE DRIVER")
    if (args.messages) {
      return from(args.messages).pipe(
        mergeMap(message => {
          return this.initConversation$(message.from, {
            waId: message.from,
            timestamp: message.timestamp,
            client: {},
          }, message, "2af56175-227e-40e7-97ab-84e8fa9e12ce")
        }),
        tap(message => {
          //this.markMessageAsRead(message);
        })
      )
    } else {
      return of("IGNORED")
    }

  }

  processTxBogotaMessageReceived$({ args }, authToken) {
    if (args.messages) {
      return from(args.messages).pipe(
        mergeMap(message => {
          return this.initConversation$(message.from, {
            waId: message.from,
            timestamp: message.timestamp,
            client: {},
          }, message, "7d95f8ef-4c54-466a-8af9-6dd197dd920a")
        }),
        tap(message => {
          //this.markMessageAsRead(message);
        })
      )
    } else {
      return of("IGNORED")
    }

  }

  processTxPlusMessageReceived$({ args }, authToken) {
    if (args.messages) {
      return from(args.messages).pipe(
        mergeMap(message => {
          return this.initConversation$(message.from, {
            waId: message.from,
            timestamp: message.timestamp,
            client: {},
          }, message, "75cafa6d-0f27-44be-aa27-c2c82807742d")
        }),
        tap(message => {
          //this.markMessageAsRead(message, businessId);
        })
      )
    } else {
      return of("IGNORED")
    }

  }
  
  processTxPlusVillavicencioMessageReceived$({ args }, authToken) {
    if (args.messages) {
      return from(args.messages).pipe(
        mergeMap(message => {
          return this.initConversation$(message.from, {
            waId: message.from,
            timestamp: message.timestamp,
            client: {},
          }, message, "ec600f7f-1b57-4c47-af77-c6750a8649bd")
        }),
        tap(message => {
          //this.markMessageAsRead(message, businessId);
        })
      )
    } else {
      return of("IGNORED")
    }

  }

  processNewTxPlusMessageReceived$({ args }, authToken) {
    if (args.messages) {
      businessIdVsD360APIKey["75cafa6d-0f27-44be-aa27-c2c82807742d"].D360_KEY = process.env.D360_NEW_API_KEY;
      return from(args.messages).pipe(
        mergeMap(message => {
          return this.initConversation$(message.from, {
            waId: message.from,
            timestamp: message.timestamp,
            client: {},
          }, message, "75cafa6d-0f27-44be-aa27-c2c82807742d")
        }),
        tap(message => {
          //this.markMessageAsRead(message);
        })
      )
    } else {
      return of("IGNORED")
    }

  }

  buildServiceRequestedEsEvent(client, acEnabled, airportTipEnabled, vipEnabled, filters, businessId, sourceChannel = "CHAT_SATELITE", dropOff, currentRequestService) {
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
        verificationCode: (currentRequestService || {}).verificationCode,
        paymentType: (currentRequestService || {}).paymentType || "CASH",
        dropOff,
        pickUp,
        client: {
          id: client._id,
          businessId: businessId,
          username: "N/A",
          fullname: client.generalInfo.name,
          tipClientId: client.associatedClientId,
          tipType: client.satelliteInfo.tipType,
          phone: (client.associatedClientPhoneNumber || (client.generalInfo || {}).phone),
          tip: airportTipEnabled ? satelliteAirtportPrices[client.satelliteInfo.satelliteType || "PORTER_LODGE"] : (client.satelliteInfo || {}).tip,
          referrerDriverDocumentId: (client.satelliteInfo || {}).referrerDriverDocumentId,
          referrerDriverDocumentIds: (client.satelliteInfo || {}).referrerDriverDocumentIds,
          offerMinDistance: (client.satelliteInfo || {}).offerMinDistance,
          offerMaxDistance: (client.satelliteInfo || {}).offerMaxDistance
        },
        _id,
        businessId: businessId,
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
          sourceChannel,
          destChannel: "DRIVER_APP"
        }

      }
    };
    return new Event(requestObj);
  }

  sendTextMessage(text, waId, businessId) {
    const content = {
      "messaging_product": "whatsapp",
      "recipient_type": "individual",
      "to": waId,
      "type": "text",
      "text": {
        "body": text
      }
    }
    const options = {
      protocol: 'https:',
      hostname: businessIdVsD360APIKey[businessId].hostname || 'waba.360dialog.io',
      path: businessIdVsD360APIKey[businessId].path || '/v1/messages/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': businessIdVsD360APIKey[businessId].D360_KEY,
      }
    }
    const req = https.request(options, res => {
      let data = ''

      res.on('data', chunk => {
        data += chunk
      })

      res.on('end', () => {
        console.log(data)
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

  sendContact(waId, businessId) {
    const content = {
      "to": waId,
      "messaging_product": "whatsapp",
      "type": "contacts",
      "contacts": [
        {
          "name": {
            "first_name": "TX Plus",
            "formatted_name": "TX BOT",
            "last_name": "BOT"
          },
          "phones": [
            {
              "phone": "+57 (313) 840-4790",
              "type": "WORK",
              "wa_id": "573138404790"
            }
          ]
        }
      ]
    }
    const options = {
      protocol: 'https:',
      hostname: businessIdVsD360APIKey[businessId].hostname || 'waba.360dialog.io',
      path: businessIdVsD360APIKey[businessId].path || '/v1/messages/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': businessIdVsD360APIKey[businessId].D360_KEY,
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
  }

  sendHelpContact(waId, businessId) {
    const content = {
      "to": waId,
      "messaging_product": "whatsapp",
      "type": "contacts",
      "contacts": [
        {
          "name": {
            "first_name": "TX Plus",
            "formatted_name": "TxSoporte",
            "last_name": "Soporte"
          },
          "phones": [
            {
              "phone": "+57 (300) 198-1247",
              "type": "WORK",
              "wa_id": "573001981247"
            }
          ]
        }
      ]
    }
    const options = {
      protocol: 'https:',
      hostname: businessIdVsD360APIKey[businessId].hostname || 'waba.360dialog.io',
      path: businessIdVsD360APIKey[businessId].path || '/v1/messages/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': businessIdVsD360APIKey[businessId].D360_KEY,
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
  }

  sendInteractiveListMessage(headerText, bodyText, listButton, listTitle, list, waId, businessId) {
    const content = {
      "recipient_type": "individual",
      "messaging_product": "whatsapp",
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
      hostname: businessIdVsD360APIKey[businessId].hostname || 'waba.360dialog.io',
      path: businessIdVsD360APIKey[businessId].path || '/v1/messages/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': businessIdVsD360APIKey[businessId].D360_KEY
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

  sendInteractiveButtonMessage(headerText, bodyText, buttons, waId, businessId, withHeaderText = true) {
    const content = {
      "recipient_type": "individual",
      "to": waId,
      "messaging_product": "whatsapp",
      "type": "interactive",
      "interactive": {
        "type": "button",
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
    if (withHeaderText) {
      content.interactive.header = {
        "type": "text",
        "text": headerText
      }
    }
    console.log("CONTENT ===> ", JSON.stringify(content));
    const options = {
      protocol: 'https:',
      hostname: businessIdVsD360APIKey[businessId].hostname || 'waba.360dialog.io',
      path: businessIdVsD360APIKey[businessId].path || '/v1/messages/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': businessIdVsD360APIKey[businessId].D360_KEY
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

  sendInteractiveCatalogMessage(headerText, bodyText, waId, businessId) {
    const content = {
      "recipient_type": "individual",
      "to": waId,
      "messaging_product": "whatsapp",
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
      hostname: businessIdVsD360APIKey[businessId].hostname || 'waba.360dialog.io',
      path: businessIdVsD360APIKey[businessId].path || '/v1/messages/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': businessIdVsD360APIKey[businessId].D360_KEY,
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

  requestServiceWithoutSatellite$(client, currentRequestService, waId, message, businessId) {
    if(businessId == "7d95f8ef-4c54-466a-8af9-6dd197dd920a"){
      const min = 1000;
      const max = 9999;
      const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
      currentRequestService.verificationCode = Math.abs(randomNumber) + "";
    }
    
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
    client.generalInfo.addressLine1 = currentRequestService.address;
    client.generalInfo.addressLine2 = currentRequestService.reference
    client.location = currentRequestService.location;
    const dropOff = !currentRequestService.destinationLocation ? undefined : {
      addressLine1: currentRequestService.destinationAddress,
      marker: { type: "Point", coordinates: [currentRequestService.destinationLocation.lng, currentRequestService.destinationLocation.lat] },
      polygon: undefined,
    };

    return eventSourcing.eventStore.emitEvent$(this.buildServiceRequestedEsEvent(client, (currentRequestService.filters || {}).AC == true, false, false, undefined, businessId, "CHAT_CLIENT", dropOff, currentRequestService)).pipe(
      mergeMap(() => {
        if (!((client.lastServices) || []).some(l => l.address == currentRequestService.address)) {
          return ClientDA.appendLastRequestedService$(client._id, { ...currentRequestService, id: uuidv4() });
        }
        else {
          return of({})
        }
      }),
      tap(() => {

        if (currentRequestService.verificationCode) {
          this.sendTextMessage(`Se ha creado la solicitud exitosamente, en un momento se te enviará la información del taxi asignado. Tu código de verificación de servicio es: ${currentRequestService.verificationCode}`, waId, businessId);
        } else {
          this.sendTextMessage(`Se ha creado la solicitud exitosamente, en un momento se te enviará la información del taxi asignado`, waId, businessId);
        }
        currentRequestService = undefined;
      })
    )
  }

  requestService$(serviceCount, serviceToRqstCount, specialServiceToRqstCount, client, waId, airportCharCount, message, vipCharCount, filters, businessId) {

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
      this.sendTextMessage(`El satelite no tiene la ubicación configurada, por favor comunicarse con soporte `, waId, businessId)
      return of({});
    }
    else if (availableServices >= 0 && availableServices <= 5) {
      return range(1, servicesToRequest).pipe(
        mergeMap(() => {
          const acEnabled = (specialServiceToRqstCountVal--) > 0;
          const airportTipEnabled = (airportCharCountVal--) > 0;
          const vipEnabled = (vipCharCountVal--) > 0;
          return eventSourcing.eventStore.emitEvent$(this.buildServiceRequestedEsEvent(client, acEnabled, airportTipEnabled, vipEnabled, filters, businessId));
        }),
        toArray(),
        tap(() => {
          if (servicesToRequest > 1) {
            this.sendTextMessage(`Se han solicitado ${servicesToRequest} servicios exitosamente`, waId, businessId)
          } else {
            this.sendTextMessage(`Se ha solicitado un servicio exitosamente`, waId, businessId)
          }

        })
      )
    } else {
      this.sendTextMessage(`El maximo numero de servicios activos al tiempo son ${serviceLimit}, actualemente tienes posibilidad de tomar ${availableServiceCount} servicios`, waId, businessId);
      return of({})
    }
  }

  infoServiceWithoutFilter$(clientId, waId, businessId) {
    return ServiceDA.getServices$({ clientId: clientId, states: ["REQUESTED", "ASSIGNED", "ARRIVED"], businessId }).pipe(
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
          const aditionalTempText = ``;
          this.sendInteractiveListMessage("Tienes el/los siguiente(s) servicios activos con nosotros", `${result.reduce((acc, val) => {
            const currentDate = new Date(new Date(val.timestamp).toLocaleString(undefined, { timeZone: 'America/Bogota' }));
            const ddhh = dateFormat(currentDate, "HH:MM");
            const assignedData = val.state === "REQUESTED" ? "" : `Conductor: ${val.driver.fullname}, Placas: ${val.vehicle.licensePlate}`
            acc = `${acc}- Solicitado a las ${ddhh} ${assignedData}\n`
            return acc;
          }, "")}${aditionalTempText}`, "Lista de Servicios", "Servicios", listElements, waId, businessId)
        } else {
          this.sendTextMessage("Actualmente no se tienen servicios activos", waId, businessId)
        }
      })
    )

  }

  infoService$(clientId, waId, businessId) {
    return ServiceDA.getServices$({ clientId: clientId, states: ["REQUESTED", "ASSIGNED", "ARRIVED"], businessId }).pipe(
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
          }, "")}${aditionalTempText}`, "Lista de Servicios", "Servicios", listElements, waId, businessId)
        } else {
          const buttons = [
            {
              id: "RequestServiceWithFilters",
              text: "Servicio con filtros"
            }
          ]
          this.sendInteractiveButtonMessage("Actualmente no se tienen servicios activos", `Para solicitar servicios con filtros por favor persionar el boton "Servicio con filtros"`, buttons, waId, businessId)
        }
      })
    )

  }


  getDayOfWeek(date) {
    const day = date.getDay();
    return day === 0 ? 1 : day + 1;
  }

  getMinuteOfDay(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return hours * 60 + minutes;
  }
  startGetRequest(hostname, path) {
    const options = {
      hostname,
      path,
      method: 'GET',
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let errorBody = [];
          res.on('data', (chunk) => errorBody.push(chunk));
          res.on('end', () => {
            const errorResponse = Buffer.concat(errorBody).toString();
            reject(new Error(`Error HTTP: ${res.statusCode} - ${errorResponse}`));
          });
        }

        let body = [];
        res.on('data', (chunk) => body.push(chunk));
        res.on('end', () => {
          const resBody = Buffer.concat(body).toString();
          resolve(JSON.parse(resBody));
        });
      });

      req.on('error', (e) => {
        reject(e);
      });
      req.end();
    });
  }

  formatToCurrency(value, locale = 'en-US', currency = 'COP', symbol = "$") {
    return (new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)).replace(currency, symbol);
  }

  continueConversationBogotaCLient$(message, conversationContent, client, businessId) {
    let currentRequestService = requestClientCache[client._id];
    console.log("currentRequest ===> ", requestClientCache);
    const interactiveResp = (((message.interactive || {}).button_reply || {}).id) || ((message.interactive || {}).list_reply || {}).id;
    const textResp = ((message || {}).text || {}).body;
    const sharedLocation = ((message || {}).location || {});
    const buttonsCancel = [
      {
        id: "cancelLastRequestedBtn",
        text: "Cancelar solicitud"
      }
    ];

    const buttonsRequest = [
      {
        id: "cancelLastRequestedBtn",
        text: "Cancelar solicitud"
      },
      {
        id: "listLastServiceBtn",
        text: "Últimos solicitados"
      }
    ]

    const initialMenu = [
      {
        id: "listCurrentServices",
        text: "Cancelar servicio"
      },
      {
        id: "helpBtn",
        text: "Ayuda"
      },
      {
        id: "getWalletBtn",
        text: "Consultar Saldo"
      }

    ]
    if (textResp != null) {
      if (currentRequestService == null) {
        if (textResp == "?") {
          return this.infoServiceWithoutFilter$(client._id, conversationContent.waId, businessId)
        }
        let charCount = [...message.text.body].filter(c => businessIdVsD360APIKey[businessId].availableRqstEmojis.includes(c)).length;

        let walletEmoji = [...message.text.body].some(t => (["💵", "💴", "💶", "💷", "💸", "💰"]).includes(t));
        if (charCount > 0) {
          currentRequestService = {
            step: "REQUEST_REFERENCE",
            timestamp: Date.now()
          }

          this.sendInteractiveButtonMessage(null, `Por favor escribe la dirección o selecciona la opcion "Últimos solicitados" para seleccionar una ubicación de los últimos tres servicios solicitados`, buttonsRequest, conversationContent.waId, businessId, false);
          requestClientCache[client._id] = currentRequestService;
          return of({});
        }

        if(walletEmoji > 0){
          this.sendTextMessage(`El saldo en billetera es: ${this.formatToCurrency(client?.wallet?.pockets?.main || 0)}`, conversationContent.waId, businessId);
          return of({});
        }
      }
      switch ((currentRequestService || {}).step) {
        case "REQUEST_REFERENCE":
          this.sendInteractiveButtonMessage(null, `Por favor escribe una referencia`, buttonsCancel, conversationContent.waId, businessId, false);
          currentRequestService.step = "REQUEST_PAYMENT_TYPE";
          currentRequestService.address = textResp;
          break;
        case "REQUEST_PAYMENT_TYPE":
          //const listElements = [{ id: `CASH`, title: `Efectivo`, description: `` }, { id: `CREDIT_CARD`, title: `Tarjeta de Crédito`, description: `` }];
          const buttonsPaymentType = [
            {
              id: "PAYMENT_CASH",
              text: "Efectivo"
            },
            {
              id: "PAYMENT_CREDIT_CARD",
              text: "Tarjeta de crédito"
            },
            {
              id: "cancelLastRequestedBtn",
              text: "Cancelar solicitud"
            }
          ]
          this.sendInteractiveButtonMessage(null, `Por favor selecciona el método de pago`, buttonsPaymentType, conversationContent.waId, businessId, false);
          currentRequestService.step = "REQUEST_LOCATION";
          currentRequestService.reference = textResp;
          break;

        // case "REQUEST_LOCATION":
        //   this.sendInteractiveButtonMessage(`Por favor envia la ubicación`, `Presiona "📎 o +", selecciona la opción "ubicación" y envía tu ubicación actual.`, buttonsCancel, conversationContent.waId, businessId);
        //   currentRequestService.step = "LOCATION_SHARED";
        //   currentRequestService.reference = textResp;
        //   break;
        case "APROX_FARE_SHARED":
          currentRequestService.destinationAddress = textResp;
          return this.requestServiceWithoutSatellite$(client, currentRequestService, conversationContent.waId, message, businessId).pipe(
            tap(() => {
              requestClientCache[client._id] = undefined;
            })
          )

        default:
          this.sendInteractiveButtonMessage(`Hola ${client.generalInfo.name} ¿en que podemos servirte?`, businessIdVsD360APIKey[businessId].clientMenu, initialMenu, conversationContent.waId, businessId);
          break;
      }

    } else if (interactiveResp) {
      if (currentRequestService != null && (interactiveResp != "cancelLastRequestedBtn" || interactiveResp != "requestWithoutDestinationBtn")) {

        this.sendInteractiveButtonMessage(null, `En este momento estas realizando una solicitu de servicio, si deseas realizar otra acción primero debes cancelar la solicitud actual`, buttonsCancel, conversationContent.waId, businessId);
      }
      const btnId = (interactiveResp.split("-")[0])
      switch (btnId) {
        case "rqstServiceACBtn":
          currentRequestService = requestClientCache[client._id] || {};
          currentRequestService.step = "REQUEST_REFERENCE";
          currentRequestService.timestamp = Date.now();
          currentRequestService.filters = { AC: true };
          this.sendInteractiveButtonMessage(null, `Por favor escribe la dirección o selecciona la opcion "Últimos solicitados" para seleccionar una ubicación de los últimos tres servicios solicitados`, buttonsRequest, conversationContent.waId, businessId, false);
          break;
        case "requestWithoutDestinationBtn":
        case "requestWithDestinationBtn":
          return this.requestServiceWithoutSatellite$(client, currentRequestService, conversationContent.waId, message, businessId).pipe(
            tap(() => {
              requestClientCache[client._id] = undefined;
            })
          );
        case "payWithWalletBtn": 
          return ServiceDA.getService$(interactiveResp.split("-")[1]).pipe(
            mergeMap(service => {
              const movement = {
                _id: Crosscutting.generateDateBasedUuid(),
                businessId: authToken.businessId,
                type: "MOVEMENT",
                // notes: mba.notes,
                concept: "APP_CLIENT_PARTIAL_PAYMENT",
                timestamp: Date.now(),
                amount: taximeterFare,
                fromId: service.service.client.id,
                toId: service.driver.id
              };
              return eventSourcing.eventStore.emitEvent$(
                new Event({
                  eventType: "WalletTransactionCommited",
                  eventTypeVersion: 1,
                  aggregateType: "Wallet",
                  aggregateId: uuidv4(),
                  data: movement,
                  user: "SYSTEM"
                })
              );
            })
          )
        case "helpBtn":
          const text = "A continuación se comparte el contacto de soporte de TxPlus"
          this.sendTextMessage(text, conversationContent.waId, businessId)
          this.sendHelpContact(conversationContent.waId, businessId)
          break;
        case "getWalletBtn":
          this.sendTextMessage(`El saldo en billetera es: ${this.formatToCurrency(client?.wallet?.pockets?.main || 0)}`, conversationContent.waId, businessId)
          return of({});
        case "listCurrentServices":
          return this.infoServiceWithoutFilter$(client._id, conversationContent.waId, businessId)
        case "listLastServiceBtn":
          if (((client || {}).lastServices)) {
            const listElements = (client || {}).lastServices.map(val => {
              const address = val.address.length > 24 ? val.address.substring(0, 21) + "..." : val.address;
              const reference = val.reference > 72 ? val.reference.substring(0, 69) + "..." : val.reference
              return { id: `REQUEST_${val.id}`, title: `${address}`, description: `${reference}` }
            });
            this.sendInteractiveListMessage("Los últimos servicios solicitados son los siguientes", `${(client || {}).lastServices.reduce((acc, val) => {
              acc = `${acc}- ${val.address}\n`
              return acc;
            }, "")}`, "Lista de Servicios", "Servicios", listElements, conversationContent.waId, businessId)
            break;
          } else {
            return of({}).pipe(
              tap(() => {
                this.sendTextMessage(`No se han encontrado servicios solicitados recientemente`, conversationContent.waId, businessId)
              })
            )
          }
        case "cancelLastRequestedBtn":
          currentRequestService = undefined;
          this.sendTextMessage(`La solicitud de servicio ha sido cancelada`, conversationContent.waId, businessId)
          break;
        default:
          if (interactiveResp.includes("CANCEL_")) {
            return ServiceDA.markedAsCancelledAndReturnService$(interactiveResp.replace("CANCEL_", "")).pipe(
              tap(service => {
                if (service.cancelationTryTimestamp && (service.cancelationTryTimestamp + 60000) > Date.now()) throw ERROR_23224;
              }),
              mergeMap(val => {

                const STATES_TO_CLOSE_SERVICE = ["ON_BOARD", "DONE", "CANCELLED_DRIVER", "CANCELLED_CLIENT", "CANCELLED_OPERATOR", "CANCELLED_SYSTEM"];
                if (STATES_TO_CLOSE_SERVICE.includes(val.state)) {
                  this.sendTextMessage(`El servicio seleccionado ya se ha finalizado por lo que no se pudo realizar el proceso de cancelación`, conversationContent.waId, businessId)
                  return of({})
                }
                else {
                  const currentDate = new Date(new Date(val.timestamp).toLocaleString(undefined, { timeZone: 'America/Bogota' }));
                  const ddhh = dateFormat(currentDate, "HH:MM");
                  this.sendTextMessage(`El servicio creado a las ${ddhh} ha sido cancelado`, conversationContent.waId, businessId)
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
          } else if (interactiveResp.includes("REQUEST_")) {
            const selectedServiceInfo = client.lastServices.find(l => l.id == interactiveResp.replace("REQUEST_", ""));
            return this.requestServiceWithoutSatellite$(client, selectedServiceInfo, conversationContent.waId, message, businessId).pipe(
              tap(() => {
                requestClientCache[client._id] = undefined;
              })
            );
          }
          else if (interactiveResp.includes("PAYMENT_")) {

            this.sendInteractiveButtonMessage(`Por favor envia la ubicación`, `Presiona "📎 o +", selecciona la opción "ubicación" y envía tu ubicación actual.`, buttonsCancel, conversationContent.waId, businessId);
            currentRequestService.paymentType = interactiveResp.replace("PAYMENT_", "")
            currentRequestService.step = "LOCATION_SHARED";
            currentRequestService.reference = textResp;
          }
          else {
            return of({});
          }
      }
    }
    else if (sharedLocation) {
      if ((currentRequestService || {}).step == "LOCATION_SHARED") {
        currentRequestService.location = {
          lat: message.location.latitude,
          lng: message.location.longitude,
        }
        currentRequestService.step = "DESTINATION_REQUESTED";
        const buttonsFare = [
          {
            id: "requestWithoutDestinationBtn",
            text: "Solicitar Servicio"
          }
        ];
        this.sendInteractiveButtonMessage("Calcular Tarifa", `Si lo deseas, puedes compartirnos la ubicación de tu destino para calcular el valor aproximado de tu tarifa (presiona '📎' o '+', selecciona la opción 'ubicación' y envía la ubicación de tu destino). También puedes presionar el botón 'Solicitar Servicio' para enviar la solicitud sin destino.`, buttonsFare, conversationContent.waId, businessId);


      } else if ((currentRequestService || {}).step == "DESTINATION_REQUESTED") {
        currentRequestService.destinationLocation = {
          lat: message.location.latitude,
          lng: message.location.longitude,
        }
        currentRequestService.step = "APROX_FARE_SHARED";
        const buttonsFare = [
          {
            id: "cancelLastRequestedBtn",
            text: "Cancelar Solicitud"
          }
        ];
        const clientLocation = currentRequestService.location.lat + "," + currentRequestService.location.lng;
        const destinationLocation = currentRequestService.destinationLocation.lat + "," + currentRequestService.destinationLocation.lng;
        return from(this.startGetRequest("router.hereapi.com", "/v8/routes?transportMode=car&origin=" + clientLocation + "&destination=" + destinationLocation + "&return=summary&apiKey=" + process.env.HERE_API_KEY)).pipe(
          mergeMap(result => {
            return BotConversationDA.getById$(businessId, { attributes: 1 }).pipe(
              tap(business => {
                console.log(JSON.stringify(result))
                const summary = (((result?.routes || [{}])[0].sections || [{}])[0] || {})?.summary;
                const attrObj = business.attributes.reduce((acc, val) => {
                  acc[val.key] = val?.value;
                  return acc;
                }, {});

                console.log("attrObj ===> ", JSON.stringify(attrObj))
                const specialFareList = attrObj["TAXIMETER_SPECIAL_FARE"] ? JSON.parse(attrObj["TAXIMETER_SPECIAL_FARE"]) : undefined;

                const taximeterPoints = summary.length / Number.parseFloat(attrObj["FARE_METERS"]);
                const totalMeterFare = taximeterPoints * Number.parseFloat(attrObj["FARE_VALUE"]);
                const secondsValue = summary.duration * Number.parseFloat(attrObj["TAXIMETER_SECONDS_VALUE"]);
                const startValue = Number.parseInt(attrObj["TAXIMETER_START_VALUE"]);
                const currentMinutes = this.getMinuteOfDay(new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" })));
                const currentDay = this.getDayOfWeek(new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" })));
                const selectedSpecialFare = specialFareList.find(fare => ((fare.days || []).includes(currentDay) && (fare.timeRange || []).some(range => {
                  const timeRange = range.split("-");
                  currentMinutes > Number.parseInt(timeRange[0]) && currentDay < Number.parseInt(timeRange[1])
                })));
                const sundayCharge = Number.parseInt(selectedSpecialFare?.sundayCharge || "0");
                const minimunFare = Number.parseInt(attrObj["TAXIMETER_MIMIMUN_FARE"]) + sundayCharge;
                const totalFare = Math.round(Math.max((startValue + totalMeterFare + sundayCharge), minimunFare));
                this.sendTextMessage(`El valor aproximado de tu servicio es entre ${this.formatToCurrency(totalFare)} y ${this.formatToCurrency(Math.round(totalFare + (totalFare * 0.45)))}. *Por favor compartenos la dirección o una referencia de tu destino.*`, conversationContent.waId, businessId);
                //this.sendInteractiveButtonMessage("El valor aproximado de tu servicio es", `Entre ${this.formatToCurrency(totalFare)} y ${this.formatToCurrency(Math.round(totalFare + (totalFare * 0.45)))}. *Por favor compartenos la dirección o una referencia de tu destino.* 'Cancelar Servicio'.`, buttonsFare, conversationContent.waId, businessId);
              })
            )
          }),
          catchError(e => {
            console.log("Error HERE API ===> ", e)
            return of({})
          })
        );

        // return this.requestServiceWithoutSatellite$(client, currentRequestService, conversationContent.waId, message, businessId).pipe(
        //   tap(() => {
        //     requestClientCache[client._id] = currentRequestService
        //   })
        // );

      } else if ((currentRequestService || {}).step == "REQUEST_REFERENCE") {
        this.sendTextMessage(`Para continuar con la solicitud debes enviar una direccíon`, conversationContent.waId, businessId)
      }
      else if ((currentRequestService || {}).step == "REQUEST_LOCATION") {
        this.sendTextMessage(`Para continuar con la solicitud debes enviar una referencia`, conversationContent.waId, businessId)
      } else {
        this.sendInteractiveButtonMessage(`Hola ${client.generalInfo.name} ¿en que podemos servirte?`, businessIdVsD360APIKey[businessId].clientMenu, initialMenu, conversationContent.waId, businessId);
      }
    }
    requestClientCache[client._id] = currentRequestService;
    return of({})
  }

  continueConversationWithoutSatellite$(message, conversationContent, client, businessId) {
    let currentRequestService = requestClientCache[client._id];
    const interactiveResp = (((message.interactive || {}).button_reply || {}).id) || ((message.interactive || {}).list_reply || {}).id;
    const textResp = ((message || {}).text || {}).body;
    const sharedLocation = ((message || {}).location || {});
    const buttonsCancel = [
      {
        id: "cancelLastRequestedBtn",
        text: "Cancelar solicitud"
      }
    ];

    const buttonsRequest = [
      {
        id: "cancelLastRequestedBtn",
        text: "Cancelar solicitud"
      },
      {
        id: "listLastServiceBtn",
        text: "Últimos solicitados"
      }
    ]

    const initialMenu = [
      {
        id: "rqstServiceACBtn",
        text: "Solicitar con aire"
      },
      {
        id: "listCurrentServices",
        text: "Cancelar servicio"
      },
      {
        id: "helpBtn",
        text: "Ayuda"
      }

    ]
    if (textResp != null) {
      if (currentRequestService == null) {
        if (textResp == "?") {
          return this.infoServiceWithoutFilter$(client._id, conversationContent.waId, businessId)
        }
        let charCount = [...message.text.body].filter(c => businessIdVsD360APIKey[businessId].availableRqstEmojis.includes(c)).length;
        if (charCount > 0) {
          currentRequestService = {
            step: "REQUEST_REFERENCE",
            timestamp: Date.now()
          }
          this.sendInteractiveButtonMessage(null, `Por favor escribe la dirección o selecciona la opcion "Últimos solicitados" para seleccionar una ubicación de los últimos tres servicios solicitados`, buttonsRequest, conversationContent.waId, businessId, false);
          requestClientCache[client._id] = currentRequestService;
          return of({});
        }
      }
      switch ((currentRequestService || {}).step) {
        case "REQUEST_REFERENCE":
          this.sendInteractiveButtonMessage(null, `Por favor escribe una referencia`, buttonsCancel, conversationContent.waId, businessId, false);
          currentRequestService.step = "REQUEST_LOCATION";
          currentRequestService.address = textResp;
          break;
        case "REQUEST_LOCATION":
          this.sendInteractiveButtonMessage(`Por favor envia la ubicación`, `Presiona "📎 o +", selecciona la opción "ubicación" y envía tu ubicación actual.`, buttonsCancel, conversationContent.waId, businessId);
          currentRequestService.step = "LOCATION_SHARED";
          currentRequestService.reference = textResp;
          break;
        default:
          this.sendInteractiveButtonMessage(`Hola ${client.generalInfo.name} ¿en que podemos servirte?`, businessIdVsD360APIKey[businessId].clientMenu, initialMenu, conversationContent.waId, businessId);
          break;
      }

    } else if (interactiveResp) {
      if (currentRequestService != null && interactiveResp != "cancelLastRequestedBtn") {

        this.sendInteractiveButtonMessage(null, `En este momento estas realizando una solicitu de servicio, si deseas realizar otra acción primero debes cancelar la solicitud actual`, buttonsCancel, conversationContent.waId, businessId);
      }
      switch (interactiveResp) {
        case "rqstServiceACBtn":
          currentRequestService = requestClientCache[client._id] || {};
          currentRequestService.step = "REQUEST_REFERENCE";
          currentRequestService.timestamp = Date.now();
          currentRequestService.filters = { AC: true };
          this.sendInteractiveButtonMessage(null, `Por favor escribe la dirección o selecciona la opcion "Últimos solicitados" para seleccionar una ubicación de los últimos tres servicios solicitados`, buttonsRequest, conversationContent.waId, businessId, false);
          break;
        case "helpBtn":
          const text = "A continuación se comparte el contacto de soporte de TxPlus"
          this.sendTextMessage(text, conversationContent.waId, businessId)
          this.sendHelpContact(conversationContent.waId, businessId)
          break;
        case "listCurrentServices":
          return this.infoServiceWithoutFilter$(client._id, conversationContent.waId, businessId)
        case "listLastServiceBtn":
          if (((client || {}).lastServices)) {
            const listElements = (client || {}).lastServices.map(val => {
              const address = val.address.length > 24 ? val.address.substring(0, 21) + "..." : val.address;
              const reference = val.reference > 72 ? val.reference.substring(0, 69) + "..." : val.reference
              return { id: `REQUEST_${val.id}`, title: `${address}`, description: `${reference}` }
            });
            this.sendInteractiveListMessage("Los últimos servicios solicitados son los siguientes", `${(client || {}).lastServices.reduce((acc, val) => {
              acc = `${acc}- ${val.address}\n`
              return acc;
            }, "")}`, "Lista de Servicios", "Servicios", listElements, conversationContent.waId, businessId)
            break;
          } else {
            return of({}).pipe(
              tap(() => {
                this.sendTextMessage(`No se han encontrado servicios solicitados recientemente`, conversationContent.waId, businessId)
              })
            )
          }
        case "cancelLastRequestedBtn":
          currentRequestService = undefined;
          this.sendTextMessage(`La solicitud de servicio ha sido cancelada`, conversationContent.waId, businessId)
          break;
        default:
          if (interactiveResp.includes("CANCEL_")) {
            return ServiceDA.markedAsCancelledAndReturnService$(interactiveResp.replace("CANCEL_", "")).pipe(
              tap(service => {
                if (service.cancelationTryTimestamp && (service.cancelationTryTimestamp + 60000) > Date.now()) throw ERROR_23224;
              }),
              mergeMap(val => {

                const STATES_TO_CLOSE_SERVICE = ["ON_BOARD", "DONE", "CANCELLED_DRIVER", "CANCELLED_CLIENT", "CANCELLED_OPERATOR", "CANCELLED_SYSTEM"];
                if (STATES_TO_CLOSE_SERVICE.includes(val.state)) {
                  this.sendTextMessage(`El servicio seleccionado ya se ha finalizado por lo que no se pudo realizar el proceso de cancelación`, conversationContent.waId, businessId)
                  return of({})
                }
                else {
                  const currentDate = new Date(new Date(val.timestamp).toLocaleString(undefined, { timeZone: 'America/Bogota' }));
                  const ddhh = dateFormat(currentDate, "HH:MM");
                  this.sendTextMessage(`El servicio creado a las ${ddhh} ha sido cancelado`, conversationContent.waId, businessId)
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
          } else if (interactiveResp.includes("REQUEST_")) {
            const selectedServiceInfo = client.lastServices.find(l => l.id == interactiveResp.replace("REQUEST_", ""));
            return this.requestServiceWithoutSatellite$(client, selectedServiceInfo, conversationContent.waId, message, businessId).pipe(
              tap(() => {
                requestClientCache[client._id] = undefined;
              })
            );
          }
          else {
            return of({});
          }
      }
    }
    else if (sharedLocation) {
      if ((currentRequestService || {}).step == "LOCATION_SHARED") {
        currentRequestService.location = {
          lat: message.location.latitude,
          lng: message.location.longitude,
        }
        return this.requestServiceWithoutSatellite$(client, currentRequestService, conversationContent.waId, message, businessId).pipe(
          tap(() => {
            requestClientCache[client._id] = undefined;
          })
        );

      } else if ((currentRequestService || {}).step == "REQUEST_REFERENCE") {
        this.sendTextMessage(`Para continuar con la solicitud debes enviar una direccíon`, conversationContent.waId, businessId)
      }
      else if ((currentRequestService || {}).step == "REQUEST_LOCATION") {
        this.sendTextMessage(`Para continuar con la solicitud debes enviar una referencia`, conversationContent.waId, businessId)
      } else {
        this.sendInteractiveButtonMessage(`Hola ${client.generalInfo.name} ¿en que podemos servirte?`, businessIdVsD360APIKey[businessId].clientMenu, initialMenu, conversationContent.waId, businessId);
      }
    }
    requestClientCache[client._id] = currentRequestService;
    return of({})
  }

  continueConversation$(message, conversationContent, client, serviceCount, businessId) {
    if (((message || {}).text || {}).body) {
      if (message.text.body === businessIdVsD360APIKey[businessId].availableRqstFilterEmojis) {
        this.sendInteractiveCatalogMessage(`Solicitar servicio con filtros`, `para solicitar un servicio con filtros por favor presionar el boton "Ver artículos"`, conversationContent.waId, businessId);
        return of({})
      }
      let charCount = [...message.text.body].filter(c => businessIdVsD360APIKey[businessId].availableRqstEmojis.includes(c)).length;
      let specialCharCount = 0;
      let airportCharCount = 0;
      let vipCharCount = message.text.body.toUpperCase().includes("VIP") ? 1 : 0;
      const emojiPattern = String.raw`${businessIdVsD360APIKey[businessId].availableRqstSpecialEmojis}`
      const vipEmojiPattern = String.raw`${businessIdVsD360APIKey[businessId].availableRqstVipEmojis}`;
      let vipEmojiRegex = new RegExp(vipEmojiPattern, "g");
      let emoRegex = new RegExp(emojiPattern, "g");
      const emojiPattern2 = String.raw`${businessIdVsD360APIKey[businessId].availableRqstAirportEmojis}`
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
        return this.requestService$(serviceCount, charCount, specialCharCount, client, conversationContent.waId, airportCharCount, message, vipCharCount, undefined, businessId);
      }
      else if (!isNaN(message.text.body)) {
        if ((client.satelliteInfo || {}).offerOnlyVip && vipCharCount < 1) {
          ++vipCharCount;
        }
        return this.requestService$(serviceCount, parseInt(message.text.body), 0, client, conversationContent.waId, airportCharCount, message, vipCharCount, undefined, businessId);
      }
      else if (message.text.body === "?" || message.text.body === "❓") {
        return this.infoService$(client._id, conversationContent.waId, businessId)
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
            buttons.push({
              id: "RequestServiceWithFilters",
              text: "Servicio con filtros"
            })
            this.sendInteractiveButtonMessage("Lo sentimos, no entendimos tu solicitud.", businessIdVsD360APIKey[businessId].menu, buttons, conversationContent.waId, businessId)
          })
        )
      }
    }
    else if (message.order) {
      const filters = message.order.product_items ? message.order.product_items.map(pi => pi.product_retailer_id) : undefined;
      console.log("FILTER ===> ", filters)
      return this.requestService$(serviceCount, 1, 0, client, conversationContent.waId, 0, message, 0, filters, businessId);
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
        this.sendInteractiveButtonMessage("Lo sentimos, no entendimos tu solicitud.", "Este es el menu y la forma de uso\n- Enviar el numero de servicios a pedir, ej 2\n- Enviar uno o varios Emojis de vehiculos segun los servicos a pedir, ej: 🚖. Para solicitar un servicio con aire acondicionado utilizar el emoji 🥶. Para un servicio VIP utilizar el emoji 👑, para solicitar un servicio para el aeropuerto utilizar el emoji ✈️ o para solicitar un servicio con filtros  utilizar el emoji 🧐\n- enviar un signo de pregunta para saber la informacion de tus servicos.  Ej ? o ❓\n- seleccionar una de las siguientes opciones", buttons, conversationContent.waId, businessId)
        return of({});
      }
      switch (interactiveResp) {
        case "rqstServiceBtn":
          if (((client || {}).location || {}).lng) {
            return this.requestService$(serviceCount, 1, 0, client, conversationContent.waId, 0, message, undefined, undefined, businessId)
          } else {
            return of({}).pipe(
              tap(() => {
                this.sendTextMessage(`El satelite no tiene la ubicación configurada, por favor comunicarse con soporte `, conversationContent.waId, businessId)
              })
            )
          }
        case "rqstServiceVipBtn":
          if (((client || {}).location || {}).lng) {
            return this.requestService$(serviceCount, 1, 0, client, conversationContent.waId, 0, message, 1, undefined, businessId)
          } else {
            return of({}).pipe(
              tap(() => {
                this.sendTextMessage(`El satelite no tiene la ubicación configurada, por favor comunicarse con soporte `, conversationContent.waId, businessId)
              })
            )
          }
        case "infoServiceBtn":
          return this.infoService$(client._id, conversationContent.waId, businessId)
        case "CancelAllServiceBtn":
          return ServiceDA.getServices$({ clientId: client._id, states: ["REQUESTED", "ASSIGNED", "ARRIVED"] }).pipe(
            tap(service => {
              if (service.cancelationTryTimestamp && (service.cancelationTryTimestamp + 60000) > Date.now()) throw ERROR_23224;
            }),
            mergeMap(service => {
              return ServiceDA.markAsCancelled$(service._id).pipe(
                mapTo(service)
              )
            }),
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
                this.sendTextMessage(`Todos los servicios pendientes han sido cancelados exitosamente`, conversationContent.waId, businessId)
              } else {
                this.sendTextMessage(`Actualmente no hay servicios por cancelar`, conversationContent.waId, businessId)
              }
            })
          );
        case "RequestServiceWithFilters":
          this.sendInteractiveCatalogMessage(`Solicitar servicio con filtros`, `para solicitar un servicio con filtros por favor presionar el boton "Ver artículos"`, conversationContent.waId, businessId);
        default:
          if (interactiveResp.includes("CANCEL_")) {
            return ServiceDA.markedAsCancelledAndReturnService$(interactiveResp.replace("CANCEL_", "")).pipe(
              tap(service => {
                if (service.cancelationTryTimestamp && (service.cancelationTryTimestamp + 60000) > Date.now()) throw ERROR_23224;
              }),
              mergeMap(val => {

                const STATES_TO_CLOSE_SERVICE = ["ON_BOARD", "DONE", "CANCELLED_DRIVER", "CANCELLED_CLIENT", "CANCELLED_OPERATOR", "CANCELLED_SYSTEM"];
                if (STATES_TO_CLOSE_SERVICE.includes(val.state)) {
                  this.sendTextMessage(`El servicio seleccionado ya se ha finalizado por lo que no se pudo realizar el proceso de cancelación`, conversationContent.waId, businessId)
                  return of({})
                }
                else {
                  const currentDate = new Date(new Date(val.timestamp).toLocaleString(undefined, { timeZone: 'America/Bogota' }));
                  const ddhh = dateFormat(currentDate, "HH:MM");
                  this.sendTextMessage(`El servicio creado a las ${ddhh} ha sido cancelado`, conversationContent.waId, businessId)
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

  initConversation$(id, conversationContent, message, businessId) {
    const keys = Object.keys(registerUserList);
    for (let index = 0; index < keys.length; index++) {
      const element = keys[index];
      if (!(registerUserList[element] || {}).timestamp || (registerUserList[element] || {}).timestamp + (60000 * 5) < Date.now()) {
        delete registerUserList[element]
      }
    }
    const phoneNumber = conversationContent.waId.replace("57", "");
    return ClientDA.getClientByPhoneNumber$(parseInt(phoneNumber), businessId).pipe(
      mergeMap(client => {
        if ((client || {})._id) {
          if (client.satelliteId) {
            return ClientDA.getClient$(client.satelliteId).pipe(
              map(satelliteClient => ({ ...satelliteClient, associatedClientId: client._id, associatedClientPhoneNumber: phoneNumber })),
              mergeMap(c => {
                return BotConversationDA.createConversation$(id, { ...conversationContent, client: c }).pipe(
                  mergeMap(() => {
                    return ServiceDA.getServiceSize$({ clientId: client._id, states: ["REQUESTED", "ASSIGNED", "ARRIVED"] }).pipe(
                      mergeMap(serviceCount => {
                        return this.continueConversation$(message, conversationContent, c, serviceCount, businessId);
                      }),
                      catchError(err =>{
                        console.log("err ==> ", err)
                        of("Error proccesing conversation data")
                      }
                      )
                    )
                  })
                )
              })
            )
          } else {
            return BotConversationDA.createConversation$(id, { ...conversationContent, client }).pipe(
              mergeMap(() => {
                return ServiceDA.getServiceSize$({ clientId: client._id, states: ["REQUESTED", "ASSIGNED", "ARRIVED"] }).pipe(
                  mergeMap(serviceCount => {
                    if (businessId === "7d95f8ef-4c54-466a-8af9-6dd197dd920a") {
                      return this.continueConversationBogotaCLient$(message, conversationContent, client, businessId, true);
                    } else {
                      return this.continueConversationWithoutSatellite$(message, conversationContent, client, businessId, true);
                    }

                  }),
                  catchError(err => {
                    console.log("ERROR ===> ", err)
                    return of("Error proccesing conversation data")
                  }
                  )
                )
              })
            )
          }

        } else {
          console.log("REGISTRA NUEVO USUARIO ===> ", registerUserList[phoneNumber])
          if (!registerUserList[phoneNumber]) {
            return of({}).pipe(
              tap(() => {
                registerUserList[phoneNumber] = { timestamp: Date.now() }
                this.sendTextMessage(businessIdVsD360APIKey[businessId].registerTxt, conversationContent.waId, businessId)
              })
            )
          }
          else {
            const interactiveResp = (((message.interactive || {}).button_reply || {}).id) || ((message.interactive || {}).list_reply || {}).id;
            if (!interactiveResp) {
              if (registerUserList[phoneNumber].referedCodeRequested) {
                const buttons = [
                  {
                    id: "listCurrentServices",
                    text: "Cancelar servicio"
                  },
                  {
                    id: "helpBtn",
                    text: "Ayuda"
                  }
                ];
                if (businessId != "7d95f8ef-4c54-466a-8af9-6dd197dd920a") {
                  buttons.push({
                    id: "rqstServiceACBtn",
                    text: "Solicitar con aire"
                  })
                }
                const newClient = {
                  generalInfo: {
                    name: registerUserList[phoneNumber].name,
                    phone: parseInt(phoneNumber)
                  },
                  state: true,
                  businessId: businessId
                };
                newClient._id = uuidv4();
                newClient.creatorUser = 'SYSTEM';
                newClient.creationTimestamp = new Date().getTime();
                newClient.modifierUser = 'SYSTEM';
                newClient.modificationTimestamp = new Date().getTime();
                newClient.satelliteInfo = {
                  "tip": 0,
                  "tipType": "CASH"
                };
                return eventSourcing.eventStore.emitEvent$(
                  new Event({
                    eventType: "ClientCreated",
                    eventTypeVersion: 1,
                    aggregateType: "Client",
                    aggregateId: newClient._id,
                    data: newClient,
                    user: "SYSTEM"
                  })).pipe(
                    mergeMap(() => {
                      return eventSourcing.eventStore.emitEvent$(
                        new Event({
                          eventType: "DriverAssociatedToClient",
                          eventTypeVersion: 1,
                          aggregateType: "Client",
                          aggregateId: newClient._id,
                          data: {
                            referrerDriverCode: message.text.body
                          },
                          user: "Chat BOT"
                        }))
                    }),
                    tap(() => {
                      this.sendInteractiveButtonMessage(`Hola ${registerUserList[phoneNumber].name} ¿en que podemos servirte?`, businessIdVsD360APIKey[businessId].clientMenu, buttons, conversationContent.waId, businessId);
                      registerUserList[phoneNumber] = undefined;
                    })
                  )
              } else {
                registerUserList[phoneNumber].name = message?.text?.body;
                const buttons = [
                  {
                    id: "confirmBtn",
                    text: "Confirmar"
                  },
                  {
                    id: "changeBtn",
                    text: "Cambiar"
                  }
                ]
                this.sendInteractiveButtonMessage(`${message.text.body} Confirma tu nombre`, `Presiona el boton de "Confirmar" para finalizar el proceso de registro o "Cambiar" para corregir el nombre ingresado`, buttons, conversationContent.waId, businessId)
              }

            } else {
              switch (interactiveResp) {
                case "registerBtn":
                  const buttons = [
                    {
                      id: "rqstServiceACBtn",
                      text: "Solicitar con aire"
                    },
                    {
                      id: "listCurrentServices",
                      text: "Cancelar servicio"
                    },
                    {
                      id: "helpBtn",
                      text: "Ayuda"
                    }
                  ]
                  const newClient = {
                    generalInfo: {
                      name: registerUserList[phoneNumber].name,
                      phone: parseInt(phoneNumber)
                    },
                    state: true,
                    businessId: businessId
                  };
                  newClient._id = uuidv4();
                  newClient.creatorUser = 'SYSTEM';
                  newClient.creationTimestamp = new Date().getTime();
                  newClient.modifierUser = 'SYSTEM';
                  newClient.modificationTimestamp = new Date().getTime();
                  newClient.satelliteInfo = {
                    "tip": 0,
                    "tipType": "CASH"
                  };
                  return eventSourcing.eventStore.emitEvent$(
                    new Event({
                      eventType: "ClientCreated",
                      eventTypeVersion: 1,
                      aggregateType: "Client",
                      aggregateId: newClient._id,
                      data: newClient,
                      user: "SYSTEM"
                    })).pipe(
                      tap(() => {
                        this.sendInteractiveButtonMessage(`Hola ${registerUserList[phoneNumber].name} ¿en que podemos servirte?`, businessIdVsD360APIKey[businessId].clientMenu, buttons, conversationContent.waId, businessId);
                        registerUserList[phoneNumber] = undefined;
                      })
                    );
                case "confirmBtn":
                  if (businessId == "7d95f8ef-4c54-466a-8af9-6dd197dd920a") {
                    const referedCodeButtons = [
                      {
                        id: "registerBtn",
                        text: "Finalizar Registro"
                      },
                    ];
                    registerUserList[phoneNumber].referedCodeRequested = true;
                    this.sendInteractiveButtonMessage(`Código de Referido`, `Si tienes un codigo de referido de conductor ingresalo por favor, en caso contrario presiona el boton 'Finalizar Registro'`, referedCodeButtons, conversationContent.waId, businessId)
                  } else {
                    const buttons = [
                      {
                        id: "rqstServiceACBtn",
                        text: "Solicitar con aire"
                      },
                      {
                        id: "listCurrentServices",
                        text: "Cancelar servicio"
                      },
                      {
                        id: "helpBtn",
                        text: "Ayuda"
                      }
                    ]
                    const newClient = {
                      generalInfo: {
                        name: registerUserList[phoneNumber].name,
                        phone: parseInt(phoneNumber)
                      },
                      state: true,
                      businessId: businessId
                    };
                    newClient._id = uuidv4();
                    newClient.creatorUser = 'SYSTEM';
                    newClient.creationTimestamp = new Date().getTime();
                    newClient.modifierUser = 'SYSTEM';
                    newClient.modificationTimestamp = new Date().getTime();
                    newClient.satelliteInfo = {
                      "tip": 0,
                      "tipType": "CASH"
                    };
                    return eventSourcing.eventStore.emitEvent$(
                      new Event({
                        eventType: "ClientCreated",
                        eventTypeVersion: 1,
                        aggregateType: "Client",
                        aggregateId: newClient._id,
                        data: newClient,
                        user: "SYSTEM"
                      })).pipe(
                        tap(() => {
                          this.sendInteractiveButtonMessage(`Hola ${registerUserList[phoneNumber].name} ¿en que podemos servirte?`, businessIdVsD360APIKey[businessId].clientMenu, buttons, conversationContent.waId, businessId);
                          registerUserList[phoneNumber] = undefined;
                        })
                      );
                  }

                  break;
                case "changeBtn":
                  this.sendTextMessage("¿Cual es tu nombre?", conversationContent.waId, businessId)
                  break;
              }
            }
            return of({})
          }

        }
      })
    )

  }

  markMessageAsRead(message, businessId) {
    const content = {
      "status": "read"
    }
    const options = {
      protocol: 'https:',
      hostname: businessIdVsD360APIKey[businessId].hostname || 'waba.360dialog.io',
      path: businessIdVsD360APIKey[businessId].path + "/" + message.id || ('/v1/messages/' + "/" + message.id),
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': businessIdVsD360APIKey[businessId].key
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