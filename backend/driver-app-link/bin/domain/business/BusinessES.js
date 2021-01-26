'use strict'


const { of, timer, forkJoin, Observable, iif, from, empty } = require("rxjs");
const { toArray, mergeMap, map, tap, filter, delay, mapTo, switchMap } = require('rxjs/operators');
const dateFormat = require('dateformat');
const uuidv4 = require("uuid/v4");

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();
const driverAppLinkBroker = require("../../services/driver-app-link/DriverAppLinkBroker")();

const BUSINESS_UNIT_IDS_WITH_SIMULTANEOUS_OFFERS = (process.env.BUSINESS_UNIT_IDS_WITH_SIMULTANEOUS_OFFERS || "").split(',');

const { BusinessDA } = require('./data-access')

/**
 * Singleton instance
 */
let instance;

class BusinessES {

    constructor() {
    }

    
    //#region Object builders

    /**
     * Transforms an Mongo/Event location format to a GraphQL-like format
     * @param {*} location 
     */
    formatPickUpDropOff(location) {
        return !location
            ? undefined
            : {
                ...location,
                marker: !location.marker
                    ? undefined
                    : { lng: location.marker.coordinates[0], lat: location.marker.coordinates[1] },
                polygon: !location.polygon
                    ? undefined
                    : location.polygon.coordinates[0].map(([lng, lat]) => ({ lng, lat }))
            };
    }

    /**
     * Handles message driver sent
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleBusinessAttributesUpdated$(businessAttributesUpdatedEvent) {  
        const businessAttributes = businessAttributesUpdatedEvent.data;
        return BusinessDA.updateBusinessAttributes$(businessAttributesUpdatedEvent.aid, businessAttributes);
    }

     /**
     * Persists the business on the materialized view according to the received data from the event store.
     * @param {*} businessCreatedEvent business created event
     */
    handleBusinessCreated$(businessCreatedEvent) {  
        const business = businessCreatedEvent.data;
        return BusinessDA.persistBusiness$(business);
    }

    /**
     * updates the business general info on the materialized view according to the received data from the event store.
     * @param {*} businessGeneralInfoUpdatedEvent business general info updated event
     */
    handleBusinessGeneralInfoUpdated$(businessGeneralInfoUpdatedEvent) {  
        const businessGeneralInfo = businessGeneralInfoUpdatedEvent.data;
        return BusinessDA.updateBusinessGeneralInfo$(businessGeneralInfoUpdatedEvent.aid, businessGeneralInfo);
    }

     /**
     * updates the business state on the materialized view according to the received data from the event store.
     * @param {*} businessState events that indicates the new state of the business.
     */
    handleBusinessState$(businessStateEvent) {          
        return BusinessDA.changeBusinessState$(businessStateEvent.aid, businessStateEvent.data);
    }

    handleBusinessContactInfoUpdated$(businessContactInfoUpdatedEvt){
        return Rx.Observable.of(businessContactInfoUpdatedEvt)
        .map(evt => ({
            buId: evt.aid,
            buContactInfo: evt.data
        }))
        .mergeMap(update => BusinessDA.updateBusinessContactInfo$(update.buId, update.buContactInfo))        
    }


    //#endregion





    //#region NOT BEING CALLED AT THE MOMENT

    /**
     * Generates an EventSourcing Event
     * @param {*} aggregateType 
     * @param {*} aggregateId defaults to generated DateBased Uuid
     * @param {*} eventType 
     * @param {*} data defaults to {}
     * @param {*} authToken 
     * @param {*} eventTypeVersion defaults to 1
    */
    static buildEventSourcingEvent(aggregateType, aggregateId, eventType, data = {}, user, eventTypeVersion = 1, ephemeral = false) {
        return new Event({
            aggregateType,
            aggregateId,
            eventType,
            eventTypeVersion,
            user,
            data,
            ephemeral
        });
    }

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
                new Date().toString() + ': ' + stackLines[0] + '\n' + stackLines.filter(line => line.includes('driver-app-link/bin')).join('\n') + '\n'
            );
        }
        catch (e) {
            console.error(e);
            console.error(error);
        }
    }
}

/**
 * @returns {BusinessES}
 */
module.exports = () => {
    if (!instance) {
        instance = new BusinessES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};