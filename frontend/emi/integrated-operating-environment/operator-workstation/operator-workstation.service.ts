import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import {
  debounceTime, tap
} from 'rxjs/operators';
import { GatewayService } from '../../../../api/gateway.service';
import * as moment from 'moment';
import {
  ServiceClientSatellites,
} from '../gql/satellite.js';
import {
  IOERequestService, IOEServices, IOECancelService, IOEServiceSubscription
} from '../gql/ioe.js';


@Injectable()
export class OperatorWorkstationService {

  public static LAYOUT_HORIZONTAL_WITH_INBOX = 0;
  public static LAYOUT_VERTICAL_WITH_INBOX = 1;
  public static LAYOUT_NO_INBOX = 2;

  public static LAYOUT_COMMAND_SHOW_INBOX = 100;
  public static LAYOUT_COMMAND_HIDE_INBOX = 101;

  public static TOOLBAR_COMMAND_DATATABLE_FOCUS = 1000;
  public static TOOLBAR_COMMAND_DATATABLE_REFRESH = 1001;
  public static TOOLBAR_COMMAND_DATATABLE_CHANGE_PAGE = 1002;
  public static TOOLBAR_COMMAND_DATATABLE_CHANGE_PAGE_COUNT = 1003;
  public static TOOLBAR_COMMAND_DATATABLE_APPLY_SERVICE_FILTER = 1004;
  public static TOOLBAR_COMMAND_DATATABLE_APPLY_CHANNEL_FILTER = 1005;
  public static TOOLBAR_COMMAND_DATATABLE_SELECT_PREV_ROW = 1006;
  public static TOOLBAR_COMMAND_DATATABLE_SELECT_NEXT_ROW = 1007;
  public static TOOLBAR_COMMAND_DATATABLE_SEE_ALL_OPERATION_CHANGED = 1008;
  public static TOOLBAR_COMMAND_BUSINESS_UNIT_CHANGED = 1009;
  public static TOOLBAR_COMMAND_DATATABLE_CHANNELS_FILTER_CHANGED = 1010;
  public static TOOLBAR_COMMAND_DATATABLE_DUPLICATE_SERVICE= 1011;
  public static TOOLBAR_COMMAND_DATATABLE_SEARCHBAR_FILTER_CHANGED = 1012;

  public static TOOLBAR_COMMAND_SERVICE_CANCEL = 2001;
  public static TOOLBAR_COMMAND_SERVICE_ASSIGN = 2002;

  public static TOOLBAR_COMMAND_TOOLBAR_SET_MAX_PAGINATION = 3000;

  /**
   * layout dimension observable
   */
  layoutChanges$ = new BehaviorSubject(undefined);

  /**
   * layout dimension observable
   */
  requestServiceSubject$ = new Subject();
  /**
   * toolbar commands bus
   */
  toolbarCommands$ = new Subject();

  constructor(private gateway: GatewayService) {
  }


  /**
   * Publish layout change
   */
  // tslint:disable-next-line:max-line-length
  publishLayoutChange(type: number, toolbarWidth: number, toolbarHeight: number, datatableWidth: number, datatableHeight: number, inboxWidth?: number, inboxHeight?: number) {
    this.layoutChanges$.next(
      {
        layout: {
          type,
          toolbar: {
            width: toolbarWidth,
            height: toolbarHeight,
            visible: true,
          },
          datatable: {
            width: datatableWidth,
            height: datatableHeight,
            visible: true,
          },
          inbox: {
            width: inboxWidth,
            height: inboxHeight,
            visible: (inboxHeight && inboxWidth),
          },
          total: {
            width: toolbarWidth + datatableWidth + (inboxWidth && type === OperatorWorkstationService.LAYOUT_HORIZONTAL_WITH_INBOX ? inboxWidth : 0),
            height: toolbarHeight + datatableHeight + (inboxHeight && type === OperatorWorkstationService.LAYOUT_VERTICAL_WITH_INBOX ? inboxHeight : 0),
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
   * Queries client/satellites by keyword
   * @param clientText client key word
   * @param limit result count limit
   */
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
   * send a request service command to the server
   * @param IOERequest
   */
  requestService$(IOERequest: any) {
    return this.gateway.apollo
      .mutate<any>({
        mutation: IOERequestService,
        variables: {
          client: IOERequest.client,
          pickUp: IOERequest.pickUp,
          paymentType: IOERequest.paymentType,
          requestedFeatures: IOERequest.requestedFeatures,
          dropOff: IOERequest.dropOff,
          dropOffSpecialType: IOERequest.dropOffSpecialType,
          fareDiscount: IOERequest.fareDiscount,
          fare: IOERequest.fare,
          tip: IOERequest.tip,
          forced: IOERequest.forced,
          request: IOERequest.request
        },
        errorPolicy: 'all'
      });
  }

  /**
   * send a cancel service command to the server
   * @param IOECommand
   */
  cancelService$(IOECommand: any) {
    return this.gateway.apollo
      .mutate<any>({
        mutation: IOECancelService,
        variables: {
          id: IOECommand.id,
          reason: IOECommand.reason,
          authorType: IOECommand.authorType,
          notes: IOECommand.notes,
        },
        errorPolicy: 'all'
      });
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
  listenIOEService$(businessId, operatorId, statesFilter, channelsFilter, searchBar): Observable<any> {
    return this.gateway.apollo
      .subscribe({
        query: IOEServiceSubscription,
        variables: {
          businessId, operatorId, statesFilter, channelsFilter, searchBar
        }
      });
  }

}
