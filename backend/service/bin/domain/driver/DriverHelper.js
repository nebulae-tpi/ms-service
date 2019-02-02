"use strict";

const DriverDA = require("../../data/DriverDA");
const VehicleDA = require("../../data/VehicleDA");

const { of, interval, from, throwError, forkJoin } = require("rxjs");
const { take, mergeMap, catchError, map, toArray, tap } = require('rxjs/operators');

class DriverHelperTool {

    static validateVehicleAsignment$(driverId, vehiclePlate) {
        return forkJoin(
            DriverDA.getDriver$(driverId)
                .pipe(
                    map(driver => driver.assignedVehicles),
                ),
            VehicleDA.getVehicleByPlate$(vehiclePlate)
        )
            .pipe(
                tap(r => console.log(r) ),
                map(([assignedVehicles, vehicleFound]) =>
                    assignedVehicles.includes(vehiclePlate) || vehicleFound == null
                        ? false : true
                )
            )
    }

}
/**
 * @returns {DriverHelperTool}
 */
module.exports = DriverHelperTool;
