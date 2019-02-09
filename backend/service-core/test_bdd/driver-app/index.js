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
const DriverAppLinkBroker = require('../DriverAppLinkBroker');


const Shift = require('./shift/Shift');
const Driver = require('./driver/Driver');
const Service = require('./service/Service');

const keyCloak = new KeyCloak();
/**
 * {DriverAppLinkBroker}
 */
const appLinkBroker = new DriverAppLinkBroker(
    {
        url: 'tcp://localhost',
        port: undefined,
        clientId: 'mocha/chai',
        user: '',
        password: '',
    }
);

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
                mqttBroker.start$(),
                appLinkBroker.start$()
            ).subscribe(...getRxDefaultSubscription('Prepare: connect servers', done));
        });
    });


    describe('Obtain DriverAssignedVehicles', function () {
        it('query DriverAssignedVehicles', function (done) {
            this.timeout(500);
            Driver.queryDriverAssignedVehicles$(users.driver).pipe(
                map(vehicles => vehicles.filter(v => v.active && v.blocks.length <= 0)),
                tap(vehicles => expect(vehicles).to.not.be.empty),
                tap(vehicles => users.driver.vehicle = vehicles[0])
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
            Service.queryAssignedService$(users.driver, true).pipe(
                tap(shift => expect(shift).to.be.undefined)
            ).subscribe(...getRxDefaultSubscription('NO SHIFT: query assigned service', done));
        });
    });


    describe('Starting new SHIFT', function () {

        it('start Shift', function (done) {
            Rx.forkJoin(
                appLinkBroker.listenShiftEventsFromServer$(['ShiftStateChanged'], users.driver.username).pipe(
                    first((evt) => evt.t = 'ShiftStateChanged' && evt.data.state == 'AVAILABLE', undefined),
                    tap((evt) => expect(evt.data.state).to.be.eq('AVAILABLE')),
                    tap((evt) => expect(evt.data.driver.username).to.exist),
                    tap((evt) => users.driver.shift = evt.data),
                ),
                Shift.startShift$(users.driver, users.driver.vehicle.plate).pipe(
                    delay(200),
                    mergeMap(() => Shift.queryOpenShift$(users.driver)),
                    tap(shift => expect(shift.state).to.be.eq('AVAILABLE'))
                )
            ).subscribe(...getRxDefaultSubscription('Starting SHIFT: Stop Shift', done));
        });
    });

    describe('Set Shift state', function () {
        it('Set Shift state to NOT_AVAILABLE', function (done) {
            this.timeout(500);
            Rx.forkJoin(
                appLinkBroker.listenShiftEventsFromServer$(['ShiftStateChanged'], users.driver.username).pipe(
                    first((evt) => evt.t = 'ShiftStateChanged' && evt.data.state == 'NOT_AVAILABLE', undefined),
                    tap((evt) => expect(evt.data.state).to.be.eq('NOT_AVAILABLE')),
                ),
                Shift.setShiftState$(users.driver, "NOT_AVAILABLE").pipe(
                    delay(100),
                    mergeMap(() => Shift.queryOpenShift$(users.driver)),
                    tap(shift => expect(shift).to.be.not.null),
                    tap(shift => expect(shift.state).to.be.eq('NOT_AVAILABLE')),
                )
            ).subscribe(...getRxDefaultSubscription('Set Shift state', done));
        });

        it('Set Shift state to AVAILABLE', function (done) {
            this.timeout(500);
            Rx.forkJoin(
                appLinkBroker.listenShiftEventsFromServer$(['ShiftStateChanged'], users.driver.username).pipe(
                    first((evt) => evt.t = 'ShiftStateChanged' && evt.data.state == 'AVAILABLE', undefined),
                    tap((evt) => expect(evt.data.state).to.be.eq('AVAILABLE')),
                ),
                Shift.setShiftState$(users.driver, "AVAILABLE").pipe(
                    delay(100),
                    mergeMap(() => Shift.queryOpenShift$(users.driver)),
                    tap(shift => expect(shift).to.be.not.null),
                    tap(shift => expect(shift.state).to.be.eq('AVAILABLE')),
                )
            ).subscribe(...getRxDefaultSubscription('Set Shift state', done));
        });
    });




    describe('Location + service', function () {

        it('NO SERVICE: query assigned service', function (done) {
            Service.queryAssignedService$(users.driver, true).pipe(
                tap(service => expect(service).to.be.undefined)
            ).subscribe(...getRxDefaultSubscription('Sopping SHIFT: Stop Shift', done));
        });

        it('Service creation and offering', function (done) {
            this.timeout(500);
            Rx.forkJoin(
                Service.listenShiftEventsFromServer$(['ServiceOffered'], users.driver.username).pipe(
                    first((evt) => evt.t = 'ServiceOffered'),
                    tap((evt) => expect(evt.data.state).to.be.eq('AVAILABLE')),
                    tap((evt) => expect(evt.data.state).to.be.eq('AVAILABLE')),
                ),
                Shift.setShiftState$(users.driver, "AVAILABLE").pipe(
                    delay(100),
                    mergeMap(() => Shift.queryOpenShift$(users.driver)),
                    tap(shift => expect(shift).to.be.not.null),
                    tap(shift => expect(shift.state).to.be.eq('AVAILABLE')),
                )
            ).subscribe(...getRxDefaultSubscription('Set Shift state', done));
        });


    

    });



    describe('Sopping new SHIFT', function () {

        it('Stop Shift', function (done) {
            Shift.stopShift$(users.driver).pipe(
                delay(100)
            ).subscribe(...getRxDefaultSubscription('Sopping SHIFT: Stop Shift', done));
        });
    });

    describe('De-Prepare', function () {
        it('disconnects servers', function (done) {
            this.timeout(5000);
            Rx.merge(
                keyCloak.logOut$(),
            ).subscribe(...getRxDefaultSubscription('De-Prepare:disconnect servers', done));
        });
    });

});















