'use strict';

const tokenRequester = require('keycloak-request-token');

const { from, of } = require('rxjs');
const {
    tap,
    switchMap,
    delay,
    filter,
    map,
    first,
    mapTo,
    mergeMap,
    concatMap,
    timeout
} = require('rxjs/operators');

class KeyCloak {

    constructor() {
        this.jwt = undefined;

        this.client_id = 'emi';

        // this.baseUrl = 'http://localhost:8080/auth';
        // this.realmName = 'DEV_TPI';
        // this.client_id = 'emi';
        // this.username = '*******';
        // this.password = '*******';
        
        this.baseUrl = 'https://tpi-dev.nebulae.com.co/auth';
        this.realmName = 'TPI';
        this.client_id = 'EMI';
        this.username = '*******************';
        this.password = '*******************';       
    }

    logIn$() {
        const settings = {
            username: this.username,
            password: this.password,            
            client_id:this.client_id,
            realmName: this.realmName,
            grant_type: 'password',
        };

        return from(tokenRequester(this.baseUrl, settings)).pipe(
            tap(jwt => this.jwt = jwt),
            map(jwt => `JWT=${jwt}`),
        );
    }

    logOut$() {
        return of('KeyCloak logOut not implemented');
    }

}
/**
 * @returns {KeyCloak}
 */
module.exports = KeyCloak;