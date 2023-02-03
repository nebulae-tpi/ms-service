'use strict'

const { tap, mergeMap, catchError, map, mapTo, groupBy, debounceTime, filter } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const ServiceDA = require('./data-access/ServiceDA');
const { forkJoin, of, interval, from, throwError, concat, Observable, Subject } = require('rxjs');
const Crosscutting = require('../../tools/Crosscutting');
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";
const https = require('https');

/**
 * Singleton instance
 */
let instance;

class ServiceES {

  constructor() {
  }


  /**
   * Handles the service event
   * @param {*} serviceEvent service event
   */
  handleServiceAssignedEvents$(serviceEvent) {
    console.log("SERVICIO ASIGNADO ===> ", serviceEvent.aid);
    return ServiceDA.getService$(serviceEvent.aid).pipe(
      tap(service => {
        if(service.client.phone){
          this.sendTextMessage(`${service.driver.fullname} se dirige para la  dirección ${service.pickUp.addressLine1} en el vehiculo de placas ${service.vehicle.licensePlate}`, `57${service.client.phone}`)
        }
      })
    );
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