'use strict'

const uuidv4 = require("uuid/v4");
const { of, empty, forkJoin, from, Observable, Subject } = require("rxjs");
const { mergeMap, map, mapTo, filter, catchError, tap } = require('rxjs/operators');
const mqtt = require('mqtt');



// const INCOMING_SHIFT_MSG_TOPIC = "+/driver-app/shift/server";
// const INCOMING_SERVICE_MSG_TOPIC = "+/driver-app/service/server";
const INCOMING_SHIFT_MSG_TOPIC = process.env.INCOMING_SHIFT_MSG_TOPIC || "+/driver-app/shift/server";
const INCOMING_SERVICE_MSG_TOPIC = process.env.INCOMING_SERVICE_MSG_TOPIC || "+/driver-app/service/server";
/**
 * Singleton instance
 */
let instance;

class DriverAppLinkBroker {

    constructor({ url, port, clientId, user, password }) {
        this.url = url;
        this.port = port;
        this.clientId = clientId;
        this.user = user;
        this.password = password;
        this.senderId = `driver-app-link_${uuidv4()}`;
        /**
         * MQTT Client
         */
        this.listeningTopics = [
            INCOMING_SERVICE_MSG_TOPIC,
            INCOMING_SHIFT_MSG_TOPIC,
        ];
        /**
         * Rx Subject for incoming messages
         */
        this.incomingMessages$ = new Subject();
    }

    start$() {
        return Observable.create(obs => {
            this.mqttClient = mqtt.connect(this.url, {
                host: this.url,
                port: this.port,
                path: '/mqtt',
                clientId: this.clientId,
                username: this.user,
                password: this.password
            });
            obs.next(`DriverAppLinkBroker Mqtt connected: ${this.url}:${this.port} { clientId:${this.clientId}, username:${this.user} }`);
            this.mqttClient.on('message', (topic, message) => {

                // console.log(`################################### TOPIC: ${topic} ###################################`);
                // console.log(`${message} \n \n`);

                const msg = JSON.parse(message);
                if (msg && msg.att && msg.att.sId && msg.att.un && msg.t && msg.data) {
                    // message is Buffer
	            /**/
                    this.incomingMessages$.next({
                        topic: topic,
                        ...msg
                    });
		    /**/
                } else {
                    console.error(`WARNING: invalid incoming message structure: ${message}`);
                }

            });
            this.mqttClient.on('error', (arg1) => {
                console.error(`error: ${JSON.stringify(arg1)}`);
            });
            obs.next(`DriverAppLinkBroker Mqtt onMessage linked to rx.subject`);
            this.listeningTopics.forEach(topic => {
                this.mqttClient.subscribe(topic, {qos: 1});
                obs.next(`DriverAppLinkBroker Mqtt listenning to ${topic}`);
            });
            obs.complete();
        });
    }

    /**
     * Sends an event to a driver on the shift topic
     * @param {*} businessId 
     * @param {*} driverUserName 
     * @param {*} eventType 
     * @param {*} event 
     * @returns {Observable}
     */
    sendShiftEventToDrivers$(businessId, driverUserName, eventType, event) {
        const topic = `${businessId}/driver-app/shift/${driverUserName}`;
        return this.publish$(topic, eventType, event);
    }

    /**
     * Sends an event to a driver on the service topic
     * @param {*} businessId 
     * @param {*} driverUserName 
     * @param {*} eventType 
     * @param {*} event 
     * @returns {Observable}
     */
    sendServiceEventToDrivers$(businessId, driverUserName, eventType, event) {
        const topic = `${businessId}/driver-app/service/${driverUserName}`;
        console.log("CANCEL TOPIC ===> ", topic)
        return this.publish$(topic, eventType, event);
    }

    /**
     * Sends a message to a driver on the service topic
     * @param {*} businessId 
     * @param {*} driverUserName 
     * @param {*} eventType 
     * @param {*} event 
     * @returns {Observable}
     */
    sendServiceMessageToDrivers$(businessId, driverUserName, eventType, event) {
        const topic = `${businessId}/driver-app/msg/${driverUserName}`;
        return this.publish$(topic, eventType, event);
    }


    /**
     * Sends an event to a driver on the errors topic
     * @param {*} businessId 
     * @param {*} driverUserName 
     * @param {*} eventType 
     * @param {*} event 
     * @returns {Observable}
     */
    sendErrorEventToDrivers$(businessId, driverUserName, eventType, event) {
        const topic = `${businessId}/driver-app/errors/${driverUserName}`;
        return this.publish$(topic, eventType, event);
    }

    /**
     * Listen and emit all the messages from the drivers on the shift topic
     * @param {Array} types 
     * @returns {Observable}
     */
    listenShiftEventsFromDrivers$(types = []) {
        return this.getMessageListener$("shift", types);
    }

    /**
     * Listen and emit all the messages from the drivers on the service topic
     * @param {Array} types 
     * @returns {Observable}
     */
    listenServiceEventsFromDrivers$(types = []) {
        return this.getMessageListener$("service", types);
    }

    /**
     * Returns an Observable that will emit incoming message
     * @param {string[] ?} topics topic to listen
     * @param {string[] ?} types message types to listen
     * @param {boolean ?} ignoreSelfEvents
     */
    getMessageListener$(topic, types = [], ignoreSelfEvents = true) {
        return this.incomingMessages$.pipe(
            filter(
                msg => !ignoreSelfEvents || msg.att.sId !== this.senderId
            ),
            filter(msg => topic === undefined || msg.topic.indexOf(topic) > -1),
            filter(msg => types.length === 0 || types.indexOf(msg.t) > -1),
        );
    }



    /**
     * Publish data throught a topic
     * Returns an Observable that resolves to the sent message ID
     * @param {string} topicName 
     * @param {string} type message(payload) type
     * @param {Object} data 
     * @param {Object} ops {correlationId} 
     */
    publish$(topicName, type, data, { correlationId } = {}) {
        const uuid = uuidv4();
        const dataBuffer = JSON.stringify(
            {
                id: uuid,//message id
                t: type,//Type
                data,// Payload
                ts: Date.now(),// Timestamp
                ets: Date.now() + 5000,// Expiration Timestamp
                att: {
                    sId: this.senderId, //Sender Id
                    cId: correlationId,// Correlation Id
                    rt: undefined // replyTo Topic
                }
            }
        );
        return of(dataBuffer)
            .pipe(
                //tap((db) => { console.log(`Sending to app-driver using ${topicName} : ${db}`); }), //DEBUG: DELETE LINE
                tap((db) => { this.mqttClient.publish(`${topicName}`, db, { qos: 1 }); }),
                //tap((db) => { console.log(`sent ${uuid}`); }),//DEBUG: DELETE LINE
                mapTo(uuid)
            );
    }




    /**
     * Logs an error at the console.error printing only the message and the stack related to the project source code
     * @param {Error} error 
     */
    logError(error) {
        if (!error.stack) {
            console.error(error);
            return;
        }
        try {
            const stackLines = error.stack.split('\n');
            console.error(
                new Date().toString() + ': ' + stackLines[0] + '\n' + stackLines.filter(line => line.includes('driver-app-link/bin')).join('\n') + '\n'
            );
        }
        catch (e) {
            console.error(e);
            console.error(error);
        }
    }
}

/**
 * @returns {DriverAppLinkBroker}
 */
module.exports = () => {
    if (!instance) {
        instance = new DriverAppLinkBroker(
            {
                url: process.env.DRIVER_APP_MQTT_SERVER_URL,
                port: process.env.DRIVER_APP_MQTT_SERVER_PORT,
                clientId: `${process.env.DRIVER_APP_MQTT_SERVER_CLIENT_ID}-${uuidv4()}`,
                user: process.env.DRIVER_APP_MQTT_SERVER_USER,
                password: process.env.DRIVER_APP_MQTT_SERVER_PASSWORD,
            }
        );
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};
