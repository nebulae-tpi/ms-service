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

const keyCloak = new KeyCloak();
const graphQL = new GraphQL();
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

    const driver = new Driver(graphQL);
    const shift = new Shift(graphQL);

    let selectedVehicle = undefined;
    let openShift = undefined;

    describe('Prepare', function () {
        it('connect servers', function (done) {
            this.timeout(5000);
            Rx.merge(
                keyCloak.logIn$().pipe(
                    tap(jwtEvt => graphQL.jwt = keyCloak.jwt),
                    mergeMap(jwtEvt => graphQL.connect$()),
                    mergeMap(() => graphQL.testConnection$())
                ),
                mqttBroker.start$(),
                appLinkBroker.start$()
            ).subscribe(...getRxDefaultSubscription('Prepare: SHIFT MANAGEMENT TEST', done));
        });
    });


    describe('Obtain DriverAssignedVehicles', function () {
        it('query DriverAssignedVehicles', function (done) {
            this.timeout(500);
            driver.queryDriverAssignedVehicles$().pipe(
                map(vehicles => vehicles.filter(v => v.active && v.blocks.length <= 0)),
                tap(vehicles => expect(vehicles).to.not.be.empty),
                tap(vehicles => selectedVehicle = vehicles[0])
            ).subscribe(...getRxDefaultSubscription('query DriverAssignedVehicles', done));
        });
    });


    describe('Start Shift', function () {
        const shiftLogic = new Shift(graphQL);
        it('start new shift', function (done) {
            this.timeout(500);
            shiftLogic.startShift$(selectedVehicle.plate).pipe(
                delay(100),
                mergeMapTo(shiftLogic.queryOpenShift$()),
                tap(shift => expect(shift.vehicle.plate).to.be.equal(selectedVehicle.plate)),
                tap(shift => openShift = shift),
            ).subscribe(...getRxDefaultSubscription('started new shift', done));
        });
    });

    describe('Set Shift state', function () {
        const shiftLogic = new Shift(graphQL);
        it('Set Shift state to NOT_AVAILABLE', function (done) {
            this.timeout(500);

            Rx.forkJoin(
                appLinkBroker.listenShiftEventsFromServer$(['ShiftStateChanged']).pipe(                    
                    first(),
                    mergeMap((evt) => console.log(`=============${JSON.stringify(evt)}=================`)),                    
                ),
                shiftLogic.setShiftState$("NOT_AVAILABLE").pipe(
                    mergeMapTo(shiftLogic.queryOpenShift$()),
                    tap(shift => expect(shift).to.be.not.null),
                    tap(shift => expect(shift.state).to.be.eq('NOT_AVAILABLE')),
                )
            ).subscribe(...getRxDefaultSubscription('Set Shift state', done)); 
        });


        it('Set Shift state to AVAILABLE', function (done) {
            this.timeout(500);
            shiftLogic.setShiftState$("AVAILABLE").pipe(
                delay(100),
                mergeMapTo(shiftLogic.queryOpenShift$()),
                tap(shift => expect(shift).to.be.not.null),
                tap(shift => expect(shift.state).to.be.eq('NOT_AVAILABLE')),
            ).subscribe(...getRxDefaultSubscription('Set Shift state', done));
        });
    });

    describe('Stop Shift', function () {
        const shiftLogic = new Shift(graphQL);
        it('Stop old shift', function (done) {
            this.timeout(500);
            shiftLogic.stopShift$().pipe(
                delay(100),
                mergeMapTo(shiftLogic.queryOpenShift$()),
                tap(shift => expect(shift).to.be.null),
            ).subscribe(...getRxDefaultSubscription('Stop old shift', done));
        });
    });

    describe('De-Prepare', function () {
        it('disconnects servers', function (done) {
            this.timeout(5000);
            Rx.merge(
                keyCloak.logOut$(),
                graphQL.disconnect$()
            ).subscribe(...getRxDefaultSubscription('De-Prepare:disconnect servers', done));
        });
    });

});















