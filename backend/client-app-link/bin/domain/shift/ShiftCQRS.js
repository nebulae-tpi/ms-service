"use strict";


const uuidv4 = require("uuid/v4");
const { of, interval, forkJoin } = require("rxjs");
const { mapTo, mergeMap, catchError, map, toArray, mergeMapTo, tap } = require('rxjs/operators');

const RoleValidator = require("../../tools/RoleValidator");
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();
const broker = require("../../tools/broker/BrokerFactory")();
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const Crosscutting = require('../../tools/Crosscutting');
const {
  CustomError,
  DefaultError,
  INTERNAL_SERVER_ERROR_CODE,
  PERMISSION_DENIED,  
} = require("../../tools/customError");

//const { ShiftDA, VehicleDA, DriverDA, ServiceDA } = require('./data-access')


/**
 * Singleton instance
 */
let instance;

class ShiftCQRS {
  constructor() {
  }

  

}

/**
 * @returns {ShiftCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new ShiftCQRS();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
