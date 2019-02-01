import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { startWith,  tap, mergeMap } from 'rxjs/operators';
import { GatewayService } from '../../../../api/gateway.service';
import {
  ServiceCreateDriver,
  ServiceUpdateDriverGeneralInfo,
  ServiceUpdateDriverState,
  ServiceDriver,
  ServiceDriverUpdatedSubscription,
  ServiceDriverVehicleList
} from '../gql/driverVehicleAssignment.js';

@Injectable()
export class VehicleAssignmentService {

  lastOperation = null;

  driver = null;

  constructor(private gateway: GatewayService) {

  }

  /**
   * Registers an operation, this is useful to indicate that we are waiting for the response of the CREATE operation
   */
  createOperation$(driver: any) {
    return of('CREATE').pipe(
      tap(operation => {
        this.lastOperation = operation;
        this.driver = driver;
      })
    );
  }

  /**
   * Registers an operation, this is useful to indicate that we are waiting for the response of the UPDATE operation
   */
  updateOperation$(driver: any) {
    return of('UPDATE').pipe(
      tap(operation => {
        this.lastOperation = operation;
        this.driver = driver;
      })
    );
  }

  /**
   * Unregisters an operation, this is useful to indicate that we are not longer waiting for the response of the last operation
   */
  resetOperation$(){
    return of('').pipe(
      tap(() => {
        this.lastOperation = null;
        this.driver = null;
      })
    );
  }

  createServiceDriver$(driver: any) {
    return this.createOperation$(driver)
    .pipe(
      mergeMap(() => {
        return this.gateway.apollo
        .mutate<any>({
          mutation: ServiceCreateDriver,
          variables: {
            input: driver
          },
          errorPolicy: 'all'
        });
      })
    );
  }

  updateServiceDriverGeneralInfo$(id: String, driverGeneralInfo: any) {
    return this.updateOperation$(driverGeneralInfo)
    .pipe(
      mergeMap(() => {
        return this.gateway.apollo
        .mutate<any>({
          mutation: ServiceUpdateDriverGeneralInfo,
          variables: {
            id: id,
            input: driverGeneralInfo
          },
          errorPolicy: 'all'
        });
      })
    );
  }

  updateServiceDriverState$(id: String, newState: boolean) {
    return this.gateway.apollo
      .mutate<any>({
        mutation: ServiceUpdateDriverState,
        variables: {
          id: id,
          newState: newState
        },
        errorPolicy: 'all'
      });
  }

  getServiceDriver$(entityId: string) {
    return this.gateway.apollo.query<any>({
      query: ServiceDriver,
      variables: {
        id: entityId
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });
  }

/**
 * Event triggered when a business is created, updated or deleted.
 */
subscribeServiceDriverUpdatedSubscription$(): Observable<any> {
  return this.gateway.apollo
  .subscribe({
    query: ServiceDriverUpdatedSubscription
  });
}

  getDriverVehiclesAssigned$(driverId, paginatorInput) {
    return this.gateway.apollo.query<any>({
      query: ServiceDriverVehicleList,
      variables: {
        driverId: driverId,
        paginationInput: paginatorInput
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });

  }

}
