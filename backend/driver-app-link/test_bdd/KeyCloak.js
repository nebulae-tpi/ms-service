'use strict';

const tokenRequester = require('keycloak-request-token');

const Rx = require('rxjs');
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

        this.baseUrl = 'http://localhost:8080/auth';
        this.realmName = 'DEV_TPI';
        this.client_id = 'DRIVER-APP';
        this.username = 'sebastian.molano@nebulae.com.co';
        this.password = 'uno.2.tres';             
    }

    logIn$() {
        const settings = {
            username: this.username,
            password: this.password,            
            client_id:this.client_id,
            realmName: this.realmName,
            grant_type: 'password',
        };

        return Rx.from(tokenRequester(this.baseUrl, settings)).pipe(
            tap(jwt => this.jwt = jwt),
            map(jwt => `JWT=${jwt}`),
        );
    }

    logOut$() {
        return Rx.of('KeyCloak logOut not implemented');
    }

}

module.exports = KeyCloak;