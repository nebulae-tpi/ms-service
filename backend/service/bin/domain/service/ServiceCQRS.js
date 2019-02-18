"use strict";

const uuidv4 = require("uuid/v4");
const { of, interval, from } = require("rxjs");
const Event = require("@nebulae/event-store").Event;
const eventSourcing = require("../../tools/EventSourcing")();
const ServiceDA = require('./data-access/ServiceDA');
const broker = require("../../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const GraphqlResponseTools = require('../../tools/GraphqlResponseTools');
const Crosscutting = require('../../tools/Crosscutting');
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
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR"]
    ).pipe(
      mergeMap(roles => {
        const isPlatformAdmin = roles["PLATFORM-ADMIN"];
        //If an user does not have the role to get the Service from other business, the query must be filtered with the businessId of the user
        const businessId = !isPlatformAdmin? (authToken.businessId || ''): null;
        return ServiceDA.getService$(args.id, businessId)
      }),
      map(service => Crosscutting.formatServiceToGraphQLSchema(service)),
      mergeMap(rawResponse => {
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
    console.log('****************** getServiceSatelliteList => ', args);
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
        return from(serviceList).pipe(
          map(service => Crosscutting.formatServiceToGraphQLSchema(service)),
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
    console.log('getServiceList => ', args);
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Service",
      "getServiceList",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR"]
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
   * Gets the amount of the Service according to the filter.
   *
   * @param {*} args args
   */
  getServiceListSize$({ args }, authToken) {
    console.log('getServiceListSize => ', args);
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "Service",
      "getServiceListSize",
      PERMISSION_DENIED,
      ["PLATFORM-ADMIN", "BUSINESS-OWNER", "BUSINESS-ADMIN", "SATELLITE", "OPERATOR"]
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
