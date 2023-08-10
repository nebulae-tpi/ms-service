'use strict'


const { of, timer, forkJoin, Observable, iif, from, empty } = require("rxjs");
const { toArray, mergeMap, map, tap, filter, delay, mapTo, switchMap } = require('rxjs/operators');
const dateFormat = require('dateformat');
const uuidv4 = require("uuid/v4");

const broker = require("../../tools/broker/BrokerFactory")();
const Crosscutting = require('../../tools/Crosscutting');
const DriverDA = require('../../data/DriverDA');
const { Event } = require("@nebulae/event-store");
const eventSourcing = require("../../tools/EventSourcing")();
const driverAppLinkBroker = require("../../services/driver-app-link/DriverAppLinkBroker")();

const BUSINESS_UNIT_IDS_WITH_SIMULTANEOUS_OFFERS = (process.env.BUSINESS_UNIT_IDS_WITH_SIMULTANEOUS_OFFERS || "").split(',');

const { ServiceDA, ShiftDA, ClientDA, BusinessDA } = require('./data-access')

/**
 * Singleton instance
 */
let instance;

class ServiceES {

    constructor() {
    }

    /**
     * Handles EventSourcing Event ServiceRequested.
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceRequested$({ aid, data }) {
        //console.log(`ServiceES: handleServiceRequested: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        const localDate = new Date(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
        const localHour = localDate.getHours();
        const extendedDistanceHours = ((data.offer || {}).offerExtendedDistanceHours || (process.env.SERVICE_OFFER_EXTENDED_DISTANCE_HOURS || "22_23_0_1_2_3_4")).split('_').map(h => parseInt(h));
        let maxDistance = data.client.offerMaxDistance || parseInt((data.offer || {}).offerMaxDistance || process.env.SERVICE_OFFER_MAX_DISTANCE);
        if (extendedDistanceHours.includes(localHour)) {
            let extendedDistance = parseInt((data.offer || {}).offerExtendedDistance || (process.env.SERVICE_OFFER_EXTENDED_DISTANCE || "1500"));
            if (extendedDistance && extendedDistance > maxDistance) {
                maxDistance = extendedDistance;
            }
        }
        const SERVICE_OFFER_MAX_DISTANCE_MIN = parseInt((data.offer || {}).offerMaxDistanceMin || process.env.SERVICE_OFFER_MAX_DISTANCE_MIN);
        maxDistance = (maxDistance < SERVICE_OFFER_MAX_DISTANCE_MIN) ? SERVICE_OFFER_MAX_DISTANCE_MIN : maxDistance;

        //TODO: esto es una solucion temporal para la modificacion masiva de la distancia de oferta parta los satelites
        //ESTO SOBRESCRIBE LA DISTANCA CONFIGURADA EN EL SATELITE
        if (data.client.tipClientId) {
            maxDistance = parseInt(maxDistance || process.env.SERVICE_SATELLITE_OFFER_MAX_DISTANCE);
        }

        const minDistance = data.client.offerMinDistance || parseInt((data.offer || {}).offerMinDistance || process.env.SERVICE_OFFER_MIN_DISTANCE);
        const serviceId = aid;
        const referrerDriverDocumentId = data.client.referrerDriverDocumentId;
        const referrerDriverDocumentIds = data.client.referrerDriverDocumentIds;

        return Observable.create(obs => {
            if ((data.offer || {}).offerBeta === "2") {
                this.imperativeServiceOfferAlgorithmBeta1$(serviceId, minDistance, maxDistance, referrerDriverDocumentId, data.offer).subscribe(
                    (evt) => {
                        //console.log(`${dateFormat(new Date(), "isoDateTime")} imperativeServiceOfferAlgorithm(serviceId=${serviceId}) EVT: ${evt}`);
                    },
                    (error) => console.error(`${dateFormat(new Date(), "isoDateTime")} imperativeServiceOfferAlgorithm(serviceId=${serviceId}) ERROR: ${error}`),
                    () => {
                        //console.error(`${dateFormat(new Date(), "isoDateTime")} imperativeServiceOfferAlgorithm(serviceId=${serviceId}) COMPL: COMPLETED\n`);
                    },
                );
            }
            else if ((data.offer || {}).offerBeta) {
                this.imperativeServiceOfferAlgorithmBeta$(serviceId, minDistance, maxDistance, referrerDriverDocumentId, data.offer).subscribe(
                    (evt) => {
                        //console.log(`${dateFormat(new Date(), "isoDateTime")} imperativeServiceOfferAlgorithm(serviceId=${serviceId}) EVT: ${evt}`);
                    },
                    (error) => console.error(`${dateFormat(new Date(), "isoDateTime")} imperativeServiceOfferAlgorithm(serviceId=${serviceId}) ERROR: ${error}`),
                    () => {
                        //console.error(`${dateFormat(new Date(), "isoDateTime")} imperativeServiceOfferAlgorithm(serviceId=${serviceId}) COMPL: COMPLETED\n`);
                    },
                );
            }
            else {
                this.imperativeServiceOfferAlgorithm$(serviceId, minDistance, maxDistance, referrerDriverDocumentId, data.offer, referrerDriverDocumentIds).subscribe(
                    (evt) => {
                        //console.log(`${dateFormat(new Date(), "isoDateTime")} imperativeServiceOfferAlgorithm(serviceId=${serviceId}) EVT: ${evt}`);
                    },
                    (error) => console.error(`${dateFormat(new Date(), "isoDateTime")} imperativeServiceOfferAlgorithm(serviceId=${serviceId}) ERROR: ${error}`),
                    () => {
                        //console.error(`${dateFormat(new Date(), "isoDateTime")} imperativeServiceOfferAlgorithm(serviceId=${serviceId}) COMPL: COMPLETED\n`);
                    },
                );
            }
            obs.next(`ServiceES: handleServiceRequested: created subscription for imperativeServiceOfferAlgorithm(serviceId=${serviceId})`);
            obs.complete;
        });
    }

    imperativeServiceOfferAlgorithm$(serviceId, minDistance, maxDistance, referrerDriverDocumentId, offer) {
        return Observable.create(async obs => {

            // precalculated offer params
            const offerTotalSpan = parseInt((offer || {}).offerServiceOfferTotalSpan || process.env.SERVICE_OFFER_TOTAL_SPAN);
            const offerSearchSpan = parseInt((offer || {}).offerServiceOfferSearchSpan || process.env.SERVICE_OFFER_SEARCH_SPAN);
            const offerShiftSpan = parseInt((offer || {}).offerServiceOfferShiftSpan || process.env.SERVICE_OFFER_SHIFT_SPAN);
            const offerTotalThreshold = offerTotalSpan + Date.now();
            obs.next(`input params: ${JSON.stringify({ minDistance, maxDistance, offerTotalSpan, offerSearchSpan, offerShiftSpan, offerTotalThreshold, referrerDriverDocumentId })}`);

            //console.log('imperativeServiceOfferAlgorithm: inpu:',JSON.stringify({ minDistance, maxDistance, offerTotalSpan, offerSearchSpan, offerShiftSpan, offerTotalThreshold, referrerDriverDocumentId }));

            let service = await this.findServiceAndSetOfferParams(serviceId, minDistance, maxDistance, offerTotalSpan, offerSearchSpan, offerShiftSpan, obs);
            //console.log('imperativeServiceOfferAlgorithm: service: ',JSON.stringify(service));

            let needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
            let needToBeCancelledBySystem = true;
            const previouslySelectedShifts = [];

            // console.log('imperativeServiceOfferAlgorithm: needToOffer: ',needToOffer);
            while (needToOffer) {

                //find available shifts
                let shifts = await this.findShiftCandidates(service, obs);

                // threshold defining the total time span of this offer
                const offerSearchThreshold = offerSearchSpan + Date.now();
                //TODO: ELIMINAR COD SOLO PARA PRUEBAS ===============
                // const serviceOffer = {
                //     _id: service._id,
                //     timestamp: Date.now(),
                //     tip: service.tip,
                //     pickUp: { ...service.pickUp, location: undefined },
                //     dropOff: { ...service.dropOff, location: undefined },
                //     dropOffSpecialType: service.dropOffSpecialType,
                //     expirationTime: offerTotalThreshold,
                //     tripCost: service.tripCost
                // };
                // await driverAppLinkBroker.sendServiceEventToDrivers$("test", "test", 'ServiceOffered', serviceOffer).toPromise();
                if (shifts.length > 0) {
                    // offers this service while the service is in REQUESTED state and have not exceed the offerSearchThreshold
                    for (let i = 0, len = shifts.length; needToOffer && Date.now() < offerSearchThreshold && i < len; i++) {
                        //selected shift
                        const shift = shifts[i];
                        // console.log('INICIA OFERTA =======> ', JSON.stringify(shift));
                        await this.offerServiceToShift(service, shift, offerTotalThreshold, previouslySelectedShifts, obs);
                        previouslySelectedShifts.push(shift);

                        //re-eval service state\/
                        if (!BUSINESS_UNIT_IDS_WITH_SIMULTANEOUS_OFFERS.includes(shift.businessId)) {
                            await timer(offerShiftSpan).toPromise();
                        }
                        service = await ServiceDA.updateOfferParamsAndfindById$(serviceId, undefined, { "offer.offerCount": 1 }).toPromise();
                        obs.next(`queried Service: ${JSON.stringify({ state: service.state, minDistance: service.offer.params.minDistance })}`);
                        needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
                        needToBeCancelledBySystem = service.state === 'REQUESTED';
                    }
                } else {
                    if (service.offer.params.minDistance !== 0) {
                        obs.next(`no shifts found on searched area, will remove minDistance on next search`);
                        service = await ServiceDA.updateOfferParamsAndfindById$(serviceId, { "offer.params.minDistance": 0 }, { "offer.searchCount": 1 }).toPromise();
                        obs.next(`queried Service: ${JSON.stringify({ state: service.state, minDistance: service.offer.params.minDistance })}`);
                        needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
                        needToBeCancelledBySystem = service.state === 'REQUESTED';
                    } else {
                        //re-eval service state
                        await timer(offerShiftSpan).toPromise();
                        service = await ServiceDA.updateOfferParamsAndfindById$(serviceId, undefined, { "offer.searchCount": 1 }).toPromise();
                        obs.next(`queried Service: ${JSON.stringify({ state: service.state, minDistance: service.offer.params.minDistance })}`);
                        needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
                        needToBeCancelledBySystem = service.state === 'REQUESTED';
                    }
                    await eventSourcing.eventStore.emitEvent$(
                        ServiceES.buildEventSourcingEvent(
                            'Service',
                            serviceId,
                            'ServiceOfferUpdated',
                            {
                                offer: { ...service.offer, shifts: undefined }
                            },
                            'SYSTEM', 1, true
                        )
                    ).toPromise();
                }

            }
            if (needToBeCancelledBySystem) {
                await eventSourcing.eventStore.emitEvent$(
                    ServiceES.buildEventSourcingEvent(
                        'Service',
                        serviceId,
                        'ServiceCancelledBySystem',
                        { reason: 'DRIVERS_NOT_AVAILABLE', notes: "" },
                        'SYSTEM'
                    )
                ).toPromise();
            }
            obs.complete();
        });

    }

    imperativeServiceOfferAlgorithmBeta1$(serviceId, minDistance, maxDistance, referrerDriverDocumentId, offer) {
        return Observable.create(async obs => {
            // precalculated offer params
            const offerTotalSpan = parseInt((offer || {}).offerServiceOfferTotalSpan || process.env.SERVICE_OFFER_TOTAL_SPAN);
            const offerSearchSpan = parseInt((offer || {}).offerServiceOfferSearchSpan || process.env.SERVICE_OFFER_SEARCH_SPAN);
            const offerShiftSpan = parseInt((offer || {}).offerServiceOfferShiftSpan || process.env.SERVICE_OFFER_SHIFT_SPAN);
            const offerTotalThreshold = offerTotalSpan + Date.now();
            const simultaneousOffers = parseInt((offer || {}).offerSimultaneousOffers || 1);
            obs.next(`input params: ${JSON.stringify({ minDistance, maxDistance, offerTotalSpan, offerSearchSpan, offerShiftSpan, offerTotalThreshold, referrerDriverDocumentId, simultaneousOffers })}`);

            console.log(`input params: ${JSON.stringify({ minDistance, maxDistance, offerTotalSpan, offerSearchSpan, offerShiftSpan, offerTotalThreshold, referrerDriverDocumentId, simultaneousOffers })}`);

            let service = await this.findServiceAndSetOfferParams(serviceId, minDistance, maxDistance, offerTotalSpan, offerSearchSpan, offerShiftSpan, obs, simultaneousOffers);
            //console.log('imperativeServiceOfferAlgorithm: service: ',JSON.stringify(service));

            let needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
            let needToBeCancelledBySystem = true;
            const previouslySelectedShifts = [];

            // console.log('imperativeServiceOfferAlgorithm: needToOffer: ',needToOffer);
            while (needToOffer) {
                if (previouslySelectedShifts.length > 0) {
                    await this.resendOfferServiceToShifts(service, offerTotalThreshold, previouslySelectedShifts, obs);
                }
                //find available shifts
                let shifts = await this.findShiftCandidates(service, obs, simultaneousOffers);

                // threshold defining the total time span of this offer
                const offerSearchThreshold = offerSearchSpan + Date.now();
                //TODO: ELIMINAR COD SOLO PARA PRUEBAS ===============
                // const serviceOffer = {
                //     _id: service._id,
                //     timestamp: Date.now(),
                //     tip: service.tip,
                //     pickUp: { ...service.pickUp, location: undefined },
                //     dropOff: { ...service.dropOff, location: undefined },
                //     dropOffSpecialType: service.dropOffSpecialType,
                //     expirationTime: offerTotalThreshold,
                //     tripCost: service.tripCost
                // };
                // await driverAppLinkBroker.sendServiceEventToDrivers$("test", "test", 'ServiceOffered', serviceOffer).toPromise();
                if (shifts.length > 0) {
                    // offers this service while the service is in REQUESTED state and have not exceed the offerSearchThreshold
                    let simultaneousSendCount = 0;
                    for (let i = 0, len = shifts.length; needToOffer && Date.now() < offerSearchThreshold && i < len; i++) {
                        //selected shift
                        const shift = shifts[i];
                        await this.offerServiceToShift(service, shift, offerTotalThreshold, previouslySelectedShifts, obs, false);
                        previouslySelectedShifts.push(shift);
                        simultaneousSendCount++;
                        //console.log("LOCAL COUNT => ", simultaneousSendCount);
                        if (simultaneousSendCount >= simultaneousOffers) {

                            await timer(offerShiftSpan).toPromise();
                            simultaneousSendCount = 0;
                            //await this.resendOfferServiceToShifts(service, offerTotalThreshold, previouslySelectedShifts, obs);
                        }
                        //re-eval service state\/
                        //console.log("TS PRE UPDATE SERVICE ===> ", Date.now());
                        service = await ServiceDA.updateOfferParamsAndfindById$(serviceId, undefined, { "offer.offerCount": 1 }).toPromise();
                        //console.log("TS POST UPDATE SERVICE ===> ", Date.now());
                        obs.next(`queried Service: ${JSON.stringify({ state: service.state, minDistance: service.offer.params.minDistance })}`);
                        needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
                        needToBeCancelledBySystem = service.state === 'REQUESTED';
                    }
                } else {
                    if (service.offer.params.minDistance !== 0) {
                        obs.next(`no shifts found on searched area, will remove minDistance on next search`);
                        service = await ServiceDA.updateOfferParamsAndfindById$(serviceId, { "offer.params.minDistance": 0 }, { "offer.searchCount": 1 }).toPromise();
                        obs.next(`queried Service: ${JSON.stringify({ state: service.state, minDistance: service.offer.params.minDistance })}`);
                        needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
                        needToBeCancelledBySystem = service.state === 'REQUESTED';
                    } else {
                        //re-eval service state
                        await timer(offerShiftSpan).toPromise();
                        service = await ServiceDA.updateOfferParamsAndfindById$(serviceId, undefined, { "offer.searchCount": 1 }).toPromise();
                        obs.next(`queried Service: ${JSON.stringify({ state: service.state, minDistance: service.offer.params.minDistance })}`);
                        needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
                        needToBeCancelledBySystem = service.state === 'REQUESTED';
                    }
                    await eventSourcing.eventStore.emitEvent$(
                        ServiceES.buildEventSourcingEvent(
                            'Service',
                            serviceId,
                            'ServiceOfferUpdated',
                            {
                                offer: { ...service.offer, shifts: undefined }
                            },
                            'SYSTEM', 1, true
                        )
                    ).toPromise();
                }

            }
            if (needToBeCancelledBySystem) {
                await eventSourcing.eventStore.emitEvent$(
                    ServiceES.buildEventSourcingEvent(
                        'Service',
                        serviceId,
                        'ServiceCancelledBySystem',
                        { reason: 'DRIVERS_NOT_AVAILABLE', notes: "" },
                        'SYSTEM'
                    )
                ).toPromise();
            }
            obs.complete();
        });

    }

    imperativeServiceOfferAlgorithmBeta$(serviceId, minDistance, maxDistance, referrerDriverDocumentId, offer) {
        return Observable.create(async obs => {
            // precalculated offer params
            const offerTotalSpan = parseInt((offer || {}).offerServiceOfferTotalSpan || process.env.SERVICE_OFFER_TOTAL_SPAN);
            const offerSearchSpan = parseInt((offer || {}).offerServiceOfferSearchSpan || process.env.SERVICE_OFFER_SEARCH_SPAN);
            const offerShiftSpan = parseInt((offer || {}).offerServiceOfferShiftSpan || process.env.SERVICE_OFFER_SHIFT_SPAN);
            const offerTotalThreshold = offerTotalSpan + Date.now();
            const simultaneousOffers = parseInt((offer || {}).offerSimultaneousOffers || 1);
            obs.next(`input params: ${JSON.stringify({ minDistance, maxDistance, offerTotalSpan, offerSearchSpan, offerShiftSpan, offerTotalThreshold, referrerDriverDocumentId, simultaneousOffers })}`);


            let service = await this.findServiceAndSetOfferParams(serviceId, minDistance, maxDistance, offerTotalSpan, offerSearchSpan, offerShiftSpan, obs, simultaneousOffers);

            let needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
            let needToBeCancelledBySystem = true;
            const previouslySelectedShifts = [];

            while (needToOffer) {

                //find available shifts
                let shifts = await this.findShiftCandidates(service, obs, simultaneousOffers);

                // threshold defining the total time span of this offer
                const offerSearchThreshold = offerSearchSpan + Date.now();
                //TODO: ELIMINAR COD SOLO PARA PRUEBAS ===============
                // const serviceOffer = {
                //     _id: service._id,
                //     timestamp: Date.now(),
                //     tip: service.tip,
                //     pickUp: { ...service.pickUp, location: undefined },
                //     dropOff: { ...service.dropOff, location: undefined },
                //     dropOffSpecialType: service.dropOffSpecialType,
                //     expirationTime: offerTotalThreshold,
                //     tripCost: service.tripCost
                // };
                // await driverAppLinkBroker.sendServiceEventToDrivers$("test", "test", 'ServiceOffered', serviceOffer).toPromise();
                if (shifts.length > 0) {
                    // offers this service while the service is in REQUESTED state and have not exceed the offerSearchThreshold
                    let simultaneousSendCount = 0;
                    for (let i = 0, len = shifts.length; needToOffer && Date.now() < offerSearchThreshold && i < len; i++) {
                        //selected shift
                        const shift = shifts[i];
                        // console.log('INICIA OFERTA =======> ', JSON.stringify(shift));
                        await this.offerServiceToShift(service, shift, offerTotalThreshold, previouslySelectedShifts, obs);
                        previouslySelectedShifts.push(shift);
                        simultaneousSendCount++;
                        //console.log("LOCAL COUNT => ", simultaneousSendCount);
                        if (simultaneousSendCount >= simultaneousOffers) {
                            await timer(offerShiftSpan).toPromise();
                            simultaneousSendCount = 0;
                        }
                        //re-eval service state\/
                        service = await ServiceDA.updateOfferParamsAndfindById$(serviceId, undefined, { "offer.offerCount": 1 }).toPromise();
                        obs.next(`queried Service: ${JSON.stringify({ state: service.state, minDistance: service.offer.params.minDistance })}`);
                        needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
                        needToBeCancelledBySystem = service.state === 'REQUESTED';
                    }
                } else {
                    if (service.offer.params.minDistance !== 0) {
                        obs.next(`no shifts found on searched area, will remove minDistance on next search`);
                        service = await ServiceDA.updateOfferParamsAndfindById$(serviceId, { "offer.params.minDistance": 0 }, { "offer.searchCount": 1 }).toPromise();
                        obs.next(`queried Service: ${JSON.stringify({ state: service.state, minDistance: service.offer.params.minDistance })}`);
                        needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
                        needToBeCancelledBySystem = service.state === 'REQUESTED';
                    } else {
                        //re-eval service state
                        await timer(offerShiftSpan).toPromise();
                        service = await ServiceDA.updateOfferParamsAndfindById$(serviceId, undefined, { "offer.searchCount": 1 }).toPromise();
                        obs.next(`queried Service: ${JSON.stringify({ state: service.state, minDistance: service.offer.params.minDistance })}`);
                        needToOffer = service.state === 'REQUESTED' && Date.now() < offerTotalThreshold;
                        needToBeCancelledBySystem = service.state === 'REQUESTED';
                    }
                    await eventSourcing.eventStore.emitEvent$(
                        ServiceES.buildEventSourcingEvent(
                            'Service',
                            serviceId,
                            'ServiceOfferUpdated',
                            {
                                offer: { ...service.offer, shifts: undefined }
                            },
                            'SYSTEM', 1, true
                        )
                    ).toPromise();
                }

            }
            if (needToBeCancelledBySystem) {
                await eventSourcing.eventStore.emitEvent$(
                    ServiceES.buildEventSourcingEvent(
                        'Service',
                        serviceId,
                        'ServiceCancelledBySystem',
                        { reason: 'DRIVERS_NOT_AVAILABLE', notes: "" },
                        'SYSTEM'
                    )
                ).toPromise();
            }
            obs.complete();
        });

    }

    /**
     * query a service in the DB waiting up to 1 second to appear.  then configure the offer params
     * @param {string} serviceId 
     * @param {*} minDistance 
     * @param {*} maxDistance 
     * @param {*} offerTotalSpan 
     * @param {*} offerSearchSpan 
     * @param {*} offerShiftSpan 
     * @returns Service after the update
     */
    async findServiceAndSetOfferParams(serviceId, minDistance, maxDistance, offerTotalSpan, offerSearchSpan, offerShiftSpan, obs, simultaneousOffers) {
        undefined;
        let service = undefined;
        let retries = 0;
        while (!service && retries < 5) {
            retries++;
            await timer(500).toPromise();// time for the service to be persisted 
            service = await ServiceDA.updateOfferParamsAndfindById$(
                serviceId,
                {
                    offer: {
                        searchCount: 0,
                        shifts: {},
                        params: { minDistance, maxDistance, offerTotalSpan, offerSearchSpan, offerShiftSpan, simultaneousOffers }
                    }
                }).toPromise();
        }
        if (!service) {
            throw new Error(`Service not found when trying to offer at imperativeServiceOfferAlgorithm; serviceId=${serviceId}; retries=${retries}`);
        }
        obs.next(`queried Service: ${JSON.stringify({ state: service.state, minDistance: service.offer.params.minDistance })}`);
        return service;
    }

    /**
     * query all avialble shifts within the offer radius
     * - avoiding current candidates 
     * - filtering by wallet balance if neccesary 
     * - filtering by distance 
     * - prioritazing referred driver
     * @param {*} service 
     * @returns shifts array
     */
    async findShiftCandidates(service, obs, limit) {
        //find available shifts
        let shifts = await ShiftDA.findServiceOfferCandidates$(
            service.businessId,
            service.pickUp.marker || service.pickUp.polygon,
            service.requestedFeatures,
            Object.keys(service.offer.shifts),
            service.offer.params.maxDistance,
            0,//min distance form mongo is always zero
            { "driver": 1, "vehicle": 1 },
            limit
        ).toPromise();

        let currentClient = await ClientDA.getClient$(service.client.id).toPromise();
        let currentBusiness = await BusinessDA.getBusiness$(service.businessId).toPromise();
        

        //ignores shifts that were already taken into account
        shifts = shifts.filter(s => !Object.keys(service.offer.shifts).includes(s._id));
        // filter shifts who its drivers have't required money to get the service offer.
        // tip for client and PayPerService are evaluated 
        shifts = shifts.filter(shift => {

            const tipType = service.client.tipType; // === "VIRTUAL_WALLET"
            const driverMainPocketAmount = ((shift.driver.wallet || {}).pockets || {}).main || 0;
            const minWalletOfferValue = parseInt((currentBusiness.attributes.find(a => a.key === "minWalletOfferValue") || {}).value || "0");
            const clientTip = (tipType === "VIRTUAL_WALLET")
                ? Math.max((service.client.tip || 0), minWalletOfferValue) : 0;

            const payPerServicePrice = (shift.subscriptionType == "PAY_PER_SERVICE")
                ? shift.payPerServicePrice || 0 : 0;

            // console.log({ driverMainPocketAmount, clientTip, payPerServicePrice });

            if (((service || {}).request || {}).sourceChannel === "APP_CLIENT") {

                return driverMainPocketAmount >= (clientTip + parseInt(process.env.APP_DRIVER_AGREEMENT) + payPerServicePrice);
            } else {
                return (clientTip + payPerServicePrice) > 0 ? driverMainPocketAmount >= (clientTip + payPerServicePrice) : true;
            }


        });

        obs.next(`raw shift candidates: ${JSON.stringify(shifts.map(s => ({ driver: s.driver.username, distance: s.dist.calculated, documentId: s.driver.documentId })))} `);

        // if the service has a referred driver and that driver is within the candidates, then that shift must be the first (high priority) 
        if (currentClient && (((currentClient || {}).satelliteInfo || {}).referrerDriverDocumentIds || ((currentClient || {}).satelliteInfo || {}).referrerDriverDocumentId)) {
            const priorityShift = shifts.filter(sh => (sh.driver.documentId === currentClient.satelliteInfo.referrerDriverDocumentId) || (currentClient.satelliteInfo.referrerDriverDocumentIds || []).includes(sh.driver.documentId));
            if (priorityShift) {
                shifts = shifts.filter(s => !priorityShift.some(p => p.driver.documentId === s.driver.documentId));
                for (let prioIndex = 0; prioIndex < priorityShift.length; prioIndex++) {
                    const element = priorityShift[prioIndex];
                    shifts.unshift({ ...element, referred: true });
                    obs.next(`referred found between candidates: ${JSON.stringify({ driver: element.driver.username, distance: element.dist.calculated, documentId: element.driver.documentId })} `);
                }


            }
        }
        // filter all the trips that are closer than the minDistance threshold
        shifts = shifts.filter(s => {
            return s.referred || (s.dist.calculated > service.offer.params.minDistance)
        });
        obs.next(`filterd shift candidates: ${JSON.stringify(shifts.map(s => ({ driver: s.driver.username, distance: s.dist.calculated, documentId: s.driver.documentId })))} `);
        return shifts;
    }

    async resendOfferServiceToShifts(service, offerTotalThreshold, previouslySelectedShifts = [], obs) {
        const businessId = service.businessId;
        const serviceOffer = {
            _id: service._id,
            timestamp: Date.now(),
            tip: service.tip,
            pickUp: { ...service.pickUp, location: undefined },
            dropOff: { ...service.dropOff, location: undefined },
            dropOffSpecialType: service.dropOffSpecialType,
            expirationTime: offerTotalThreshold,
            tripCost: service.tripCost
        };
        if (serviceOffer.pickUp.neighborhood && BUSINESS_UNIT_IDS_WITH_SIMULTANEOUS_OFFERS.includes(businessId)) {
            serviceOffer.pickUp.addressLine1 = '---';
            serviceOffer.pickUp.addressLine2 = '';
            console.log("BUSINESS_UNIT_IDS_WITH_SIMULTANEOUS_OFFERS: ", JSON.stringify(serviceOffer, null, 1));
        }
        const driverUsernamesToNotify = previouslySelectedShifts.map(s => s.driver.username)
        for (let i = 0; i < driverUsernamesToNotify.length; i++) {
            const driverUsername = driverUsernamesToNotify[i];
            const init = Date.now();
            await driverAppLinkBroker.sendServiceEventToDrivers$(businessId, driverUsername, 'ServiceOffered', serviceOffer).toPromise();
            obs.next(`sendServiceEventToDrivers$(businessId, ${driverUsername}, 'ServiceOffered', serviceOffer) = ${Date.now() - init}`);
        }
    }

    /**
     * executes the whole offer workflow
     * . persist the shift into the offer
     * . send the offer to the driver
     * . sends the event-sourcing offer event
     * @param {*} service 
     * @param {*} shift 
     * @param {*} obs 
     */
    async offerServiceToShift(service, shift, offerTotalThreshold, previouslySelectedShifts = [], obs, resendToAll = true) {
        const businessId = shift.businessId;
        obs.next(`offering to shift: ${JSON.stringify({ driver: shift.driver.username, distance: shift.dist.calculated, documentId: shift.driver.documentId })}`);
        //appends the shift into the service 
        await ServiceDA.addShiftToActiveOffers$(service._id, shift._id, shift.dist.calculated, shift.referred === true, shift.driver.id, shift.driver.username, shift.vehicle.licensePlate).toPromise();
        const serviceOffer = {
            _id: service._id,
            timestamp: Date.now(),
            tip: service.tip,
            pickUp: { ...service.pickUp, location: undefined },
            dropOff: { ...service.dropOff, location: undefined },
            dropOffSpecialType: service.dropOffSpecialType,
            expirationTime: offerTotalThreshold,
            tripCost: service.tripCost,
            destinationCost: service.destinationCost,
            productCost: service.productCost
        };

        if (serviceOffer.pickUp.neighborhood && BUSINESS_UNIT_IDS_WITH_SIMULTANEOUS_OFFERS.includes(businessId)) {
            serviceOffer.pickUp.addressLine1 = '---';
            serviceOffer.pickUp.addressLine2 = '';
            console.log("BUSINESS_UNIT_IDS_WITH_SIMULTANEOUS_OFFERS: ", JSON.stringify(serviceOffer, null, 1));
        }

        // THIS FLAG DEFINES IF THE OFFER WILL ONLY BE SENT TO THE SELECTED SHIFT .... OR ... WILL BE SENT TO ALL PREVIOSLY SELECTED SHIFTS
        // send the offer to every  shift        
        const driverUsernamesToNotify = resendToAll
            ? [shift.driver.username, ...previouslySelectedShifts.map(s => s.driver.username)]
            : [shift.driver.username];
        const initFor = Date.now();
        for (let i = 0; i < driverUsernamesToNotify.length; i++) {
            const driverUsername = driverUsernamesToNotify[i];
            const init = Date.now();
            await driverAppLinkBroker.sendServiceEventToDrivers$(businessId, driverUsername, 'ServiceOffered', serviceOffer).toPromise();
            obs.next(`sendServiceEventToDrivers$(businessId, ${driverUsername}, 'ServiceOffered', serviceOffer) = ${Date.now() - init}`);
        }

        const initEventTime = Date.now();
        // sends the Event-sourcing offer Event 
        eventSourcing.eventStore.emitEvent$(
            ServiceES.buildEventSourcingEvent(
                'Service',
                service._id,
                'ServiceOfferedToShift',
                {
                    distance: shift.dist.calculated,
                    username: shift.driver.username,
                    documentId: shift.driver.documentId,
                    licensePlate: shift.vehicle.licensePlate,
                },
                'SYSTEM', 1, true
            )
        ).subscribe(res => { },
            error => {
                console.error(`${dateFormat(new Date(), "isoDateTime")} offerServiceToShift ERROR: ${error}`)
            },
            () => { });
        if (businessId === "165e291d-5135-4674-aa25-a157933b2784") {
            console.log("TOTAL TIME EVENT ====> ", (Date.now() - initEventTime));
        }
    }

    /**
     * Handles EventSourcing Event ServiceAssigned
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceAssigned$({ aid, av, data, timestamp }) {
        //console.log(`ServiceES: handleServiceAssigned: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({})
            .pipe(
                delay(300),
                mergeMap(() => ServiceDA.findById$(aid,
                    {
                        "timestamp": 1, "requestedFeatures": 1, "pickUp": 1, "dropOff": 1, "tripCost": 1,
                        "verificationCode": 1, "fareDiscount": 1, "fare": 1, "state": 1, "tip": 1, "client": 1,
                        "driver": 1, "businessId": 1, "shiftId": 1, "request": 1
                    })
                ),
                mergeMap(dbService => forkJoin(
                    of(dbService),
                    this.payClientAgreement$(dbService, timestamp, aid, av),
                    //this.payPlatformClientAgreement$(dbService, timestamp),
                    this.payAppClientAgreement$(dbService, timestamp, aid, av),
                    this.generatePayPerServiceTransaction$(dbService, timestamp, aid, av)
                )),
                map(([dbService, a]) =>
                (
                    {
                        dbService,
                        formattedService: {
                            ...dbService,
                            pickUp: this.formatPickUpDropOff(dbService.pickUp),
                            dropOff: this.formatPickUpDropOff(dbService.dropOff),
                            state: 'ASSIGNED' // the state might not be persisted yet
                        }
                    }
                )
                ),
                mergeMap(({ dbService, formattedService }) => {
                    return forkJoin(
                        //Send ServiceAssigned to the winner
                        driverAppLinkBroker.sendServiceEventToDrivers$(
                            dbService.businessId, dbService.driver.username, 'ServiceAssigned', formattedService),
                        //Send ServiceOfferWithdraw to the losers
                        driverAppLinkBroker.sendServiceEventToDrivers$(
                            dbService.businessId, 'all', 'ServiceOfferWithdraw', { _id: formattedService._id }),
                    );
                }),

            );
    }

    payPlatformClientAgreement$({ businessId, client, driver, request }, timestamp) {
        return of({}).pipe(
            map(() => {
                if ((request || {}).sourceChannel !== "OPERATOR" || businessId === "b19c067e-57b4-468f-b970-d0101a31cacb") {
                    return undefined;
                } else if (!client.id || client.id === null) {
                    return {
                        _id: Crosscutting.generateDateBasedUuid(),
                        businessId,
                        type: "MOVEMENT",
                        // notes: mba.notes,
                        concept: "APP_DRIVER_AGREEMENT_PAYMENT",
                        timestamp: timestamp || Date.now(),
                        amount: parseInt(process.env.APP_DRIVER_AGREEMENT),
                        fromId: driver.id,
                        toId: businessId
                    };
                }
            }
            ),
            //   tap(tx => console.log("TRANSACTION ==> ", {tx})),
            mergeMap(tx => !tx ? of({}) : eventSourcing.eventStore.emitEvent$(
                new Event({
                    eventType: "WalletTransactionCommited",
                    eventTypeVersion: 1,
                    aggregateType: "Wallet",
                    aggregateId: driver.id,
                    data: tx,
                    user: "SYSTEM"
                })
            )
            )
        );
    }


    payAppClientAgreement$({ businessId, client, driver, request }, timestamp, aid, av) {
        return of({}).pipe(
            mergeMap(() => {
                if ((request || {}).sourceChannel !== "APP_CLIENT") {
                    return of(undefined);
                } else if (client.referrerDriverCode && client.referrerDriverCode !== null) {
                    return DriverDA.getDriverByDriverCode$(parseInt(client.referrerDriverCode)).pipe(
                        map(referrerDriver => {
                            return {
                                _id: Crosscutting.generateDateBasedUuid(),
                                sourceEvent: { aid, av },
                                businessId,
                                type: "MOVEMENT",
                                // notes: mba.notes,
                                concept: "APP_DRIVER_AGREEMENT_PAYMENT",
                                timestamp: timestamp || Date.now(),
                                amount: parseInt(process.env.APP_DRIVER_AGREEMENT),
                                fromId: driver.id,
                                toId: businessId,
                                clientId: client.id,
                                referrerDriverId: (referrerDriver || {})._id
                            };
                        })
                    );
                } else {
                    return of({
                        _id: Crosscutting.generateDateBasedUuid(),
                        businessId,
                        type: "MOVEMENT",
                        // notes: mba.notes,
                        concept: "APP_DRIVER_AGREEMENT_PAYMENT",
                        timestamp: timestamp || Date.now(),
                        amount: parseInt(process.env.APP_DRIVER_AGREEMENT),
                        fromId: driver.id,
                        toId: businessId,
                        clientId: client.id
                    });
                }
            }
            ),
            //   tap(tx => console.log("TRANSACTION ==> ", {tx})),
            mergeMap(tx => !tx ? of({}) : eventSourcing.eventStore.emitEvent$(
                new Event({
                    eventType: "WalletTransactionCommited",
                    eventTypeVersion: 1,
                    aggregateType: "Wallet",
                    aggregateId: driver.id,
                    data: tx,
                    user: "SYSTEM"
                })
            )
            )
        );
    }

    /**
     * (todo) makespaymento to doorman
     * @param {*} service  
     */
    payClientAgreement$({ businessId, client, driver }, timestamp, aid, av) {
        // console.log("payClientAgreement$ ==> ", {businessId, client, driver});        
        return of({}).pipe(
            map(() => (client.tipType != "VIRTUAL_WALLET")
                ? null
                : ({
                    _id: Crosscutting.generateDateBasedUuid(),
                    businessId: businessId,
                    sourceEvent: { aid, av },
                    type: "MOVEMENT",
                    // notes: mba.notes,
                    concept: "CLIENT_AGREEMENT_PAYMENT",
                    timestamp: timestamp || Date.now(),
                    amount: client.tip,
                    fromId: driver.id,
                    toId: client.tipClientId
                })
            ),
            //   tap(tx => console.log("TRANSACTION ==> ", {tx})),
            mergeMap(tx => !tx ? of({}) : eventSourcing.eventStore.emitEvent$(
                new Event({
                    eventType: "WalletTransactionCommited",
                    eventTypeVersion: 1,
                    aggregateType: "Wallet",
                    aggregateId: driver.id,
                    data: tx,
                    user: "SYSTEM"
                })
            )
            )
        );
    }

    generatePayPerServiceTransaction$(dbService, timestamp, aid, av) {
        // console.log(JSON.stringify({ dbService }));
        const { shiftId, driver, businessId } = dbService;
        const projection = { "payPerServicePrice": 1, "subscriptionType": 1 };
        return ShiftDA.findById$(shiftId, projection).pipe(
            map(shift => {
                if (!shift) return null;
                const { payPerServicePrice, subscriptionType } = shift;
                if (subscriptionType == "PAY_PER_SERVICE") {
                    return ({
                        _id: Crosscutting.generateDateBasedUuid(),
                        sourceEvent: { aid, av },
                        businessId: businessId,
                        type: "MOVEMENT",
                        notes: `Turno: ${shiftId}; Servicio: ${dbService._id}`,
                        concept: "PAY_PER_SERVICE",
                        timestamp: timestamp || Date.now(),
                        amount: payPerServicePrice,
                        fromId: driver.id,
                        toId: businessId
                    });
                }
                return null;
            }),
            // tap(tx => console.log("TRANSACTION ==> ", {tx})),
            mergeMap(tx => !tx ? of({}) : eventSourcing.eventStore.emitEvent$(
                new Event({
                    eventType: "WalletTransactionCommited",
                    eventTypeVersion: 1,
                    aggregateType: "Wallet",
                    aggregateId: driver.id,
                    data: tx,
                    user: "SYSTEM"
                })
            ))
        );
    }

    /**
     * Handles EventSourcing Event ServiceArrived
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceArrived$({ aid, data }) {
        //console.log(`ServiceES: handleServiceArrived: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({}).pipe(
            delay(300),
            mergeMap(() => ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 })),
            filter(service => service.driver && service.driver.username),
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceStateChanged', { _id: service._id, state: 'ARRIVED' })),
        );
    }

    /**
     * Handles EventSourcing Event ServicePassengerBoarded
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServicePassengerBoarded$({ aid, data }) {
        //console.log(`ServiceES: handleServicePassengerBoarded: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({}).pipe(
            delay(300),
            mergeMap(() => ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 })),
            filter(service => service.driver && service.driver.username),
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceStateChanged', { _id: service._id, state: 'ON_BOARD' })),
        );
    }

    /**
     * Handles EventSourcing Event ServiceCompleted
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCompleted$({ aid, data }) {
        //console.log(`ServiceES: handleServiceCompleted: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({}).pipe(
            delay(300),
            mergeMap(() => ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 })),
            filter(service => service.driver && service.driver.username),
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceStateChanged', { _id: service._id, state: 'DONE' })),
        );
    }



    /**
     * Handles EventSourcing Event ServiceCancelledByDriver
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByDriver$({ aid, data, av }) {
        console.log(`ServiceES: handleServiceCancelledByDriver: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({}).pipe(
            delay(300),
            mergeMap(() => ServiceDA.findById$(aid, { "driver.username": 1, "client": 1, "driver.id": 1, "businessId": 1 })),
            filter(service => service.driver && service.driver.username),
            mergeMap(service => {
                return forkJoin([
                    ServiceDA.findCancelledServicesById$(aid, service.driver.id, service.lastModificationTimestamp),
                    BusinessDA.getBusiness$(service.businessId)
                ]).pipe(
                    mergeMap(([serviceCount, business]) => {
                        console.log("SERVICE COUNT ===> ", serviceCount);
                        const serviceCancelledByDriverToPenalizeCount = Number((business.attributes.find(a => a.key === "SERVICE_CANCELLED_BY_DRIVER_TO_PENALIZE_COUNT") || {}).value || "0");
                        const serviceCancelledByDriverToPenalizeAmount = Number((business.attributes.find(a => a.key === "SERVICE_CANCELLED_BY_DRIVER_TO_PENALIZE_AMOUNT") || {}).value || "0");
                        console.log("serviceCancelledByDriverToPenalizeCount ===> ", serviceCancelledByDriverToPenalizeCount);
                        console.log("serviceCancelledByDriverToPenalizeAmount ===> ", serviceCancelledByDriverToPenalizeAmount);
                        if(serviceCancelledByDriverToPenalizeCount > 0 && serviceCount >= serviceCancelledByDriverToPenalizeCount && serviceCancelledByDriverToPenalizeAmount > 0){
                            return eventSourcing.eventStore.emitEvent$(
                                new Event({
                                    eventType: "WalletTransactionCommited",
                                    eventTypeVersion: 1,
                                    aggregateType: "Wallet",
                                    aggregateId: service.driver.id,
                                    data: { 
                                        _id: Crosscutting.generateDateBasedUuid(),
                                        businessId: service.businessId,
                                        sourceEvent: { aid, av },
                                        type: "MOVEMENT",
                                        // notes: mba.notes,
                                        concept: "PENALIZATION_FOR_CANCELLATION",
                                        timestamp: Date.now(),
                                        amount: serviceCancelledByDriverToPenalizeAmount,
                                        fromId: service.driver.id,
                                        toId: service.businessId
                                    },
                                    user: "SYSTEM"
                                })
                            ).pipe(
                                mapTo(service)
                            )
                        }else {
                            return of(service)
                        }
                    })
                )
            }),
            mergeMap((service) => {
                return forkJoin([
                    driverAppLinkBroker.sendServiceEventToDrivers$(
                        service.businessId, service.driver.username, 'ServiceStateChanged', { _id: service._id, state: 'CANCELLED_DRIVER' }),
                    of({}).pipe(
                        mergeMap(() => {
                            if(service.client.tipType === "VIRTUAL_WALLET" && (service.driver || {}).id){
                                return eventSourcing.eventStore.emitEvent$(
                                    new Event({
                                        eventType: "WalletTransactionCommited",
                                        eventTypeVersion: 1,
                                        aggregateType: "Wallet",
                                        aggregateId: service.client.tipClientId,
                                        data: { 
                                            _id: Crosscutting.generateDateBasedUuid(),
                                            businessId: service.businessId,
                                            sourceEvent: { aid, av },
                                            type: "MOVEMENT",
                                            // notes: mba.notes,
                                            concept: "CLIENT_AGREEMENT_REFUND",
                                            timestamp: Date.now(),
                                            amount: service.client.tip,
                                            fromId: service.client.tipClientId,
                                            toId: service.driver.id
                                        },
                                        user: "SYSTEM"
                                    })
                                )
                            }else {
                                return of({})
                            }
                            
                        })
                    )

                ]).pipe(
                    mapTo(service)
                )
            }
            )
        );
    }

    /**
     * Handles EventSourcing Event ServiceCancelledByClient
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByClient$({ aid, data, av }) {
        //console.log(`ServiceES: handleServiceCancelledByClient: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({}).pipe(
            delay(300),
            mergeMap(() => ServiceDA.findById$(aid, { "driver.username": 1, "client": 1, "driver.id": 1, "businessId": 1 })),
            mergeMap(service => {
                return forkJoin([
                    driverAppLinkBroker.sendServiceEventToDrivers$(
                        service.businessId, 'all', 'ServiceOfferWithdraw', { _id: service._id }),
                    of({}).pipe(
                        mergeMap(() => {
                            if(service.client.tipType === "VIRTUAL_WALLET" && (service.driver || {}).id){
                                return eventSourcing.eventStore.emitEvent$(
                                    new Event({
                                        eventType: "WalletTransactionCommited",
                                        eventTypeVersion: 1,
                                        aggregateType: "Wallet",
                                        aggregateId: service.client.tipClientId,
                                        data: { 
                                            _id: Crosscutting.generateDateBasedUuid(),
                                            businessId: service.businessId,
                                            sourceEvent: { aid, av },
                                            type: "MOVEMENT",
                                            // notes: mba.notes,
                                            concept: "CLIENT_AGREEMENT_REFUND",
                                            timestamp: Date.now(),
                                            amount: service.client.tip,
                                            fromId: service.client.tipClientId,
                                            toId: service.driver.id
                                        },
                                        user: "SYSTEM"
                                    })
                                )
                            }else {
                                return of({})
                            }
                            
                        })
                    )

                ]).pipe(
                    mapTo(service)
                )
            }
            ),
            filter(service => service.driver && service.driver.username),
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceCancelledByClient', { ...data, _id: service._id, state: 'CANCELLED_CLIENT' })),
        );
    }

    /**
     * Handles EventSourcing Event ServiceCancelledByOperator
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceCancelledByOperator$({ aid, data, av }) {
        //console.log(`ServiceES: handleServiceCancelledByOperator: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({}).pipe(
            delay(300),
            mergeMap(() => ServiceDA.findById$(aid, { "driver.username": 1, "client": 1, "driver.id": 1, "businessId": 1 })),
            mergeMap(service => {
                
                return forkJoin([
                    driverAppLinkBroker.sendServiceEventToDrivers$(
                        service.businessId, 'all', 'ServiceOfferWithdraw', { _id: service._id })
                ]).pipe(
                    mapTo(service)
                )
            }
            ),
            filter(service => service.driver && service.driver.username),
            mergeMap(service => driverAppLinkBroker.sendServiceEventToDrivers$(
                service.businessId, service.driver.username, 'ServiceCancelledByOperator', { ...data, _id: service._id, state: 'CANCELLED_OPERATOR' })),
        ); 0
    }

    /**
     * Handles message driver sent
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceMessageSent$({ aid, data }) {
        console.log(`ServiceES: handleServiceMessageSent: ${JSON.stringify({ _id: aid, ...data })} `); //DEBUG: DELETE LINE
        return of({}).pipe(
            filter(() => data.type === 'DRIVER'),
            mergeMap(() => ServiceDA.findById$(aid, { "driver.username": 1, "businessId": 1 })),
            filter(service => service.driver && service.driver.username),
            mergeMap(service =>
                driverAppLinkBroker.sendServiceMessageToDrivers$(
                    service.businessId, service.driver.username, 'ServiceMessageSent', data
                )
            ),
        );
    }

    //#region Object builders

    /**
     * Transforms an Mongo/Event location format to a GraphQL-like format
     * @param {*} location 
     */
    formatPickUpDropOff(location) {
        return !location
            ? undefined
            : {
                ...location,
                marker: !location.marker
                    ? undefined
                    : { lng: location.marker.coordinates[0], lat: location.marker.coordinates[1] },
                polygon: !location.polygon
                    ? undefined
                    : location.polygon.coordinates[0].map(([lng, lat]) => ({ lng, lat }))
            };
    }


    //#endregion





    //#region NOT BEING CALLED AT THE MOMENT



    /**
     * Handles EventSourcing Event ServicePickUpETAReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServicePickUpETAReported$(evt) {
        //NOT BEING CALLED FROM EVENT-STORE SERVICE
        return of({});
    }

    /**
     * Handles EventSourcing Event ServiceLocationReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceLocationReported$(evt) {
        //NOT BEING CALLED FROM EVENT-STORE SERVICE
        return of({});
    }

    /**
     * Handles EventSourcing Event ServiceDropOffETAReported
     * @param {Event} evt 
     * @returns {Observable}
     */
    handleServiceDropOffETAReported$(evt) {
        //NOT BEING CALLED FROM EVENT-STORE SERVICE
        return of({});
    }

    //#endregion

    /**
     * Generates an EventSourcing Event
     * @param {*} aggregateType 
     * @param {*} aggregateId defaults to generated DateBased Uuid
     * @param {*} eventType 
     * @param {*} data defaults to {}
     * @param {*} authToken 
     * @param {*} eventTypeVersion defaults to 1
    */
    static buildEventSourcingEvent(aggregateType, aggregateId, eventType, data = {}, user, eventTypeVersion = 1, ephemeral = false) {
        return new Event({
            aggregateType,
            aggregateId,
            eventType,
            eventTypeVersion,
            user,
            data,
            ephemeral
        });
    }

    /**
     * Logs an error at the console.error printing only the message and the stack related to the project source code
     * @param {Error} error 
     */
    static logError(error) {
        if (!error.stack) {
            console.error(error);
            return;
        }
        try {
            const stackLines = error.stack.split('\n');
            console.error(
                new Date().toString() + ': ' + stackLines[0] + '\n' + stackLines.filter(line => line.includes('driver-app-link/bin')).join('\n') + '\n'
            );
        }
        catch (e) {
            console.error(e);
            console.error(error);
        }
    }
}

/**
 * @returns {ServiceES}
 */
module.exports = () => {
    if (!instance) {
        instance = new ServiceES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};