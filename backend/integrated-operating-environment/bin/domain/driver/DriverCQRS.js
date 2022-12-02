"use strict";


const uuidv4 = require("uuid/v4");
const { of, interval, forkJoin, from } = require("rxjs");
const { mergeMapTo, mergeMap, catchError, map, toArray, filter, first, tap ,defaultIfEmpty} = require('rxjs/operators');

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
  ERROR_23010, ERROR_23011, ERROR_23012, ERROR_23013, ERROR_23014, ERROR_23015, ERROR_23016, ERROR_23020, ERROR_23021, ERROR_23025, ERROR_2306, ERROR_23027, ERROR_23028,
} = require("../../tools/customError");
 
const { DriverDA, VehicleDA } = require('./data-access')


/**
 * Singleton instance
 */
let instance;

class DriverCQRS {
  constructor() {
  }

  

}

/**
 * @returns {DriverCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new DriverCQRS();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
