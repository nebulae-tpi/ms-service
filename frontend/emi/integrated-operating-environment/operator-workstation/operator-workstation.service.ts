import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import {
  debounceTime
} from 'rxjs/operators';
import { GatewayService } from '../../../../api/gateway.service';
import * as moment from 'moment';
import {
  ServiceClientSatellites,
} from '../gql/satellite.js';


@Injectable()
export class OperatorWorkstationService {

  public static LAYOUT_HORIZONTAL_WITH_INBOX = 0;
  public static LAYOUT_VERTICAL_WITH_INBOX = 1;
  public static LAYOUT_NO_INBOX = 2;

  public static LAYOUT_COMMAND_SHOW_INBOX = 100;
  public static LAYOUT_COMMAND_HIDE_INBOX = 101;

  /**
   * layout dimension observable
   */
  layoutChanges$ = new BehaviorSubject(undefined);

  constructor(private gateway: GatewayService) {
  }


  /**
   * Publish layout change
   */
  publishLayoutChange(type: number, toolbarWidth: number, toolbarHeight: number, datatableWidth: number, datatableHeight: number, inboxWidth: number = undefined, inboxHeight: number = undefined) {
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



}
