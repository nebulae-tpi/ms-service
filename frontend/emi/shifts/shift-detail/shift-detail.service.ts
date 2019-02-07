import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { startWith,  tap, mergeMap } from 'rxjs/operators';
import { GatewayService } from '../../../../api/gateway.service';
import {
  ServiceShift,
  ServiceServiceUpdatedSubscription
} from '../gql/shift.js';

@Injectable()
export class ShiftDetailService {


  constructor(private gateway: GatewayService) {

  }

  getShiftDetails$(id: string) {
    return this.gateway.apollo.query<any>({
      query: ServiceShift,
      variables: {
        id: id
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
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
