"use strict";

const DriverDA = require("../../data/DriverDA");
const VehicleDA = require("../../data/VehicleDA");
const {
    CustomError,
    DefaultError,
    INTERNAL_SERVER_ERROR_CODE,
    PERMISSION_DENIED,
    LICENSE_PLATE_ALREADY_ASSIGNED,
    LICENSE_PLATE_NO_EXIST
  } = require("../../tools/customError");

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
                mergeMap(([assignedVehicles, vehicleFound]) => {
                    if (assignedVehicles.includes(vehiclePlate)) {
                        return throwError(new CustomError('License plate already Assigned', 'AssignVehicle',
                            LICENSE_PLATE_ALREADY_ASSIGNED.code, LICENSE_PLATE_ALREADY_ASSIGNED.description)
                        )

                    } else if (vehicleFound == null) {
                        return throwError(new CustomError('License plate do not exist', 'AssignVehicle',
                            LICENSE_PLATE_NO_EXIST.code, LICENSE_PLATE_NO_EXIST.description)
                        )
                    } else {
                        return of(true)
                    }

                })
            )
    }

    static validateVehicleUnassignment$(driverId, vehiclePlate) {
        return forkJoin(
            DriverDA.getDriver$(driverId)
                .pipe(
                    map(driver => driver.assignedVehicles),
                ),
            VehicleDA.getVehicleByPlate$(vehiclePlate)
        )
            .pipe(
                tap(r => console.log(r) ),
                map(([assignedVehicles, vehicleFound]) => assignedVehicles.includes(vehiclePlate) || vehicleFound !== null)
            )
    }

}
/**
 * @returns {DriverHelperTool}
 */
module.exports = DriverHelperTool;
