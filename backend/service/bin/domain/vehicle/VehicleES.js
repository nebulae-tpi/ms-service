'use strict'

const {of} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo, delay } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const VehicleDA = require('../../data/VehicleDA');
const DriverDA = require('../../data/DriverDA');
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";

/**
 * Singleton instance
 */
let instance;

class VehicleES {

    constructor() {
    }


    /**
     * Persists the driver on the materialized view according to the received data from the event store.
     * @param {*} businessCreatedEvent business created event
     */
    handleVehicleCreated$(vehicleCreatedEvent) {
        return of(vehicleCreatedEvent.data)
        .pipe(
            map(vehicle => ({
                _id: vehicle._id,
                businessId: vehicle.businessId,
                licensePlate: vehicle.generalInfo.licensePlate,
                active: vehicle.state,
                blocks: [],
                brand: vehicle.generalInfo.brand,
                line: vehicle.generalInfo.line,
                model: vehicle.generalInfo.model,
                fuelType: vehicle.features ? vehicle.features.fuel : null,
                features:  vehicle.features 
                    ? vehicle.features.others
                        ? vehicle.features.others.filter(f => f.active).map(e => e.name) 
                        : []
                    : []

            })),
            mergeMap(vehicle => VehicleDA.createVehicle$(vehicle)),
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceVehicleUpdatedSubscription`, result.ops[0]))
        );
    }

        /**
     * Update the general info on the materialized view according to the received data from the event store.
     * @param {*} driverGeneralInfoUpdatedEvent driver created event
     */
    handleVehicleGeneralInfoUpdated$(vehicleGeneralInfoUpdated) {  
        return of(vehicleGeneralInfoUpdated.data.generalInfo)
        .pipe(
            map(newGeneralInfo => ({
                licensePlate: newGeneralInfo.licensePlate,
                brand: newGeneralInfo.brand,
                line: newGeneralInfo.line,
                model: newGeneralInfo.model,
            })),
            mergeMap(update => VehicleDA.updateVehicleInfo$(vehicleGeneralInfoUpdated.aid, update)),
            mergeMap(oldVehicle => oldVehicle.licensePlate != vehicleGeneralInfoUpdated.data.generalInfo.licensePlate
                ? DriverDA.unassignVehicleFromAllDrivers$(oldVehicle.licensePlate)
                : of({result: "PLATE NOT CHANGED"})
            ),
            //tap(r => console.log(r.result)),
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceVehicleUpdatedSubscription`, result))
        );
    }

    /**
     * updates the state on the materialized view according to the received data from the event store.
     * @param {*} VehicleStateUpdatedEvent events that indicates the new state of the driver
     */
    handleVehicleStateUpdated$(VehicleStateUpdatedEvent) {          
        return of(VehicleStateUpdatedEvent.data.state)
        .pipe(
            map(newState => ({ active: newState })),
            mergeMap(update => VehicleDA.updateVehicleInfo$( VehicleStateUpdatedEvent.aid, update)),
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceVehicleUpdatedSubscription`, result))
        );
    }

    handleVehicleFeaturesUpdated$(VehicleVehicleFeaturesUpdatedEvent){
        //console.log("VehicleVehicleFeaturesUpdatedEvent. data", VehicleVehicleFeaturesUpdatedEvent. data);
        return of(VehicleVehicleFeaturesUpdatedEvent.data.features)
        .pipe(
            map(newFeatures => ({
                fuelType: newFeatures.fuel,
                features:  (!newFeatures ||!newFeatures.others ) ? [] :  newFeatures.others.filter(f => f.active).map(e => e.name)
            })),
            mergeMap(update => VehicleDA.updateVehicleInfo$(VehicleVehicleFeaturesUpdatedEvent.aid, update) ),
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `VehicleVehicleUpdatedSubscription`, result))
        )

    }

    handleVehicleBlockRemoved$(vehicleBlockRemovedEvt){        
        return of({vehicleId: vehicleBlockRemovedEvt.aid, ...vehicleBlockRemovedEvt.data })
        .pipe(
            //tap( obj => console.log("handleVehicleBlockRemoved$", obj )),
            mergeMap( ({ vehicleId, blockKey, notes }) => VehicleDA.removeVehicleBlock$(vehicleId, { key: blockKey, notes }) )
        )

    }

    handleVehicleBlockAdded$(vehicleBlockAddedEvt){
        return of({
            vehicleId: vehicleBlockAddedEvt.aid,
            user: vehicleBlockAddedEvt.user,
            ...vehicleBlockAddedEvt.data
        })
        .pipe(
            //tap(obj => console.log("handleVehicleBlockAdded$", obj) ),
            mergeMap(({vehicleId, blockKey, notes, endTime, startTime }) => VehicleDA.insertVehicleBlock$(vehicleId, { key: blockKey, notes, startTime, endTime } ))
        )

    }


    handleVehicleSubscriptionTypeUpdated$({ etv, aid, av, data, user, timestamp }){
        const { type  } = data;
        const sets = {'subscription.type': type};

        return VehicleDA.updateVehicleInfo$(aid, sets);
    }

}



/**
 * @returns {VehicleES}
 */
module.exports = () => {
    if (!instance) {
        instance = new VehicleES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};