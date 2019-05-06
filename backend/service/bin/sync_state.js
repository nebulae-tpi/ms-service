'use strict'

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

const mongoDB = require('./data/MongoDB').singleton();
const eventSourcing = require('./tools/EventSourcing')();
const eventStoreService = require('./services/event-store/EventStoreService')();

const DriverDA = require('./data/DriverDA');
const VehicleDA = require('./data/VehicleDA');
const ServiceDA = require('./domain/service/data-access/ServiceDA');
const ClientDA = require('./domain/client/data-access/ClientDA');
const shift = require('./domain/shift');
const Cronjob = require('./domain/cronjob');
const Wallet = require('./domain/cronjob');

const { concat, forkJoin } = require('rxjs');

const start = () => {
    concat(
        // initializing needed resources
        mongoDB.start$(),
        eventSourcing.eventStore.start$(),

        forkJoin(
            DriverDA.start$(),
            VehicleDA.start$(),
            ServiceDA.start$(),
            ClientDA.start$(),
            Wallet.start$,
            shift.start$,
            Cronjob.start$
        ),
        
        // // executing maintenance tasks
        eventStoreService.syncState$(),

        // stoping resources
        eventSourcing.eventStore.stop$(),
        eventStoreService.stop$(),
        mongoDB.stop$(),
    ).subscribe(
        (evt) => console.log(`service (syncing): ${(evt instanceof Object) ? JSON.stringify(evt) : evt}`),
        (error) => {
            console.error('Failed to sync state', error);
            process.exit(1);
        },
        () => {
            console.log('service state synced');
            process.exit(0);
        }
    );
}

start();



