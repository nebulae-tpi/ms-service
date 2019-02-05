import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from "rxjs";
import {
  startWith
} from "rxjs/operators";
import { GatewayService } from '../../../../api/gateway.service';
import {
} from '../gql/satellite';
import * as moment from "moment";

@Injectable()
export class SatelliteViewService {

  private _filterSubject$ = new BehaviorSubject({
      initTimestamp: moment().startOf('month'),
      endTimestamp: moment().endOf('day')
  });

  private _paginatorSubject$ = new BehaviorSubject({
    pagination: {
      page: 0, count: 10, sort: -1
    },
  });

  constructor(private gateway: GatewayService) {

  }


  /**
   * Emits an event when the filter is modified
   * @returns {Observable<any>}
   */
  get filter$(): Observable<any> {
    return this._filterSubject$.asObservable()
  }

  /**
   * Emits an event when the paginator is modified
   * @returns {Observable<any>}
   */
  get paginator$(): Observable<any> {
    return this._paginatorSubject$.asObservable()
  }

  updateFilterData(filterData){
    console.log('filterData -->> ', filterData);
    this._filterSubject$.next(filterData);
  }

  updatePaginatorData(paginatorData){
    this._paginatorSubject$.next(paginatorData);
  }

}
