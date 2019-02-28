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


  constructor(private gateway: GatewayService) {

  }

  getServiceService$(id: string) {
    //console.log('getServiceService => ', id);
    return this.gateway.apollo.query<any>({
      query: ServiceService,
      variables: {
        id: id
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
