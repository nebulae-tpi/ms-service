'use strict'


const { of, interval, forkJoin } = require("rxjs");
const { take, mergeMap, catchError, map, toArray, filter } = require('rxjs/operators');

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();

const { ShiftDA } = require('./data-access')

/**
 * Singleton instance
 */
let instance;

class DriverES {

    constructor() {
    }

}

/**
 * @returns {DriverES}
 */
module.exports = () => {
    if (!instance) {
        instance = new DriverES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};