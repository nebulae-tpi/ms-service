import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { startWith,  tap, mergeMap } from 'rxjs/operators';
import { GatewayService } from '../../../../api/gateway.service';
import {
  ServiceService,
  ServiceServiceUpdatedSubscription
} from '../gql/service.js';

@Injectable()
export class ServiceDetailService {

  lastOperation = null;

  service = null;

  constructor(private gateway: GatewayService) {

  }

  /**
   * Registers an operation, this is useful to indicate that we are waiting for the response of the CREATE operation
   */
  createOperation$(service: any) {
    return of('CREATE').pipe(
      tap(operation => {
        this.lastOperation = operation;
        this.service = service;
      })
    );
  }

  /**
   * Registers an operation, this is useful to indicate that we are waiting for the response of the UPDATE operation
   */
  updateOperation$(service: any) {
    return of('UPDATE').pipe(
      tap(operation => {
        this.lastOperation = operation;
        this.service = service;
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
        this.service = null;
      })
    );
  }

  getServiceService$(entityId: string) {
    return this.gateway.apollo.query<any>({
      query: ServiceService,
      variables: {
        id: entityId
      },
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }

/**
 * Event triggered when a business is created, updated or deleted.
 */
subscribeServiceServiceUpdatedSubscription$(): Observable<any> {
  return this.gateway.apollo
  .subscribe({
    query: ServiceServiceUpdatedSubscription
  });
}

}
