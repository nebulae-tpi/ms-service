'use strict'

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

const mongoDB = require('./data/MongoDB').singleton();
const eventSourcing = require('./tools/EventSourcing')();
const eventStoreService = require('./services/event-store/EventStoreService')();
const { concat, forkJoin } = require('rxjs');
const shift = require('./domain/shift');
const service = require('./domain/service');

const start = () => {
    concat(
        // initializing needed resources
        mongoDB.start$(),
        eventSourcing.eventStore.start$(),

        // forkJoin(
        //     shift.start$,
        //     service.start$
        // ),
        
        // // executing maintenance tasks
        // eventStoreService.syncState$(),

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



