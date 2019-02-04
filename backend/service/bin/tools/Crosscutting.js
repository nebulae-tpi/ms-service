'use strict'

const uuidv4 = require("uuid/v4");
const GMT_OFFSET = ((parseInt(process.env.GMT_TO_SERVE.replace('GMT', '') * 60)) + new Date().getTimezoneOffset()) * 60000;

class Crosscutting{

    /**
     * Generates an uuid based on the uuid/v4 library and at the end 
     * of this uuid concatenates the month and the year. 
     * This is useful for cases where the info will be stored in collections by month.
     * 
     * @param {*} date Date with which will be generated the suffix of the uuid.
     */
    static generateHistoricalUuid(date) {
        const dateGMT = new Date(date.getTime() + GMT_OFFSET)
        const sufixUuid = this.getMonthYear(dateGMT);
        const uuId = `${uuidv4()}-${sufixUuid}`;
        return uuId;
    }

    /**
     * Generates a suffix (MMyy) according to the date.
     * Format: MMyy
     * 
     * @example
     * month: 06
     * year: 2018
     * // returns 0618
     * 
     * @param {*} date 
     */
    static getMonthYear(date){
        let month = ""+(date.getMonth()+1);
        let year = date.getFullYear() + '';
        month = (month.length == 1 ? '0': '') + month;
        year = year.substr(year.length - 2)

        return `${month}${year}`;
    }

    /**
     * Returns an array of monthyear according to the initDate and the endDate
     * @param {*} date1 
     * @param {*} date2 
     */
   static getMonthYearArray(date1, date2) {
       console.log('date1 => ', date1.toString());
       console.log('date2 => ', date2.toString());
        const startDate = new Date(date1.getTime() + GMT_OFFSET);
        const stopDate = new Date(date2.getTime() + GMT_OFFSET);
        console.log('startDate => ', startDate.toString());
       console.log('stopDate => ', stopDate.toString());
        startDate.setHours(0,0,0,0);
        startDate.setDate(1);

        stopDate.setHours(0,0,0,0);
        stopDate.setDate(1);


        const dateArray = new Array();
        let currentDate = startDate;
        while (currentDate <= stopDate) {
            dateArray.push(currentDate);
            currentDate = this.addMonth(currentDate);
        }
        return dateArray;
    }

    static addMonth(date){
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + 1);
        return newDate;
    }

}

/**
 * @returns {Crosscutting}
 */
module.exports = Crosscutting;