'use strict'


const { of, interval, forkJoin, Observable } = require("rxjs");
const { take, mergeMap, catchError, map, tap, filter, delay, mergeMapTo } = require('rxjs/operators');

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();
const driverAppLinkBroker = require("../../services/driver-app-link/DriverAppLinkBroker")();

const { ServiceDA } = require('./data-access')

/**
 * Singleton instance
 */
let instance;

class ServiceES {

    constructor() {
    }



    /**
     * Handles EventSourcing Event ServiceRequested
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceRequested$({ aid, data }) {
        const { pickUp } = data;
        console.log(`ServiceES: handleServiceRequested: ${JSON.stringify({ _id: aid, ...data })} `); //TODO: DELETE LINE
        return ServiceDA.findOpenShifts$({ "driver.username": 1, "businessId": 1, "timestamp": 1 }).pipe(
            mergeMap(shift => driverAppLinkBroker.sendServiceEventToDrivers$(
                shift.businessId, shift.driver.username, 'ServiceOffered', { _id: aid, timestamp: Date.now(), pickUp: { ...pickUp, location: undefined } })),
        );
    }

    /**
     * Handles EventSourcing Event ServiceAssigned
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceAssigned$({ aid, data }) {
        console.log(`ServiceES: handleServiceAssigned: ${JSON.stringify({ _id: aid, ...data })} `); //TODO: DELETE LINE
        return ServiceDA.findById$(
            aid,
            {
                "timestamp": 1, "requestedFeatures": 1, "pickUp": 1, "dropOff": 1,
                "verificationCode": 1, "fareDiscount": 1, "fare": 1, "state": 1, "tip": 1, "client": 1,
                "driver.username": 1, "businessId": 1
            }).pipe(
                tap(x=> console.log(`=======111111======${JSON.stringify(x)}=========`)),
                map(dbService =>
                    (
                        {
                            dbService,
                            formattedService: {
                                ...dbService,
                                pickUp: this.formatPickUpDropOff(dbService.pickUp),
                                dropOff: this.formatPickUpDropOff(dbService.dropOff),
                                state: 'ASSIGNED' // the state might not be persisted yet
                            }
                        }
                    )
                ),
                tap(x=> console.log(`=======2222222222======${JSON.stringify(x)}=========`)),
                mergeMap(({ dbService, formattedService }) =>
                    forkJoin(
                        //Send ServiceAssigned to the winner
                        driverAppLinkBroker.sendServiceEventToDrivers$(
                            dbService.businessId, dbService.driver.username, 'ServiceAssigned', formattedService),
                        //Send ServiceOfferWithdraw to the losers
                        driverAppLinkBroker.sendServiceEventToDrivers$(
                            dbService.businessId, 'all', 'ServiceOfferWithdraw', { _id: formattedService._id }),
                    ),
                    tap(x=> console.log(`=======33333333333======${JSON.stringify(x)}=========`)),
                ),

            );
    }

    /**
     * Handles EventSourcing Event ServiceArrived
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceArrived$({ aid, data }) {
        console.log(`ServiceES: handleServiceArrived: ${JSON.stringify({ _id: aid, ...data })} `); //TODO: DELETE LINE
        return ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 }).pipe(
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceStateChanged', { _id: service._id, state: 'ARRIVED' })),
        );
    }

    /**
     * Handles EventSourcing Event ServicePassengerBoarded
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServicePassengerBoarded$({ aid, data }) {
        console.log(`ServiceES: handleServicePassengerBoarded: ${JSON.stringify({ _id: aid, ...data })} `); //TODO: DELETE LINE
        return ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 }).pipe(
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceStateChanged', { _id: service._id, state: 'ON_BOARD' })),
        );
    }

    /**
     * Handles EventSourcing Event ServiceCompleted
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCompleted$({ aid, data }) {
        console.log(`ServiceES: handleServiceCompleted: ${JSON.stringify({ _id: aid, ...data })} `); //TODO: DELETE LINE
        return ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 }).pipe(
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceStateChanged', { _id: service._id, state: 'DONE' })),
        );
    }



    /**
     * Handles EventSourcing Event ServiceCancelledByDriver
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByDriver$({ aid, data }) {
        console.log(`ServiceES: handleServiceCancelledByDriver: ${JSON.stringify({ _id: aid, ...data })} `); //TODO: DELETE LINE
        return ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 }).pipe(
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceStateChanged', { _id: service._id, state: 'CANCELLED_DRIVER' })),
        );
    }

    /**
     * Handles EventSourcing Event ServiceCancelledByClient
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByClient$({ aid, data }) {
        console.log(`ServiceES: handleServiceCancelledByClient: ${JSON.stringify({ _id: aid, ...data })} `); //TODO: DELETE LINE
        return ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 }).pipe(
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceCancelledByClient', { ...data, _id: service._id, state: 'CANCELLED_CLIENT' })),
        );
    }

    /**
     * Handles EventSourcing Event ServiceCancelledByOperator
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByOperator$({ aid, data }) {
        console.log(`ServiceES: handleServiceCancelledByOperator: ${JSON.stringify({ _id: aid, ...data })} `); //TODO: DELETE LINE
        return ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 }).pipe(
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceCancelledByOperator', { ...data, _id: service._id, state: 'CANCELLED_OPERATOR' })),
        );
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


    //#endregion





    //#region NOT BEING CALLED AT THE MOMENT



    /**
     * Handles EventSourcing Event ServicePickUpETAReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServicePickUpETAReported$(evt) {
        //NOT BEING CALLED FROM EVENT-STORE SERVICE
        return of({});
    }

    /**
     * Handles EventSourcing Event ServiceLocationReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceLocationReported$(evt) {
        //NOT BEING CALLED FROM EVENT-STORE SERVICE
        return of({});
    }

    /**
     * Handles EventSourcing Event ServiceDropOffETAReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceDropOffETAReported$(evt) {
        //NOT BEING CALLED FROM EVENT-STORE SERVICE
        return of({});
    }

    //#endregion
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