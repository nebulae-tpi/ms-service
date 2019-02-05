'use strict'

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

const Rx = require('rxjs');
const eventSourcing = require('./tools/EventSourcing')();
const eventStoreService = require('./services/event-store/EventStoreService')();
const mongoDB = require('./data/MongoDB').singleton();
const graphQlService = require('./services/driver-gateway/GraphQlService')();
const shift = require('./domain/shift');
const driver = require('./domain/driver');
const vehicle = require('./domain/vehicle');

const start = () => {
    Rx.concat(
        eventSourcing.eventStore.start$(),
        eventStoreService.start$(),
        mongoDB.start$(),
        shift.start$,
        driver.start$,
        vehicle.start$,
        graphQlService.start$()
    ).subscribe(
        (evt) => {
            console.log(evt)
        },
        (error) => {
            console.error('Failed to start', error);
            process.exit(1);
        },
        () => console.log('Server started')
    );
};

start();



