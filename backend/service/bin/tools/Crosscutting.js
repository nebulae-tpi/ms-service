'use strict'

require('datejs');
const dateFormat = require('dateformat');
const uuidv4 = require("uuid/v4");
//const GMT_OFFSET = ((parseInt(process.env.GMT_TO_SERVE.replace('GMT', '') * 60)) + new Date().getTimezoneOffset()) * 60000;


class Crosscutting{

    /**
     * Generates an uuid based on the uuid/v4 library and at the end 
     * of this uuid concatenates the month and the year. 
     * This is useful for cases where the info will be stored in collections by month.
     * 
     * @param {*} date Date with which will be generated the suffix of the uuid.
     */
    static generateHistoricalUuid(date) {
        const dateGMT = new Date(date.toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
        //const dateGMT = new Date(date.getTime() + GMT_OFFSET)
        const sufixUuid = this.getYearMonth(dateGMT);
        const uuId = `${uuidv4()}-${sufixUuid}`;
        return uuId;
    }

    /**
     * Generates a suffix (yyMM) according to the date.
     * Format: yyMM
     * 
     * @example
     * month: 06
     * year: 2018
     * // returns 1806
     * 
     * @param {*} date 
     */
    static getYearMonth(date){        
        // let month = ""+(date.getMonth()+1);
        // let year = date.getFullYear() + '';
        // month = (month.length == 1 ? '0': '') + month;
        // year = year.substr(year.length - 2)

        // return `${year}${month}`;

        return dateFormat(date, "yymm");
    }

    /**
     * Returns an array of yearmonth according to the initDate and the endDate
     * @param {*} date1 
     * @param {*} date2 
     */
   static getYearMonthArray(date1, date2) {
        const startDate = new Date(date1.toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
        const stopDate = new Date(date2.toLocaleString('es-CO', { timeZone: 'America/Bogota' }));

        // const startDate = new Date(date1.getTime() + GMT_OFFSET);
        // const stopDate = new Date(date2.getTime() + GMT_OFFSET);
        startDate.setHours(0,0,0,0);
        startDate.setDate(1);

        stopDate.setHours(0,0,0,0);
        stopDate.setDate(1);


        const dateArray = new Array();
        let currentDate = startDate;
        while (currentDate <= stopDate) {
            dateArray.push(currentDate);
            currentDate = this.addMonth(currentDate, 1);
        }
        return dateArray;
    }

    static addMonth(date, amountOfMonths){
        const newDate = new Date(date);
        newDate.add(amountOfMonths).month();
        return newDate;
    }


          /**
     * Fromats Service to the GraphQL schema 
     * @param Object service
     */
    static formatServiceToGraphQLSchema(service) {
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


    static buildStateChangesArray(stateChanges){
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
  
    static buildRouteArray(routes){
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
  
    static buildCoordinate(location){
        if(!location){
          return null;
        }
  
        return {
          lat: location.coordinates[1],
          lng: location.coordinates[0]
        }
      }
  
    static buildPickUpAndDropOff(pointLocation){
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

}

/**
 * @returns {Crosscutting}
 */
module.exports = Crosscutting;