'use strict'

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}


const eventSourcing = require('./tools/EventSourcing')();
const eventStoreService = require('./services/event-store/EventStoreService')();
const mongoDB = require('./data/MongoDB').singleton();
const DriverDA = require('./data/DriverDA');
const VehicleDA = require('./data/VehicleDA');
const ClientDA = require('./domain/client/data-access/ClientDA');
const graphQlService = require('./services/emi-gateway/GraphQlService')();
const { concat, forkJoin } = require('rxjs');
const shift = require('./domain/shift');
const Cronjob = require('./domain/cronjob');
const Wallet = require('./domain/cronjob');
const Business = require("./domain/business");
const Service = require("./domain/service");




const start = () => {
    concat(
        eventSourcing.eventStore.start$(),
        eventStoreService.start$(),
        mongoDB.start$(),
        forkJoin(
            DriverDA.start$(),
            VehicleDA.start$(),
            ClientDA.start$(),
            Service.start$,
            Wallet.start$,
            shift.start$,
            Cronjob.start$,
            Business.start$
        ),        
        graphQlService.start$()
    ).subscribe(
        (evt) => {
            // console.log(evt)
        },
        (error) => {
            console.error('Failed to start', error);
            process.exit(1);
        },
        () => console.log('service started')        
    );
};



start();

