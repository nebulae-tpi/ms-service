'use strict'

const { tap, mergeMap, catchError, map, mapTo, groupBy, debounceTime, filter } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const ServiceDA = require('./data-access/ServiceDA');
const { forkJoin, of, interval, from, throwError, concat, Observable, Subject } = require('rxjs');
const Crosscutting = require('../../tools/Crosscutting');
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";
const https = require('https');
const dateFormat = require('dateformat');

/**
 * Singleton instance
 */
let instance;
const cancelReasons = {
  MECHANICAL_FAILURE: "Falla mecánica",
  BRING_PET: "Lleva mascota",
  INVALID_ADDRESS: "Dirección inválida",
  USER_DOESNT_ANSWER: "Usuario no responde",
  CONGESTION_ON_THE_ROAD: "Congestión en la vía",
  DRUNK_USER: "Usuario ebrio",
  USER_IS_NOT_HERE: "Usuario ya se retiró",
  VEHICLE_FROM_OTHER_COMPANY: "Ya hay un vehículo de otra empresa"
}
class ServiceES {

  constructor() {
  }


  /**
   * Handles the service event
   * @param {*} serviceEvent service event
   */
  handleServiceAssignedEvents$(serviceEvent) {
    return ServiceDA.getService$(serviceEvent.aid).pipe(
      tap(service => {
        if (service.client.phone) {
          console.log("service ASSIGNED ===> ",serviceEvent.aid);
          const minutes = this.millisToMinutesAndSeconds(service.pickUpETA - Date.now())
          this.sendTextMessage(`${service.driver.fullname} se dirige para la  dirección ${service.pickUp.addressLine1} en el vehículo de placas ${service.vehicle.licensePlate}`)
        }
      })
    );
  }

  handleServicePickUpETAReported$(serviceEvent) {
    return ServiceDA.getService$(serviceEvent.aid).pipe(
      tap(service => {
        if (service.client.phone) {
          console.log("service ETA ===> ",serviceEvent.aid);
          const minutes = this.millisToMinutesAndSeconds(serviceEvent.data.eta - Date.now())
          this.sendTextMessage(`El vehículo con placas ${service.vehicle.licensePlate} tiene un tiempo estimado de llegada : ${minutes}`, `57${service.client.phone}`)
        }
      })
    );
}

  millisToMinutesAndSeconds(millis) {
    var minutes = Math.floor(millis / 60000);
    var seconds = ((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
  }
  

  /**
   * Handles the service event
   * @param {*} serviceEvent service event
   */
  handleServiceOnBoardEvent$(serviceEvent) {
    return ServiceDA.getService$(serviceEvent.aid).pipe(
      tap(service => {
        if (service.client.phone) {
          //TODO: ACA SE DECIDE SI SE ENVIA EL MENSAJE DE FELIZ VIAJE, DE MOMENTO NO APLICA PARA EL SATELITE
          //this.sendTextMessage(`${service.driver.fullname} se dirige para la  dirección ${service.pickUp.addressLine1} en el vehículo de placas ${service.vehicle.licensePlate}`, `57${service.client.phone}`)
        }
      })
    );
  }

  /**
 * Handles the service event
 * @param {*} serviceEvent service event
 */
  handleServiceArrivedEvent$(serviceEvent) {
    return ServiceDA.getService$(serviceEvent.aid).pipe(
      tap(service => {
        if (service.client.phone) {
          this.sendTextMessage(`ha llegado ${service.driver.fullname} a  la dirección ${service.pickUp.addressLine1} en el vehículo de placas ${service.vehicle.licensePlate}`, `57${service.client.phone}`)
        }
      })
    );
  }

  /**
 * Handles the service event
 * @param {*} serviceEvent service event
 */
  handleServiceCancelledByDriverEvents$(serviceEvent) {
    return ServiceDA.getService$(serviceEvent.aid).pipe(
      tap(service => {
        if (service.client.phone) {
          const currentDate = new Date(new Date(service.timestamp).toLocaleString(undefined, { timeZone: 'America/Bogota' }));
          const ddhh = dateFormat(currentDate, "HH:MM");
          const cancelledDriverState = service.stateChanges.find(s => s.state === "CANCELLED_DRIVER");
          this.sendTextMessage(`El conductor ha cancelado el servicio solicitado a las ${ddhh}, razon: ${cancelledDriverState ? cancelReasons[cancelledDriverState.reason] : "Desconocido"}`, `57${service.client.phone}`)
        }
      })
    );
  }

  /**
 * Handles the service event
 * @param {*} serviceEvent service event
 */
  handleServiceCancelledByOperatorEvents$(serviceEvent) {
    return ServiceDA.getService$(serviceEvent.aid).pipe(
      tap(service => {
        if (service.client.phone) {
          const currentDate = new Date(new Date(service.timestamp).toLocaleString(undefined, { timeZone: 'America/Bogota' }));
          const ddhh = dateFormat(currentDate, "HH:MM");
          this.sendTextMessage(`El operador ha cancelado el servicio solicitado a las ${ddhh}`, `57${service.client.phone}`)
        }
      })
    );
  }

  /**
 * Handles the service event
 * @param {*} serviceEvent service event
 */
   handleServiceCancelledBySystemEvents$(serviceEvent) {
    return ServiceDA.getService$(serviceEvent.aid).pipe(
      tap(service => {
        if (service.client.phone) {
          const buttons = [
            {
              id: "rqstServiceBtn",
              text: "Continuar Busqueda"
            },
            {
              id: "ignoreBtn",
              text: "Cancelar Busqueda"
            }
          ]
          this.sendInteractiveButtonMessage(`Aún no hemos podido encontrar un vehículo cerca para ti`, `¿deseas continuar?`, buttons, `57${service.client.phone}`);
        }
      })
    );
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
      });

    console.log("CONTENT ASSIGNED ===> ", JSON.stringify(content))
    req.write(JSON.stringify(content))
    req.end();
  }


}



/**
 * @returns {ServiceES}
 */
module.exports = () => {
  if (!instance) {
    instance = new ServiceES();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};