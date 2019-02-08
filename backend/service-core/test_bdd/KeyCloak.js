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
        this.baseUrl = 'http://localhost:8080/auth';
        this.realmName = 'DEV_TPI';
    }

    logIn$(username, password, client_id) {
        const settings = {
            username,
            password,
            client_id,
            realmName: this.realmName,
            grant_type: 'password',
        };

        return Rx.from(tokenRequester(this.baseUrl, settings)).pipe(
            //tap(jwt => console.log(`JWT for ${username}: ${jwt}`)),
        );
    }

    logOut$() {
        return Rx.of('KeyCloak logOut not implemented');
    }

}

module.exports = KeyCloak;