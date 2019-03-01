import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { startWith,  tap, mergeMap } from 'rxjs/operators';
import { GatewayService } from '../../../../api/gateway.service';
import {
  ServiceShift,
  ServiceShiftStateChangesList,
  ServiceShiftStateChangesListSize,
  ServiceShiftOnlineChangesList,
  ServiceShiftOnlineChangesListSize
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

  getStateChangesList$(id: string, paginator: any ){
    //console.log("PAginator => ", paginator);
    return this.gateway.apollo.query<any>({
      query: ServiceShiftStateChangesList,
      variables: {
        id: id,
        paginationInput: paginator.pagination
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });
  }

  getStateChangesListSize$(id: string){
    return this.gateway.apollo.query<any>({
      query: ServiceShiftStateChangesListSize,
      variables: {
        id: id
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });
  }

  getOnlineChangesList$(id: string, paginator: any ){
    return this.gateway.apollo.query<any>({
      query: ServiceShiftOnlineChangesList,
      variables: {
        id: id,
        paginationInput: paginator.pagination
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });
  }

  getOnlineChangesListSize$(id: string){
    return this.gateway.apollo.query<any>({
      query: ServiceShiftOnlineChangesListSize,
      variables: {
        id: id
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    });
  }


}
