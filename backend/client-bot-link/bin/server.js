'use strict'

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}



const { concat, forkJoin } = require('rxjs');
const { BotConversationDA, ClientDA, ServiceDA, DriverDA } = require('./domain/client-bot-link/data-access');
const eventSourcing = require('./tools/EventSourcing')();
const eventStoreService = require('./services/event-store/EventStoreService')();
const mongoDB = require('./data/MongoDB').singleton();
const graphQlService = require('./services/gateway/GraphQlService')();



const start = () => {
    concat(
        eventSourcing.eventStore.start$(),
        eventStoreService.start$(),
        mongoDB.start$(),     
        BotConversationDA.start$(),
        ClientDA.start$(), 
        ServiceDA.start$(),
        DriverDA.start$(),
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



