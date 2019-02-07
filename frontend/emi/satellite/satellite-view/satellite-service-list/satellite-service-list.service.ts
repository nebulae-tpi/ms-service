import { Injectable } from '@angular/core';
import { Observable, Subject, of } from "rxjs";
import {
  startWith, mergeMap, map, filter, tap,
} from "rxjs/operators";
import { GatewayService } from '../../../../../api/gateway.service';
import {
  ServiceServicesSatellite,
  ServiceClientSatellite,
  ServiceCoreCancelService
} from '../../gql/satellite';
import * as moment from "moment";

@Injectable()
export class SatelliteServiceListService {

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
      mergeMap(() => this.getserviceList$()),
      map((data:any) => data.ServiceServicesSatellite),
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
  getserviceList$(){
    return this.gateway.apollo.query<any>({
      query: ServiceServicesSatellite,
      variables: {},
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }

    /**
   * Gets the client satellite data
   * @returns {Observable} Observable with the service list
   */
  getClientSatellite$(){
    return this.gateway.apollo.query<any>({
      query: ServiceClientSatellite,
      variables: {},
      fetchPolicy: "network-only",
      errorPolicy: "all"
    });
  }

  /**
   * Cancel a service
   * @param serviceCoreCancelService 
   */
  cancelServiceCoreCancelService$(serviceCoreCancelService: any) {
    return this.gateway.apollo
    .mutate<any>({
      mutation: ServiceCoreCancelService,
      variables: {
        id: serviceCoreCancelService.id, 
        reason: serviceCoreCancelService.reason, 
        authorType: serviceCoreCancelService.authorType, 
        notes: serviceCoreCancelService.notes
      },
      errorPolicy: 'all'
    });
  }


  private notify() {
    // Call next on the subject with the latest data
    this._serviceList.next(this.data);
  }

}
