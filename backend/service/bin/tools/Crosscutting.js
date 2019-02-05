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

        return dateFormat(date, "yymm")
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

}

/**
 * @returns {Crosscutting}
 */
module.exports = Crosscutting;