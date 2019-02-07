"use strict";

const uuidv4 = require("uuid/v4");
const { of, interval, from } = require("rxjs");
const Event = require("@nebulae/event-store").Event;
const eventSourcing = require("../../tools/EventSourcing")();
const ServiceDA = require('./data-access/ServiceDA');
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const RoleValidator = require("../../tools/RoleValidator");
const { take, mergeMap, catchError, map, toArray } = require('rxjs/operators');
const {
  CustomError,
  DefaultError,
  INTERNAL_SERVER_ERROR_CODE,
  PERMISSION_DENIED
} = require("../../tools/customError");



/**
 * Singleton instance
 */
let instance;

class ServiceCQRS {
  constructor() {
  }

  /**  
   * Gets the Service
   *
   * @param {*} args args
   */
  getService$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Service",
      "getService",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Service from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): null;
        return ServiceDA.getService$(args.id, businessId)
      }),
      map(service => this.formatServiceToGraphQLSchema(service)),
      mergeMap(rawResponse => {
        console.log('rawResponse => ', rawResponse);
        return GraphqlResponseTools.buildSuccessResponse$(rawResponse);
      }),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }


    /**  
   * Gets the Service list
   *
   * @param {*} args args
   */
  getServiceSatelliteList$({ args }, authToken) {
    console.log('getServiceSatelliteList$ --*');
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Service",
      "getServiceSatelliteList",
      PERMISSION_DENIED,
      ["OPERATOR","SATELLITE"]
    ).pipe(
      mergeMap(roles => {
        const isOperator = roles["OPERATOR"];
        const isSatellite = roles["SATELLITE"];

        const businessId = authToken.businessId || '-1';
        const clientId = !isOperator && isSatellite ? (authToken.clientId || '-1'): null;
        return ServiceDA.getServiceSatelliteList$(businessId, clientId);
      }),
      toArray(),
      mergeMap(serviceList => {
        console.log('ServiceList => ', serviceList );
        return from(serviceList).pipe(
          map(service => this.formatServiceToGraphQLSchema(service)),
          toArray()
        );
      }),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

  
  /**  
   * Gets the Service list
   *
   * @param {*} args args
   */
  getServiceList$({ args }, authToken) {
    console.log('getServiceList$ --*** ');
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Service",
      "getServiceList",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        const isSatellite = roles["SATELLITE"];
        //If an user does not have the role to get the Service from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || '-1'): args.filterInput.businessId;
        const clientId = !isPlatformAdmin && isSatellite ? (authToken.clientId || '-1'): null;
        const filterInput = args.filterInput;
        filterInput.businessId = businessId;
        filterInput.clientId = clientId;
        return ServiceDA.getServiceList$(filterInput, args.paginationInput);
      }),
      toArray(),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

    /**  
   * Gets the amount of the Service according to the filter
   *
   * @param {*} args args
   */
  getServiceListSize$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Service",
      "getServiceListSize",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        const isSatellite = roles["SATELLITE"];
        //If an user does not have the role to get the Service from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): args.filterInput.businessId;
        const clientId = !isPlatformAdmin && isSatellite ? (authToken.clientId || '-1'): null;

        const filterInput = args.filterInput;
        filterInput.businessId = businessId;
        filterInput.clientId = clientId;

        return ServiceDA.getServiceSize$(filterInput);
      }),
      mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
      catchError(err => GraphqlResponseTools.handleError$(err))
    );
  }

      /**
     * Fromats Service to the GraphQL schema 
     * @param Object service
     */
    formatServiceToGraphQLSchema(service) {
      return {
        _id: service._id,
        businessId: service.businessId,
        shiftId: service.shiftId,
        timestamp: service.timestamp,
        requestedFeatures: service.requestedFeatures,
        pickUp: this.buildPickUpAndDropOff(service.pickUp),
        dropOff: this.buildPickUpAndDropOff(service.dropOff),
        pickUpETA: service.pickUpETA,
        pickUpETA: service.pickUpETA,
        dropOffETA: service.dropOffETA,
        verificationCode: service.verificationCode,
        paymentType: service.paymentType,
        fareDiscount: service.fareDiscount,
        fare: service.fare,
        state: service.state,
        location: this.buildCoordinate(service.location),
        stateChanges: this.buildStateChangesArray(service.stateChanges),
        vehicle: service.vehicle,
        driver: service.driver,
        driver: service.driver,
        tip: service.tip,
        route: this.buildRouteArray(service.route ? service.route.coordinates: null),
        lastModificationTimestamp: service.lastModificationTimestamp,
        client: service.client
      };
    }

    buildStateChangesArray(stateChanges){
      if(!stateChanges){
        return null;
      }
      const stateChangesArray = [];

      stateChanges.forEach(stateChange => {
        stateChangesArray.push({
          state: stateChange.state,
          timestamp: stateChange.timestamp,
          location: this.buildCoordinate(stateChange.location),
          notes: stateChange.notes,
        });
      });
      return stateChangesArray;
    }

    buildRouteArray(routes){
      if(!routes || routes.length == 0){
        return null;
      }
      const routesArray = [];
      console.log('routes => ',routes);
      routes.forEach(route => {
        routesArray.push({
          lat: route[1],
          lng: route[0]
        })

      });
      return routesArray;
    }

    buildCoordinate(location){
      if(!location){
        return null;
      }

      return {
        lat: location.coordinates[1],
        lng: location.coordinates[0]
      }
    }

    buildPickUpAndDropOff(pointLocation){
      if(!pointLocation){
        return null;
      }
      let marker = null;
      let polygon = null;
  
      if(pointLocation.marker){
        marker = {
          lat: pointLocation.marker.coordinates[1],
          lng: pointLocation.marker.coordinates[0],
        };
      } 
  
      if(pointLocation.polygon){
        polygon = [];
        pointLocation.polygon.coordinates[0].forEach(element => {
          polygon.push({
            lat: element[1],
            lng: element[0],
          });
        });
      } 
      
      const location = {
        marker: marker,
        polygon: polygon,
        city: pointLocation.city,
        zone: pointLocation.zone,
        neighborhood: pointLocation.neighborhood,
        addressLine1: pointLocation.addressLine1,
        addressLine2: pointLocation.addressLine2,
        notes: pointLocation.notes,
      };
  
      return location;
    }

  //#endregion

}

/**
 * @returns {ServiceCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new ServiceCQRS();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
