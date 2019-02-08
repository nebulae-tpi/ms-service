const assert = require('assert');
const expect = require('chai').expect
const uuidv4 = require('uuid/v4');
const Rx = require('rxjs');
const {
    tap,
    switchMap,
    switchMapTo,
    delay,
    filter,
    map,
    first,
    mapTo,
    mergeMap,
    mergeMapTo,
    concatMap,
    catchError
} = require('rxjs/operators');

const MqttBroker = require('../../node_modules/@nebulae/event-store/lib/broker/MqttBroker');
const mqttBroker = new MqttBroker({ eventsTopic: 'Events', brokerUrl: 'mqtt://localhost:1883' });

const KeyCloak = require('../KeyCloak');
const GraphQL = require('../GraphQL');


const Shift = require('./shift/Shift');
const Driver = require('./driver/Driver');
const Service = require('./service/Service');

const keyCloak = new KeyCloak();

/**
 * @type {Conversation}
 */
let conversation;
/**
 * @type {CivicaReloader}
 */
let civicaReloader;



const users = {
    driver: { username: 'driver', password: 'uno.2.tres', client_id: 'DRIVER-APP', gqlUrl: 'http://localhost:3000/api/driver-gateway/graphql/http' },
    satellite: { username: 'satellite', password: 'uno.2.tres', client_id: 'emi', gqlUrl: 'http://localhost:1/api/driver-gateway/graphql/http' },
}


const logError = (error) => {
    if (!error.stack) {
        console.error(error);
        return;
    }
    const stackLines = error.stack.split('\n');
    console.error(
        stackLines[0] + '\n' + stackLines.filter(line => line.includes('service-core/bin')).join('\n') + '\n'
    );
};

const getRxDefaultSubscription = (evtText, done) => {
    return [
        (evt) => console.log(`${evtText}: ${JSON.stringify(evt)}`),
        (error) => { logError(error); done(error); },
        () => done()
    ];
};


describe('DriverApp workflows', function () {

    describe('Prepare', function () {
        it('connect servers', function (done) {
            this.timeout(5000);
            Rx.merge(
                Rx.from(Object.keys(users).map(user => users[user])).pipe(
                    mergeMap((user) => keyCloak.logIn$(user.username, user.password, user.client_id).pipe(
                        tap(jwt => { user.jwt = jwt; user.graphQL = new GraphQL(jwt, user.gqlUrl); }),
                        mergeMap(x => user.graphQL.connect$()),
                        mapTo(user)
                    )),
                ),
                mqttBroker.start$()
            ).subscribe(...getRxDefaultSubscription('Prepare: connect servers', done));
        });
    });


    describe('Obtain DriverAssignedVehicles', function () {
        it('query DriverAssignedVehicles', function (done) {
            this.timeout(500);
            Driver.queryDriverAssignedVehicles$(users.driver).pipe(
                map(vehicles => vehicles.filter(v => v.active && v.blocks.length <= 0)),
                tap(vehicles => expect(vehicles).to.not.be.empty),
                tap(vehicles => selectedVehicle = vehicles[0])
            ).subscribe(...getRxDefaultSubscription('query DriverAssignedVehicles', done));
        });
    });


    describe('Operation with NO SHIFT assigned', function () {

        it('Stop Shift', function (done) {
            Shift.stopShift$(users.driver).pipe(
                delay(100)
            ).subscribe(...getRxDefaultSubscription('NO SHIFT: Stop Shift', done));
        });

        it('query open shift before start', function (done) {
            Shift.queryOpenShift$(users.driver).pipe(
                tap(shift => expect(shift).to.be.null),
            ).subscribe(...getRxDefaultSubscription('NO SHIFT: query open shift before start', done));
        });


        it('query assigned service', function (done) {
            Service.queryAssignedService$(users.driver,true).pipe(
                tap(shift => expect(shift).to.be.undefined)
            ).subscribe(...getRxDefaultSubscription('NO SHIFT: query assigned service', done));
        });
    });


    // describe('Set Shift state', function () {
    //     const shiftLogic = new Shift(graphQL);
    //     it('Set Shift state to NOT_AVAILABLE', function (done) {
    //         this.timeout(500);
    //         shiftLogic.setShiftState$("NOT_AVAILABLE").pipe(
    //             delay(100),
    //             mergeMapTo(shiftLogic.queryOpenShift$()),
    //             tap(shift => expect(shift).to.be.not.null),
    //             tap(shift => expect(shift.state).to.be.eq('NOT_AVAILABLE')),
    //         ).subscribe(...getRxDefaultSubscription('Set Shift state', done));
    //     });
    // });

    // describe('Stop Shift', function () {
    //     const shiftLogic = new Shift(graphQL);
    //     it('Stop old shift', function (done) {
    //         this.timeout(500);
    //         shiftLogic.stopShift$().pipe(
    //             delay(100),
    //             mergeMapTo(shiftLogic.queryOpenShift$()),
    //             tap(shift => expect(shift).to.be.null),
    //         ).subscribe(...getRxDefaultSubscription('Stop old shift', done));
    //     });
    // });

    describe('De-Prepare', function () {
        it('disconnects servers', function (done) {
            this.timeout(5000);
            Rx.merge(
                keyCloak.logOut$(),
            ).subscribe(...getRxDefaultSubscription('De-Prepare:disconnect servers', done));
        });
    });

});















