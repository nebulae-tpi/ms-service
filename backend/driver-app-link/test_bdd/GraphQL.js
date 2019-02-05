'use strict';

const uuidv4 = require('uuid/v4');
const expect = require('chai').expect
const GqlClient = require('graphql-client');
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

class GraphQL {

    constructor(jwt) {
        this.jwt = jwt;
        this.url = 'http://localhost:3000/api/driver-gateway/graphql/http';
        //this.url = 'https://tpi-dev.nebulae.com.co/api/driver-gateway/graphql/http';        
    }

    connect$() {
        return Rx.Observable.create(obs => {
            this.gqlClient = GqlClient({
                url: this.url,
                headers: {
                    Authorization: 'Bearer ' + this.jwt
                }
            });
            obs.next(`GraphQL connected to ${this.url}`);
            obs.complete();
        });
    }

    testConnection$() {
        const testQuery = `query{MqttParams{url,port,clientId,user,password}}`;
        return this.executeQuery$(testQuery).pipe(
            tap(({ MqttParams }) => expect(MqttParams.clientId).to.not.be.null),
            map(({ MqttParams }) => `GraphQL test ok: ${JSON.stringify(MqttParams)}`),
        );
    }


    disconnect$() {
        return Rx.of('GraphQL disconnect not implemented');
    }



    executeQuery$(query, args = {}) {
        
        return Rx.of(query).pipe(
            map(uniqueQuery => uniqueQuery.replace('RANDOM', uuidv4())),// we need this in order to force this crapy library to make the request and don return cahced info
            mergeMap(uniqueQuery => Rx.from(
                this.gqlClient.query(uniqueQuery, args, function (req, res) {
                    if (res.status !== 200) {
                        res.body = undefined;
                        throw new Error(`HTTP ERR: RES=${JSON.stringify(res)} ;;; REQ=${JSON.stringify(req)}`)
                    }
                })
            )),
            tap(({ data, errors }) => { if (errors !== undefined) throw errors[0]; }),// treat one error at the time
            map(({ data, errors }) => data)
        );
    }


    convertObjectToInputArgs(obj) {
        return Object.keys(obj).map(key => {
            const val = obj[key];
            //console.log(`||||||<${key}><${val}><${typeof val}><${Array.isArray(val)}>||||||||||||||`);
            if (typeof val === 'string' || val instanceof String) {
                return ` ${key}: "${val}"`;
            } else if (Array.isArray(val)) {
                if (val.length > 0) {
                    if (val[0] instanceof String) {
                        return ` ${key}: [${val.map(v => `"${v}"`).join(',')}]`;
                    } else if (val[0] instanceof Number) {
                        return ` ${key}: [${val.map(v => `${v}`).join(',')}]`;
                    } else if(val[0] instanceof Object){
                        return ` ${key}: [${val.map(v => `{ ${this.convertObjectToInputArgs(v)} }`).join(',')}]`;
                    }else {
                        return ` ${key}: [${val.map(v => `${JSON.stringify(v)}`).join(',')}]`;
                    }
                } else {
                    return ` ${key}: []`;
                }
            } else if (typeof val === 'number' || val instanceof Number) {
                return ` ${key}: ${val}`;
            } else if (val instanceof Object) {
                return ` ${key}: { ${this.convertObjectToInputArgs(val)} }`;
            }else{
                console.log(`[[[[[[[[[[[[[[[[${typeof val}]]]]]]]]]]]]]]]]`);
            }
        }).join(',');

    }

}

module.exports = GraphQL;