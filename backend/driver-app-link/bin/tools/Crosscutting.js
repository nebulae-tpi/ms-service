'use strict'

const uuidv4 = require("uuid/v4");
const dateFormat = require('dateformat');

class Crosscutting {


    /**
     * Generates a unique UUID/v4 with an extra number at the end describing the yaer and month (-yymm)
     */
    static generateDateBasedUuid() {
        return `${uuidv4()}-${dateFormat(new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })), "yymm")}`;
    }

}

/**
 * @returns {Crosscutting}
 */
module.exports = Crosscutting;