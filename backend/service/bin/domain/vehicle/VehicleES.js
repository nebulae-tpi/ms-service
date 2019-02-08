'use strict'

const {of} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const VehicleDA = require('../../data/VehicleDA');
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
        console.log("##########  handleVehicleCreated$  #######################3");
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
            tap(r => console.log(r)),
            mergeMap(vehicle => VehicleDA.createVehicle$(vehicle)),
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceVehicleUpdatedSubscription`, result.ops[0]))
        );
    }

        /**
     * Update the general info on the materialized view according to the received data from the event store.
     * @param {*} driverGeneralInfoUpdatedEvent driver created event
     */
    handleVehicleGeneralInfoUpdated$(driverGeneralInfoUpdatedEvent) {  
        return of(driverGeneralInfoUpdatedEvent.data)
        .pipe(
            map(newGeneralInfo => ({
                licensePlate: newGeneralInfo.licensePlate,
                brand: newGeneralInfo.brand,
                line: newGeneralInfo.line,
                model: newGeneralInfo.model,
            })),
            mergemap(update => VehicleDA.updateVehicleInfo$(driverGeneralInfoUpdatedEvent.aid, update) ),
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceVehicleUpdatedSubscription`, result))
        );
    }

    /**
     * updates the state on the materialized view according to the received data from the event store.
     * @param {*} VehicleStateUpdatedEvent events that indicates the new state of the driver
     */
    handleVehicleStateUpdated$(VehicleStateUpdatedEvent) {          
        return of(VehicleStateUpdatedEvent.data)
        .pipe(
            map(newState => ({ active: newState })),
            mergeMap(update => VehicleDA.updateVehicleInfo$( VehicleStateUpdatedEvent.aid, update)),
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceVehicleUpdatedSubscription`, result))
        );
    }

    handleVehicleFeaturesUpdated$(VehicleVehicleFeaturesUpdatedEvent){
        return of(VehicleVehicleFeaturesUpdatedEvent.data)
        .pipe(
            map(newFeatures => ({
                fuelType: newFeatures.fuel,
                features: newFeatures.others.filter(f => f.active).map(e => e.name)
            })),
            mergeMap(update => VehicleDA.updateVehicleInfo$(VehicleVehicleFeaturesUpdatedEvent.aid, update) ),
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `VehicleVehicleUpdatedSubscription`, result))
        )

    }

    handleVehicleBlockRemoved$(vehicleBlockRemovedEvt){
        console.log("handleVehicleBlockRemoved ==> ", vehicleBlockRemovedEvt.data );
        return of({vehicleId: vehicleBlockRemovedEvt.aid, blockKey: vehicleBlockRemovedEvt.data.blockKey })
        .pipe(
            mergeMap( ({vehicleId, blockKey}) => VehicleDA.removeVehicleBlock$(vehicleId, blockKey) )
        )

    }

    handleVehicleBlockAdded$(vehicleBlockAddedEvt){
        console.log("handleVehicleBlockAdded ==> ", vehicleBlockAddedEvt.data );
        return of({
            vehicleId: vehicleBlockAddedEvt.aid,
            user: vehicleBlockAddedEvt.user,
            ...vehicleBlockAddedEvt.data
        })
        .pipe(
            mergeMap((vehicleId, blockKey ) => VehicleDA.insertVehicleBlock$(vehicleId, blockKey ) 
            )
        )

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