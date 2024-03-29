'use strict'

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

const eventSourcing = require('./tools/EventSourcing')();
const eventStoreService = require('./services/event-store/EventStoreService')();
const mongoDB = require('./data/MongoDB').singleton();
const graphQlService = require('./services/driver-gateway/GraphQlService')();
const { concat, forkJoin } = require('rxjs');
const driverAppLinkBroker = require('./services/driver-app-link/DriverAppLinkBroker')();
const shift = require('./domain/shift');
const service = require('./domain/service');
const business = require('./domain/business');
const DriverDA = require('./data/DriverDA');


const start = () => {
    concat(
        eventSourcing.eventStore.start$(),
        eventStoreService.start$(),
        mongoDB.start$(),
        forkJoin(
            driverAppLinkBroker.start$(),
            shift.start$,
            service.start$,
            business.start$,
            DriverDA.start$()
        ),        
        graphQlService.start$()
    ).subscribe(
        (evt) => console.log(evt),
        (error) => {
            console.error('Failed to start', error);
            process.exit(1);
        },
        () => console.log('Server started')
    );
};

start();
