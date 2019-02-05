'use strict'

const { tap, mergeMap, catchError, map, mapTo, delay, toArray, groupBy, filter } = require('rxjs/operators');
const { Subject, of, from, forkJoin, interval, defer, concat } = require('rxjs');
const uuidv4 = require("uuid/v4");

const broker = require("../bin/tools/broker/BrokerFactory")();



class DriverMapperHelper {

     static executeQueries$(line) {
        return this.mapToDriverVehicleObj$(line)
            .pipe(
                mergeMap(driverVehicleInfo => forkJoin(
                    this.createDriver$(driverVehicleInfo.driver),
                    this.createVehicle$(driverVehicleInfo.vehicle),
                    of(driverVehicleInfo)
                )),
                mergeMap(([a, b, c]) => forkJoin(
                    this.assignVehicleToDriver$(c.driver._id, c.vehicle.licensePlate),
                    this.createDriverCredentials$(c.driver)
                )),
                delay(100)
            )
    }

    static createDriverCredentials$(driverInfo){
        return of(driverInfo)

    }

    static createDriver$(driver){
        return broker.send$("Events", "", {
            et: "DriverCreated",
            etv: 1,
            at: "Driver",
            aid: driver._id,
            data: {
              _id: driver._id,
              creatorUser: "SYSTEM",
              creationTimestamp: new Date().getTime(),
              modifierUser: "SYSTEM",
              modificationTimestamp: new Date().getTime(),
              generalInfo: {
                documentType: driver.documentType,
                document: driver.documentId,
                name: driver.name,
                lastname: driver.lastname,
                email: driver.email,
                phone: driver.phone,
                languages: driver.languages.map(i => ({ name: i, active: true })),
                gender: driver.gender,
                pmr: driver.pmr
              },
              state: driver.active,
              businessId: driver.businessId
            },
            user: "SYSTEM",
            timestamp: Date.now(),
            av: 1
          });

    }

    static createVehicle$(vehicle) {
        return broker.send$("Events", "", {
            et: "VehicleCreated",
            etv: 1,
            at: "Vehicle",
            aid: vehicle._id,
            data: {
                _id: vehicle._id,
                creatorUser: "SYSTEM",
                creationTimestamp: new Date().getTime(),
                modifierUser: "SYSTEM",
                modificationTimestamp: new Date().getTime(),
                generalInfo: {
                    licensePlate: vehicle.licensePlate,
                    model: vehicle.model,
                    brand: vehicle.brand,
                    line: vehicle.line
                },
                features: {
                    fuel: vehicle.fuelType,
                    capacity: vehicle.capacity,
                    oters:vehicle.features.map(i => ({ name: i, active: true }))
                },
                blockings: [],
                state: vehicle.active,
                businessId: vehicle.businessId
            },
            user: "SYSTEM",
            timestamp: Date.now(),
            av: 1
        });
    }

    static assignVehicleToDriver$(driverId, vehiclePlate){
        return broker.send$("Events", "", {
            et: "VehicleAssigned",
            etv: 1,
            at: "Driver",
            aid: driverId,
            data: {
                vehicleLicensePlate: vehiclePlate
            },
            user: "SYSTEM",
            timestamp: Date.now(),
            av: 1
        });
    }

    static mapToDriverVehicleObj$(lineAsArray, businessId){
        return of({
            driver: {
                active:true,
                pmr: false,
                businessId: businessId,
                name: lineAsArray[1],
                lastname: lineAsArray[2],
                username: this.generateUserName(lineAsArray),
                documentType: "CC",
                documentId: lineAsArray[3],
                email: this.generateEmail(lineAsArray),
                phone: lineAsArray[5],
                gender: "M",
                languages: lineAsArray[6] !== '' ? [{ name: "EN", active: true }] : []
            },
            vehicle: {
                active: true,
                businessId: businessId,
                licensePlate: lineAsArray[7].toUpperCase(),
                brand: lineAsArray[8],
                line: lineAsArray[9],
                model: lineAsArray[10],
                capacity: 4,
                fuelType:  this.fueltypeMapper(lineAsArray[11].replace(/"/g, "")),
                features: lineAsArray[12]
                    .split(',')
                    .map(feature => this.featuresMapper(feature.replace(/"/g, "")))
                    .filter(r => r != null )
                    .map(f => ({ name: f, active: true }))
                    
            }
        })
    }

    static generateUserName(lineAsArray){
        const firstname = lineAsArray[1].replace(/\./g,'').trim().split(" ")[0];
        const lastname = lineAsArray[2].replace(/\./g,'').trim().split(" ")[0];

        const username = `${firstname}.${lastname}`
            .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // remove accents
            .toLowerCase();

        return username;
    }

    static generateEmail(lineAsArray){
        const forbidennEmails = [
            "jhon@hotmail.com", "no@hotmail.com",
            "jorge@hotmail.com", "rtellovivas@gmail.com",
            "luis@hotmail.com"];
        const email = lineAsArray[4].trim();
        return forbidennEmails.includes(email) 
            ? `${lineAsArray[3]}@autogen.com`
            : lineAsArray[4];
        
    }

    static fueltypeMapper(fueltType) {
        switch (fueltType.toUpperCase().trim()) {
            case "GAS": return "GAS";
            case "GASOLINA": return "GASOLINE";
            case "GAS Y GASOLINA": return "GAS_AND_GASOLINE"
            default: {
                console.log(`=============== FUEL NOT ALLOWED =========== {${fueltType}}`);                
            }
        }
    }

    static featuresMapper(feature) {
        switch (feature.toUpperCase().trim()) {
            case "AIRE ACONDICIONADO": return "AC";
            case "BAÚL": return "TRUNK";
            case "PERMITE MASCOTAS": return "PETS";
            case "PARILLA": return "ROOF_RACK";

            default: {
                console.log( `=============== FEATURE NOT ALLOWED =========== {${feature}}`);
            }
        }
    }
}
/**
 * @returns {DriverMapperHelper}
 */
module.exports = DriverMapperHelper