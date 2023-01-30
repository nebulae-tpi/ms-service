'use strict'

const uuidv4 = require("uuid/v4");
const dateFormat = require('dateformat');

class Crosscutting {


    /**
     * Generates a unique UUID/v4 with an extra number at the end describing the yaer and month (-yymm)
     */
    static generateDateBasedUuid() {
        const currentDate = new Date(new Date().toLocaleString(undefined, { timeZone: 'America/Bogota' }));
        const yymm = dateFormat(currentDate, "yymm");
        return `${uuidv4()}-${yymm}`;
    }

}

/**
 * @returns {Crosscutting}
 */
module.exports = Crosscutting;