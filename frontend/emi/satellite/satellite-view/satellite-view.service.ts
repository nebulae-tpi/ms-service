import { Injectable } from '@angular/core';
import { Observable, Subject, of } from "rxjs";
import {
  startWith, mergeMap, map, filter, tap
} from "rxjs/operators";
import { GatewayService } from '../../../../api/gateway.service';
import {
  ServiceServicesSatellite,
  ServiceClientSatellite,
  ServiceClientSatellites,
  ServiceCoreRequestService,
  ServiceServiceUpdatedSubscription
} from '../gql/satellite';
import * as moment from "moment";
@Injectable()
export class SatelliteViewService {

  // This is your data.
  private data = [];

  // This subject will be used to update the observable
  private _serviceList = new Subject();

  // This observable is public so that your components can subscribe
  serviceList$ = this._serviceList.asObservable();

  constructor(private gateway: GatewayService) {

  }

    /**
   * Load services of the satellite client
   */
  loadServicesSatellite$(){
    return of('Loading services')
    .pipe(
      mergeMap(() => this.getServiceList$()),
      map((data: any) => data.ServiceServicesSatellite),
      filter(services => services && services-length > 0),
      tap(services => {
        this.data = services;
      })
    )
  }


  /**
   * Gets the service list of a client satellite
   * @returns {Observable} Observable with the service list
   */
  getServiceList$() {
    return this.gateway.apollo.query<any>({
      query: ServiceServicesSatellite,
      variables: {},
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }

    /**
   * Gets the service list of a client satellite
   * @returns {Observable} Observable with the service list
   */
  getServiceClientSatellite$() {
    return this.gateway.apollo.query<any>({
      query: ServiceClientSatellite,
      variables: {},
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }

  getSatelliteClientsByFilter(clientText: String, limit: number): Observable<any> {
    return this.gateway.apollo
      .query<any>({
        query: ServiceClientSatellites,
        variables: {
          clientText: clientText,
          limit: limit
        },
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


  /**
   * Send a request service to the server
   * @param serviceCoreRequest 
   */
  createServiceCoreRequestService$(serviceCoreRequest: any) {
    return this.gateway.apollo
    .mutate<any>({
      mutation: ServiceCoreRequestService,
      variables: {
        client: serviceCoreRequest.client,
        pickUp: serviceCoreRequest.pickUp,
        paymentType: serviceCoreRequest.paymentType,
        requestedFeatures: serviceCoreRequest.requestedFeatures,
        dropOff: serviceCoreRequest.dropOff,
        fareDiscount: serviceCoreRequest.fareDiscount,
        fare: serviceCoreRequest.fare,
        tip: serviceCoreRequest.tip,
      },
      errorPolicy: 'all'
    });
  }

}
