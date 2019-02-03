'use strict'

const {of} = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const broker = require("../../tools/broker/BrokerFactory")();
const DriverDA = require('../../data/DriverDA');
const VehicleDA = require('../../data/VehicleDA');
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";

/**
 * Singleton instance
 */
let instance;

class DriverES {

    constructor() {
    }


    /**
     * Persists the driver on the materialized view according to the received data from the event store.
     * @param {*} businessCreatedEvent business created event
     */
    handleDriverCreated$(driverCreatedEvent) { 
        console.log("########################## handleDriverCreated$ #################################");
        return of(driverCreatedEvent.data)
        .pipe(
            map(driver => ({
                _id: driver._id,
                businessId: driver.businessId,
                name: driver.generalInfo.name,
                lastname: driver.generalInfo.lastname,
                username: '',
                active: driver.state,
                blocks: [],
                documentType: driver.generalInfo.documentType,
                documentId: driver.generalInfo.document,
                pmr: driver.generalInfo.pmr,
                languages: driver.generalInfo.languages ? driver.generalInfo.languages.filter(l => l.active).map(i => i.name) : [],
                phone: driver.generalInfo.phone,
                assignedVehicles: []
            })),
            mergeMap( driver => DriverDA.createDriver$(driver) ),
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceDriverUpdatedSubscription`, result.ops[0]))
        );
    }

        /**
     * Update the general info on the materialized view according to the received data from the event store.
     * @param {*} driverGeneralInfoUpdatedEvent driver created event
     */
    handleDriverGeneralInfoUpdated$(driverGeneralInfoUpdatedEvent) {
        return of(driverGeneralInfoUpdatedEvent.data)
        .pipe(
            map(newGeneralInfo => ({
                name: newGeneralInfo.name,
                lastname: newGeneralInfo.lastname,
                documentType: newGeneralInfo.documentType,
                documentId: newGeneralInfo.document,
                pmr: newGeneralInfo.pmr,
                languages: newGeneralInfo.languages,
                phone: newGeneralInfo.phone
            })),
            mergeMap(newInfo => DriverDA.updateDriverGeneralInfo$(driverGeneralInfoUpdatedEvent.aid, newInfo)),
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceDriverUpdatedSubscription`, result))
        );
    }

    /**
     * updates the state on the materialized view according to the received data from the event store.
     * @param {*} DriverStateUpdatedEvent events that indicates the new state of the driver
     */
    handleDriverStateUpdated$(DriverStateUpdatedEvent) {          
        return DriverDA.updateDriverState$(DriverStateUpdatedEvent.aid, DriverStateUpdatedEvent.data)
        .pipe(
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceDriverUpdatedSubscription`, result))
        );
    }
    
    handleVehicleAssigned$(VehicleAssignedEvent){
        return of(VehicleAssignedEvent.data.vehicleLicensePlate)
        .pipe(
            mergeMap(newVehicle => DriverDA.assignVehicle$(VehicleAssignedEvent.aid, newVehicle) ),
            mergeMap(() => VehicleDA.getVehicleByPlate$(VehicleAssignedEvent.data.vehicleLicensePlate)),
            mergeMap(result => broker.send$(MATERIALIZED_VIEW_TOPIC, `ServiceDriverVehicleAssigned`, result))
        )
    }

    handleVehicleUnassigned$(VehicleUnassignedEvent){
        console.log("#############   handleVehicleUnassigned   ##############", VehicleUnassignedEvent.aid,
         VehicleUnassignedEvent.data.vehicleLicensePlate  );
        
        return of(VehicleUnassignedEvent.data.vehicleLicensePlate)
        .pipe(
            mergeMap(plate => DriverDA.unassignVehicle$(VehicleUnassignedEvent.aid, plate)),
        );

    }

}



/**
 * @returns {DriverES}
 */
module.exports = () => {
    if (!instance) {
        instance = new DriverES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};