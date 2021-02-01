import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import {
  debounceTime
} from 'rxjs/operators';
import { GatewayService } from '../../../../api/gateway.service';
import * as moment from 'moment';
import {
  IOEServices, IOEServiceSubscription,
  IOEShifts, IOEShiftSubscription,
} from '../gql/ioe.js';


@Injectable()
export class GodsEyeService {

  public static LAYOUT_HORIZONTAL_WITH_STATS = 0;
  public static LAYOUT_VERTICAL_WITH_STATS = 1;
  public static LAYOUT_NO_STATS = 2;

  public static LAYOUT_COMMAND_SHOW_STATS = 100;
  public static LAYOUT_COMMAND_HIDE_STATS = 101;

  public static TOOLBAR_COMMAND_MAP_FOCUS = 1000;
  public static TOOLBAR_COMMAND_MAP_REFRESH = 1001;
  public static TOOLBAR_COMMAND_MAP_CHANGE_ZOOM = 1002;

  public static TOOLBAR_COMMAND_MAP_APPLY_SERVICE_FILTER = 1004;
  public static TOOLBAR_COMMAND_MAP_APPLY_CHANNEL_FILTER = 1005;
  public static TOOLBAR_COMMAND_MAP_SEE_ALL_OPERATION_CHANGED = 1008;
  public static TOOLBAR_COMMAND_BUSINESS_UNIT_CHANGED = 1009;
  public static TOOLBAR_COMMAND_MAP_SEARCH_SHIFT = 1010;

  public static TOOLBAR_COMMAND_TOOLBAR_SET_ZOOM = 3000;

  public static STATS_COMMAND_UPDATE_SHIFTS = 4001;
  public static STATS_COMMAND_UPDATE_SERVICES = 4002;

  /**
   * layout dimension observable
   */
  layoutChanges$ = new BehaviorSubject(undefined);
  /**
   * toolbar commands bus
   */
  toolbarCommands$ = new Subject();
  /**
   * stats commands bus
   */
  statsCommands$ = new Subject<any>();

  constructor(private gateway: GatewayService) {
  }


  /**
   * Publish layout change
   */
  // tslint:disable-next-line:max-line-length
  publishLayoutChange(type: number, toolbarWidth: number, toolbarHeight: number, mapWidth: number, mapHeight: number, statsWidth?: number, statsHeight?: number) {
    this.layoutChanges$.next(
      {
        layout: {
          type,
          toolbar: {
            width: toolbarWidth,
            height: toolbarHeight,
            visible: true,
          },
          map: {
            width: mapWidth,
            height: mapHeight,
            visible: true,
          },
          stats: {
            width: statsWidth,
            height: statsHeight,
            visible: (statsHeight && statsWidth),
          },
          total: {
            width: toolbarWidth + mapWidth + (statsWidth && type === GodsEyeService.LAYOUT_HORIZONTAL_WITH_STATS ? statsWidth : 0),
            height: toolbarHeight + mapHeight + (statsHeight && type === GodsEyeService.LAYOUT_VERTICAL_WITH_STATS ? statsHeight : 0),
          }
        }
      });
  }

  /**
   * Publish layout change
   */
  publishLayoutCommand(command) {
    this.layoutChanges$.next({ command });
  }


  /**
   * Publish toolbar command
   */
  publishToolbarCommand(command) {
    this.toolbarCommands$.next(command);
  }

  /**
   * Publish toolbar command
   */
  publishStatsCommand(command) {
    this.statsCommands$.next(command);
  }



  /**
   * Query all services filtered
   * @param IOERequest
   */
  queryServices$(serviceStatesFilter, serviceChannelsFilter, viewAllOperators, businessId, page, pageCount, monthsToAdd, projections) {
    return this.gateway.apollo
      .query<any>({
        query: IOEServices,
        variables: {
          serviceStatesFilter, serviceChannelsFilter, viewAllOperators, businessId, page, pageCount, monthsToAdd, projections
        },
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
      });
  }

  /**
   * Event triggered when a business is created, updated or deleted.
   */
  listenIOEService$(businessId, operatorId, statesFilter, channelsFilter): Observable<any> {
    return this.gateway.apollo
      .subscribe({
        query: IOEServiceSubscription,
        variables: {
          businessId, operatorId, statesFilter, channelsFilter
        }
      });
  }

  /**
   * Query all services filtered
   * @param IOERequest
   */
  queryShifts$(shiftStatesFilter, businessId, page, pageCount, monthsToAdd, projections) {
    return this.gateway.apollo
      .query<any>({
        query: IOEShifts,
        variables: {
          shiftStatesFilter, businessId, page, pageCount, monthsToAdd, projections
        },
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
      });
  }

  /**
   * Event triggered when a business is created, updated or deleted.
   */
  listenIOEShift$(businessId): Observable<any> {
    return this.gateway.apollo
      .subscribe({
        query: IOEShiftSubscription,
        variables: {
          businessId
        }
      });
  }

}
