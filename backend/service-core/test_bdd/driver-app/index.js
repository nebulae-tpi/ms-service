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
    driver: { username: 'driver', password: 'uno.2.tres', client_id: 'DRIVER-APP', gqlUrl: 'http://localhost:3000/api/driver-gateway/graphql/http', businessId: "ea7f1b5b-1e8a-42cf-a5d5-47c3934cb82b" },
    satellite: { username: 'satellite', password: 'uno.2.tres', client_id: 'emi', gqlUrl: 'http://localhost:3001/api/emi-gateway/graphql/http', businessId: "ea7f1b5b-1e8a-42cf-a5d5-47c3934cb82b" },
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
                        tap(jwt => { console.log(`JWT[${user.username}]: \n${jwt}\n\n`) }),
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
            Shift.queryOpenShift$(users.driver, { deviceIdentifier: 'mocha' }).pipe(
                tap(shift => expect(shift).to.be.null),
            ).subscribe(...getRxDefaultSubscription('NO SHIFT: query open shift before start', done));
        });


        it('query assigned service', function (done) {
            Service.queryAssignedService$(users.driver, true).pipe(
                tap(shift => expect(shift).to.not.exist)
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
                Shift.startShift$(users.driver, users.driver.vehicle.plate, 'mocha').pipe(
                    delay(200),
                    mergeMap(() => Shift.queryOpenShift$(users.driver, { deviceIdentifier: 'mocha' })),
                    tap(shift => expect(shift.state).to.be.eq('AVAILABLE')),

                    //Query OpenShift with other device                    
                    mergeMap(() => Shift.queryOpenShift$(users.driver, { deviceIdentifier: 'mocha2' })),
                    tap(shift => expect(shift).to.be.null),

                    //try to start a new shift having one open
                    mergeMap(() => Shift.startShift$(users.driver, users.driver.vehicle.plate, 'mocha', true)),
                    tap(x => expect(x).to.not.exist)

                )
            ).subscribe(...getRxDefaultSubscription('Starting SHIFT: Stop Shift', done));
        });
    });

    describe('Set Shift state + ShiftLocationReported', function () {


        it('Send Shift event with invalid jwt', function (done) {
            this.timeout(500);
            const location = { lat: 6.100000, lng: -75.10000 };
            const eventType = 'ShiftLocationReported';
            const businessId = users.driver.businessId;
            const shiftId = users.driver.shift._id;

            return Rx.forkJoin(
                //wait for change confirmation
                appLinkBroker.listenErrorsEventsFromServer$(['Error'], users.driver.username).pipe(
                    first((evt) => evt.t = 'Error'),
                    map(({ data }) => data),
                    tap(({ code, msg }) => expect(code).to.be.eq(23003)),
                ),
                appLinkBroker.sendShiftEventToServer$(businessId, eventType, undefined, users.driver.username, {
                    _id: shiftId,
                    timestamp: Date.now(),
                    location
                })
            ).subscribe(...getRxDefaultSubscription('send shift event with invalid jwt', done));
        });


        it('Set Shift state to NOT_AVAILABLE', function (done) {
            this.timeout(500);
            Rx.forkJoin(
                appLinkBroker.listenShiftEventsFromServer$(['ShiftStateChanged'], users.driver.username).pipe(
                    first((evt) => evt.t = 'ShiftStateChanged' && evt.data.state == 'NOT_AVAILABLE', undefined),
                    tap((evt) => expect(evt.data.state).to.be.eq('NOT_AVAILABLE')),
                ),
                Shift.setShiftState$(users.driver, "NOT_AVAILABLE").pipe(
                    delay(100),
                    mergeMap(() => Shift.queryOpenShift$(users.driver, { deviceIdentifier: 'mocha' })),
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
                    mergeMap(() => Shift.queryOpenShift$(users.driver, { deviceIdentifier: 'mocha' })),
                    tap(shift => expect(shift).to.be.not.null),
                    tap(shift => expect(shift.state).to.be.eq('AVAILABLE')),
                    delay(100)
                )
            ).subscribe(...getRxDefaultSubscription('Set Shift state', done));
        });


    });




    describe('Location + service', function () {

        const serviceRequest = {
            client: { id: "1", tip: 1000, tipType: "CASH", username: "juansmolano", referrerDriverDocumentId: "123456", fullname: "Sebastian Molano", offerMinDistance: 100, offerMaxDistance: 2500 },
            pickUp: { city: "ENVIGADO", marker: { lat: 6.172257, lng: -75.593177 }, zone: "T1", neighborhood: "Primavera", addressLine1: "Carrera 47A #38b Sur-21" },
            requestedFeatures: ["AC"],
            paymentType: "CASH",
            tip: 1200,
            fareDiscount: 0.01,
            fare: 15000,
        };

        it('NO SERVICE: query assigned service', function (done) {
            Service.queryAssignedService$(users.driver, true).pipe(
                tap(service => expect(service).to.not.exist)
            ).subscribe(...getRxDefaultSubscription('Sopping SHIFT: Stop Shift', done));
        });

        it('locating shift in a proper range', function (done) {
            this.timeout(500);
            const location = { lat: 6.164602, lng: -75.601532 };
            const eventType = 'ShiftLocationReported';
            const businessId = users.driver.businessId;
            const shiftId = users.driver.shift._id;

            return appLinkBroker.sendShiftEventToServer$(businessId, eventType, users.driver.jwt, users.driver.username, {
                _id: shiftId,
                timestamp: Date.now(),
                location
            }).subscribe(...getRxDefaultSubscription('locating shift in a proper range', done));
        });

        it('Service creation and offering', function (done) {
            this.timeout(2000);
            Rx.forkJoin(
                appLinkBroker.listenServiceEventsFromServer$(['ServiceOffered'], users.driver.username).pipe(
                    first((evt) => evt.t = 'ServiceOffered'),
                    map(({ data }) => data),
                    tap(({ _id, timestamp, pickUp }) => expect(_id).to.not.be.empty),
                    tap(({ _id, timestamp, pickUp }) => expect(timestamp).to.exist),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp).to.exist),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.zone).to.exist),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.neighborhood).to.exist),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.city).to.exist),
                    tap(service => users.driver.serviceOffer = service),
                    delay(500)
                ),
                Service.requestService$(users.satellite, serviceRequest).pipe(
                    delay(100),
                    tap(({ accepted }) => expect(accepted).to.be.true),
                )
            ).subscribe(...getRxDefaultSubscription('Service creation and offering', done));
        });


        it('Service Acceptance and assigment', function (done) {
            this.timeout(2000);
            Rx.forkJoin(
                //wait for accept confirmation
                appLinkBroker.listenServiceEventsFromServer$(['ServiceAssigned'], users.driver.username).pipe(
                    first((evt) => evt.t = 'ServiceAssigned'),
                    map(({ data }) => data),
                    tap(({ _id, timestamp, pickUp, client }) => expect(_id).to.be.eq(users.driver.serviceOffer._id)),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp).to.exist),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.zone).to.exist),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.neighborhood).to.eq(users.driver.serviceOffer.pickUp.neighborhood)),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.city).to.eq(users.driver.serviceOffer.pickUp.city)),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.zone).to.eq(users.driver.serviceOffer.pickUp.zone)),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.marker).to.exist),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.marker.lat).to.exist),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.marker.lng).to.exist),
                    tap(service => users.driver.service = service)
                ),
                Service.acceptServiceOffer$(users.driver, { shiftId: users.driver.shift._id, serviceId: users.driver.serviceOffer._id, location: { lat: 6.172257, lng: -75.593177 } }).pipe(
                    tap(({ accepted }) => expect(accepted).to.be.true),
                    delay(200),
                    mergeMap(() => Service.queryAssignedService$(users.driver)),
                    tap(({ _id, timestamp, pickUp, client }) => expect(_id).to.be.eq(users.driver.serviceOffer._id)),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp).to.exist),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.zone).to.not.be.empty),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.neighborhood).to.eq(users.driver.serviceOffer.pickUp.neighborhood)),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.city).to.eq(users.driver.serviceOffer.pickUp.city)),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.zone).to.eq(users.driver.serviceOffer.pickUp.zone)),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.marker).to.exist),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.marker.lat).to.exist),
                    tap(({ _id, timestamp, pickUp }) => expect(pickUp.marker.lng).to.exist),
                )
            ).subscribe(...getRxDefaultSubscription('Service Acceptance and assigment', done));
        });

        const buildChangeStateTest$ = (serviceId, eventType, newState, businessId) => {
            return Rx.forkJoin(
                //wait for change confirmation
                appLinkBroker.listenServiceEventsFromServer$(['ServiceStateChanged'], users.driver.username).pipe(
                    first((evt) => evt.t = 'ServiceStateChanged'),
                    map(({ data }) => data),
                    tap(({ _id, state }) => expect(_id).to.be.eq(users.driver.service._id)),
                    tap(({ _id, state }) => expect(state).to.be.eq(newState)),
                    tap(({ _id, state }) => users.driver.service.state = state),
                    delay(150)
                ),
                appLinkBroker.sendServiceEventToServer$(businessId, eventType, users.driver.jwt, users.driver.username, {
                    _id: serviceId,
                    timestamp: Date.now(),
                    location: { lat: 6.175301, lng: -75.592201 }
                }),
            );
        };

        it('Send service event with invalid jwt', function (done) {
            this.timeout(2000);
            const newState = 'ON_BOARD';
            const eventType = 'ServiceVehicleArrived';
            const businessId = users.driver.businessId;
            const serviceId = users.driver.service._id;

            return Rx.forkJoin(
                //wait for change confirmation
                appLinkBroker.listenErrorsEventsFromServer$(['Error'], users.driver.username).pipe(
                    first((evt) => evt.t = 'Error'),
                    map(({ data }) => data),
                    tap(({ code, msg }) => expect(code).to.be.eq(23003)),
                ),
                appLinkBroker.sendServiceEventToServer$(businessId, eventType, 'BLABLABLA' + users.driver.jwt, users.driver.username, {
                    _id: serviceId,
                    timestamp: Date.now(),
                    location: { lat: 1234, lng: 5678 }
                })
            ).subscribe(...getRxDefaultSubscription('end service event with invalid jwt', done));
        });



        it('Send Shift location to uptade service', function (done) {
            this.timeout(500);
            const location = { lat: 6.164602, lng: -75.601532 };
            const eventType = 'ShiftLocationReported';
            const businessId = users.driver.businessId;
            const shiftId = users.driver.shift._id;

            return appLinkBroker.sendShiftEventToServer$(businessId, eventType, users.driver.jwt, users.driver.username, {
                _id: shiftId,
                timestamp: Date.now(),
                location
            }).subscribe(...getRxDefaultSubscription('Send Shift location to uptade service', done));
        });




        it('Service set ARRIVED', function (done) {
            this.timeout(2000);
            const newState = 'ARRIVED';
            const eventType = 'ServiceVehicleArrived';
            const businessId = users.driver.businessId;
            const serviceId = users.driver.service._id;
            buildChangeStateTest$(serviceId, eventType, newState, businessId, users.driver.jwt, users.driver.username)
                .subscribe(...getRxDefaultSubscription('Service ARRIVED', done));
        });

        it('Send event to non existing service', function (done) {
            this.timeout(2000);
            const eventType = 'ServiceCompleted';
            const businessId = users.driver.businessId;
            const serviceId = 'non-existing-id';

            return Rx.forkJoin(
                //wait for change confirmation
                appLinkBroker.listenErrorsEventsFromServer$(['Error'], users.driver.username).pipe(
                    first((evt) => evt.t = 'Error'),
                    map(({ data }) => data),
                    tap(({ code, msg }) => expect(code).to.be.eq(23223)),
                ),
                appLinkBroker.sendServiceEventToServer$(businessId, eventType, users.driver.jwt, users.driver.username, {
                    _id: serviceId,
                    timestamp: Date.now(),
                    location: { lat: 1234, lng: 5678 }
                })
            ).subscribe(...getRxDefaultSubscription('Send event to non existing service', done));
        });



        it('Send invalid state change', function (done) {
            this.timeout(2000);
            const eventType = 'ServiceCompleted';
            const businessId = users.driver.businessId;
            const serviceId = users.driver.service._id;

            return Rx.forkJoin(
                //wait for change confirmation
                appLinkBroker.listenErrorsEventsFromServer$(['Error'], users.driver.username).pipe(
                    first((evt) => evt.t = 'Error'),
                    map(({ data }) => data),
                    tap(({ code, msg }) => expect(code).to.be.eq(23230)),
                ),
                appLinkBroker.sendServiceEventToServer$(businessId, eventType, users.driver.jwt, users.driver.username, {
                    _id: serviceId,
                    timestamp: Date.now(),
                    location: { lat: 1234, lng: 5678 }
                })
            ).subscribe(...getRxDefaultSubscription('Send invalid state change', done));
        });

        it('Service set ServiceClientPickedUp', function (done) {
            this.timeout(2000);
            const newState = 'ON_BOARD';
            const eventType = 'ServiceClientPickedUp';
            const businessId = users.driver.businessId;
            const serviceId = users.driver.service._id;
            buildChangeStateTest$(serviceId, eventType, newState, businessId, users.driver.jwt, users.driver.username)
                .subscribe(...getRxDefaultSubscription('Service ServiceClientPickedUp', done));
        });

        it('Service set Completed', function (done) {
            this.timeout(2000);
            const newState = 'DONE';
            const eventType = 'ServiceCompleted';
            const businessId = users.driver.businessId;
            const serviceId = users.driver.service._id;
            buildChangeStateTest$(serviceId, eventType, newState, businessId, users.driver.jwt, users.driver.username)
                .subscribe(...getRxDefaultSubscription('Service ServiceClientPickedUp', done));
        });



        it('Query Service historial', function (done) {
            const year = new Date().getFullYear();
            const month = new Date().getMonth() + 1;
            Service.queryHistoricalService$(users.driver, { year, month, page: 0, count: 20 }).pipe(
                mergeMap(historicalServices => Rx.from(historicalServices)),
                tap(histService => console.log(`Found Hist Serv: ${histService._id}`)),
                filter(histService => histService._id === users.driver.service._id),
                first(),
                tap(({ _id, timestamp, pickUp, client }) => expect(_id).to.be.eq(users.driver.service._id)),
                tap(({ _id, timestamp, pickUp }) => expect(pickUp).to.exist),
                tap(({ _id, timestamp, pickUp }) => expect(pickUp.zone).to.not.be.empty),
                tap(({ _id, timestamp, pickUp }) => expect(pickUp.neighborhood).to.eq(users.driver.serviceOffer.pickUp.neighborhood)),
                tap(({ _id, timestamp, pickUp }) => expect(pickUp.city).to.eq(users.driver.serviceOffer.pickUp.city)),
                tap(({ _id, timestamp, pickUp }) => expect(pickUp.zone).to.eq(users.driver.serviceOffer.pickUp.zone)),
                tap(({ _id, timestamp, pickUp }) => expect(pickUp.marker).to.exist),
                tap(({ _id, timestamp, pickUp }) => expect(pickUp.marker.lat).to.exist),
                tap(({ _id, timestamp, pickUp }) => expect(pickUp.marker.lng).to.exist),
                tap(({ _id, timestamp, pickUp }) => expect(timestamp).to.exist),
            ).subscribe(...getRxDefaultSubscription('Service Service historial', done));
        });


    });





    describe('Sopping new SHIFT', function () {

        it('Stop Shift', function (done) {
            Shift.stopShift$(users.driver).pipe(
                first(({ accepted }) => accepted),
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















