////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
  Input
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from '@angular/forms';

import { Router, ActivatedRoute } from '@angular/router';

////////// RXJS ///////////
import {
  map,
  mergeMap,
  switchMap,
  toArray,
  filter,
  tap,
  takeUntil,
  startWith,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs/operators';

import { Subject, from, of, forkJoin, Observable, concat, timer } from 'rxjs';

////////// ANGULAR MATERIAL //////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog
} from '@angular/material';
import { fuseAnimations } from '../../../../../core/animations';

//////////// i18n ////////////
import {
  TranslateService,
  LangChangeEvent,
  TranslationChangeEvent
} from '@ngx-translate/core';
import { locale as english } from '../../i18n/en';
import { locale as spanish } from '../../i18n/es';
import { FuseTranslationLoaderService } from '../../../../../core/services/translation-loader.service';

//////////// Other Services ////////////
import { KeycloakService } from 'keycloak-angular';
import { OperatorWorkstationService } from '../operator-workstation.service';
import { ToolbarService } from '../../../../toolbar/toolbar.service';
import { SelectionModel } from '@angular/cdk/collections';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class DatatableComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();
  // Subject to unsubscrtibe
  private ngUnsubscribeIOEServiceListener = new Subject();
  private loadingData = false;
  // current table max height
  tableHeight = 400;

  /*
  DATA TABLE VARS
  */
  // columns to display
  displayedColumns: string[] = ['state', 'creation_timestamp', 'client_name', 'pickup_addr', 'pickup_neig', 'vehicle_plate', 'eta', 'state_time_span'];
  // Partial data: this is what is displayed to the user
  partialData = [];
  // total data source
  totalData = [];
  // total RAW data source
  totalRawData = [];
  // service state filters
  serviceStateFilters = [];
  // factor to calucllates how many rows per display
  private paginationFactor = 1;
  // current page index
  private page = 0;
  // items per page
  private pageCount = 0;
  // current selected service id
  private selectedServiceId = undefined;
  selection = new SelectionModel(false, []);

  // current user roles
  userRoles = undefined;
  userDetails = undefined;
  // businessId = undefined;
  userId = undefined;

  // offer span in seconds
  offerSpan = 120;

  @Input('selectedBusinessId') selectedBusinessId: any;
  seeAllOperation = false;
  // used to togle background and font color
  toggleState = false;
  // delay Threshold
  delayThreshold = 60000 * 5; // five minutes


  constructor(
    private formBuilder: FormBuilder,
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private snackBar: MatSnackBar,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private keycloakService: KeycloakService,
    private operatorWorkstationService: OperatorWorkstationService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }


  async ngOnInit() {
    await this.queryUserSpecs();
    this.listenLayoutChanges();
    this.listenToolbarCommands();
    this.subscribeIOEServicesListener();
    await this.resetData();
    this.registerTimer();
  }


  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }


  /**
   * query current user roles
   */
  async queryUserSpecs() {
    this.userRoles = await this.keycloakService.getUserRoles(true);
    this.userDetails = await this.keycloakService.loadUserProfile();
    // this.businessId = this.userDetails.attributes.businessId[0];
    console.log('###$$$$$ ', this.userDetails.attributes);
    this.userId = this.userDetails.attributes.userId ? this.userDetails.attributes.userId[0]: undefined;
  }

  //#region LISTENERS
  /**
   * Listen layout (size and distribution) changes
   */
  listenLayoutChanges() {
    this.operatorWorkstationService.layoutChanges$.pipe(
      filter(e => e && e.layout),
      map(({ layout }) => layout),
      debounceTime(250),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      (layout) => {
        this.tableHeight = layout.datatable.height;
        this.pageCount = parseInt(`${(this.tableHeight / 30) * this.paginationFactor}`, 10);
        // console.log(`Layout = ${JSON.stringify(layout)}`);
        // console.log(`pageCount = ${this.pageCount}`);
        this.recalculatePartialData();
      },
      (error) => console.error(`DatatableComponent.listenLayoutChanges: Error => ${error}`),
      () => {
        // console.log(`DatatableComponent.listenLayoutChanges: Completed`)
      },
    );
  }

  /**
   * Listen commands send by the command bar
   */
  listenToolbarCommands() {
    this.operatorWorkstationService.toolbarCommands$.pipe(
      debounceTime(10),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      async ({ code, args }) => {
        switch (code) {
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_REFRESH:
            this.resetData();
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_APPLY_CHANNEL_FILTER:
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_APPLY_SERVICE_FILTER:
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_CHANGE_PAGE:
            if (this.page !== args.page) {
              this.page = args.page;
              await this.recalculatePartialData();
            }
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_CHANGE_PAGE_COUNT:
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_SERVICE_CANCEL:
            this.cancelSelectedTrip();
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_SERVICE_ASSIGN:
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_SELECT_PREV_ROW:
            this.selectPrevRow();
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_SELECT_NEXT_ROW:
            this.selectNextRow();
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_SEE_ALL_OPERATION_CHANGED:
            this.seeAllOperation = args[0];
            this.resetDataAndSubscriptions();
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_BUSINESS_UNIT_CHANGED:
            // console.log('TOOLBAR_COMMAND_BUSINESS_UNIT_CHANGED', args);
            this.selectedBusinessId = args[0];
            this.resetData();
            this.resetDataAndSubscriptions();            
            break;
        }
        // console.log({ code, args });
      },
      (error) => console.error(`DatatableComponent.listenToolbarCommands: Error => ${error}`),
      () => {
        console.log(`DatatableComponent.listenToolbarCommands: Completed`);
      },
    );
  }

  /**
   * Listen to real-time service changes
   */
  subscribeIOEServicesListener() {
    of(this.selectedBusinessId)
      .pipe(
        filter(selectedBusinessId => selectedBusinessId),
        mergeMap(() => this.operatorWorkstationService.listenIOEService$(this.selectedBusinessId, this.seeAllOperation ? null : this.userId )),
        map(subscription => subscription.data.IOEService),
        takeUntil(this.ngUnsubscribe),
        takeUntil(this.ngUnsubscribeIOEServiceListener)
      )
      .subscribe(
        (service: any) => {
          this.appendData(service);
        },
        (error) => console.error(`DatatableComponent.subscribeIOEServicesListener: Error => ${JSON.stringify(error)}`),
        () => {
          console.log(`DatatableComponent.subscribeIOEServicesListener: Completed`);
        },
      );
  }

  /**
   * Register a second by second timer available for multiple maintenance tasks
   */
  registerTimer() {
    timer(5000, 1000)
      .pipe(
        mergeMap(i => forkJoin(
          this.refreshTimeRelatedPartialData(),
          this.updateStylesVariablesForPartialData$()
        )),
        takeUntil(this.ngUnsubscribe),
      )
      .subscribe(
        (_: any) => { },
        (error) => console.error(`DatatableComponent.registerTimer: Error => ${JSON.stringify(error)}`),
        () => {
          console.log(`DatatableComponent.registerTimer: Completed`);
        },
      );
  }
  //#endregion

  /**
   * Loads the entire data from DB
   */
  async resetData() {
    this.totalRawData = this.selectedBusinessId ? await this.queryAllDataFromServer() : [];
    console.log('totalRawData.length ==> ', this.totalData.length );
    this.totalData = this.totalRawData.map(s => this.convertServiceToTableFormat(s));
    await this.recalculatePartialData();
  }

  /**
   * Adds (or removes in case of closing services) services
   * @param service
   */
  async appendData(service) {
    const oldDataIndex = this.totalRawData.findIndex(raw => raw.id === service.id);
    if (service.closed && oldDataIndex >= 0) {
      this.totalRawData.splice(oldDataIndex, 1);
    } else if (oldDataIndex >= 0) {
      this.totalRawData[oldDataIndex] = service;
    } else {
      this.totalRawData.unshift(service);
    }
    this.totalData = this.totalRawData.map(s => this.convertServiceToTableFormat(s));
    await this.recalculatePartialData();
  }

  /**
   * Recarlculate the data partial data (the visible part at the table)
   */
  async recalculatePartialData() {
    this.totalData.sort((s1, s2) => s2.timestamp < s1.timestamp ? 1 : 0);
    const filteredData = this.totalData.filter(s => this.serviceStateFilters.length === 0 ? true : this.serviceStateFilters.indexOf(s.state) !== -1);
    const skip = this.page * this.pageCount;
    this.partialData = filteredData.slice(skip, skip + this.pageCount).map(pd => ({ ...pd, selected: this.selectedServiceId === pd.id ? '>' : '', }));
    let maxPage = Math.floor(filteredData.length / this.pageCount);
    maxPage = (filteredData.length % this.pageCount !== 0) || (maxPage === 0) ? maxPage + 1 : maxPage;
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_TOOLBAR_SET_MAX_PAGINATION, args: { maxPage } });
  }


  /**
   * Queries bit by bit all the services from the server
   */
  async queryAllDataFromServer() {
    const data = [];
    let moreDataAvailable = true;
    let page = 0;
    while (moreDataAvailable) {
      console.log(`datatable.queryAllDataFromServer: nextPage=${page}`);
      const gqlResult = await this.operatorWorkstationService.queryServices$([], [], this.seeAllOperation, this.selectedBusinessId,  page++, 10, undefined).toPromise();
      if (gqlResult && gqlResult.data && gqlResult.data.IOEServices && gqlResult.data.IOEServices.length > 0) {
        data.push(...gqlResult.data.IOEServices);
      } else {
        moreDataAvailable = false;
      }
    }
    console.log(`datatable.queryAllDataFromServer: totalCount=${data.length}`);
    return data;
  }


  /**
   * Converts the service to the datatabke model
   * @param service
   */
  convertServiceToTableFormat(service) {
    const lastServiceVersion = this.partialData.find(e => e.id === service.id);
    const lastStateChange = service.stateChanges ? service.stateChanges.filter(pds => pds.state === service.state).pop() : undefined;

    return {
      selected: this.selectedServiceId === service.id ? '>' : '',
      id: service.id,
      state: service.state,
      style: lastServiceVersion ? lastServiceVersion.style : { state: {}, tTrans: {} },
      'creation_timestamp': service.timestamp,
      'client_name': service.client ? service.client.fullname : '-',
      'pickup_addr': service.pickUp ? service.pickUp.addressLine1 : '-',
      'pickup_neig': service.pickUp ? service.pickUp.neighborhood : '-',
      'vehicle_plate': service.vehicle ? service.vehicle.licensePlate : '-',
      eta: this.calcServiceEta(service),
      'state_time_span': this.calcServiceStateTimeSpan(service),
      'distance': 0.00,
      lastStateChangeTimeStamp: lastStateChange ?  lastStateChange.timestamp : undefined,
      serviceRef: service
    };
  }

  //#region TIME-RELATED DATE REFRESH
  refreshTimeRelatedPartialData() {
    return from(this.partialData).pipe(
      tap(pd => {
        pd.state_time_span = this.calcServiceStateTimeSpan(pd.serviceRef);
        pd.eta = this.calcServiceEta(pd.serviceRef);
      })
    );
  }

  updateStylesVariablesForPartialData$(){
    this.toggleState = !this.toggleState;
    return from(this.partialData)
    .pipe(
      tap(service => {
        const offerSpanPercentage = Math.floor((((Date.now() - service.lastStateChangeTimeStamp)/10)) / this.offerSpan);
        // (50 *100)/200 ==> 25%
        // (quiantity*100)/total = %

        switch (service.state) {
          case 'REQUESTED':
            if (offerSpanPercentage < 50) {
              service.style = {
                state: { bgColor: 'yellow', fontColor: 'black' },
                tTrans: { fontColor: 'black' }
              }
            } else if (offerSpanPercentage > 50) {
              service.style = {
                state: { 
                  bgColor: this.toggleState ? 'yellow' : 'white',
                  fontColor: this.toggleState ? 'red' : 'black',
                  fontBold: true
                },
                tTrans: { fontColor: 'red' }
              }
            }
            break;

          case 'CANCELLED_SYSTEM':
            if (offerSpanPercentage < 25) { // APROX 30 seconds
              service.style = {
                state: {
                  bgColor: this.toggleState ? 'red' : 'white',
                  fontColor: this.toggleState ? 'black' : 'red',
                  fontBold: true
                },
                tTrans: { fontColor: 'red' }
              }
            } else {
              service.style = {
                state: { bgColor: 'white', fontColor: 'red' },
                tTrans: { }
              }            
            }
            break;

          case 'ASSIGNED':
            const etaTime = service.serviceRef.pickUpETA;
            if ( !etaTime || etaTime && Date.now() < etaTime) {
              service.style = {
                state: { bgColor: 'green', fontColor: 'black' },
                tTrans: {}
              }
            } else if (etaTime && Date.now() < (etaTime + this.delayThreshold)) {
              service.style = {
                state: { bgColor: 'red', fontColor: 'black' },
                tTrans: {}
              }
            }
            else if (etaTime && Date.now() > (etaTime + this.delayThreshold)) {
              service.style = {
                state: { 
                  bgColor: this.toggleState ? 'red' : 'white',
                  fontColor: this.toggleState ? 'black' : 'red',
                  fontBold: true
                },
                tTrans: {}
              }
            }
            break;

          case 'CANCELLED_OPERATOR':
            service.style = {
              state: { bgColor: 'white', fontColor: 'red' },
              tTrans: {}
            }
            break;

          case 'CANCELLED_DRIVER':
            service.style = {
              state: { bgColor: 'white', fontColor: 'red' },
              tTrans: {}
            }
            break;
          case 'CANCELLED_CLIENT':
            service.style = {
              state: { bgColor: 'white', fontColor: 'red' },
              tTrans: {}
            }
            break;

          default:
            service.style = { state: {}, tTrans: {} }
            break;
        }

      })
    )
  }

  calcServiceStateTimeSpan(service) {
    const latestState = service.stateChanges ? service.stateChanges.filter(pds => pds.state === service.state).pop() : undefined;
    if (latestState) {
      const diff = Date.now() - latestState.timestamp;
      const minutes = Math.floor(diff / 60000);
      const seconds = ((diff % 60000) / 1000).toFixed(0);
      return `${minutes > 9 ? minutes : '0' + minutes}m${seconds.length > 1 ? seconds : '0' + seconds}s`;
    } else {
      return '---';
    }
  }

  calcServiceEta(service) {
    if (!service.pickUpETA || service.state === 'DONE' || service.state.includes('CANCELLED') ) {
      return '---';
    }
    

    let diff = service.pickUpETA ? service.pickUpETA - Date.now() : 0;
    diff = (diff !== null && diff < 0) ? 0 : diff;

    const minutes = Math.floor(diff / 60000);
    const seconds = ((diff % 60000) / 1000).toFixed(0);
    return `${minutes > 9 ? minutes : '0' + minutes}m${seconds.length > 1 ? seconds : '0' + seconds}s`;
  }

  //#endregion


  //#region SERVICE ACTIONS

  /**
   * Cancel selected service
   */
  cancelSelectedTrip() {
    const selectedRow = this.getSelectedRow();
    // console.log(selectedRow);
    if (selectedRow) {
      this.operatorWorkstationService.cancelService$({ id: selectedRow.id, reason: 'OTHER', notes: '', authorType: 'OPERATOR' }).subscribe(
        (results) => {
          console.log(`DatatableComponent.cancelService = ${results}`);
        },
        (error) => {
          console.error(`DatatableComponent.cancelService: Error => ${error}`);
          this.loadingData = false;
        },
        () => {
          // console.log(`DatatableComponent.cancelService: Completed`)
          this.loadingData = false;
        },
      );
    }

  }

  //#endregion

  //#region ROW + PAGE SELECTION


  selectNextRow() {
    if (this.partialData.length === 0) {
      return;
    }
    const currenSelectedIndex = this.partialData.findIndex(s => s.id === this.selectedServiceId);
    if (currenSelectedIndex === -1) {
      this.selectedServiceId = this.partialData[0].id;
    } else {
      if (currenSelectedIndex >= this.partialData.length - 1) {
        this.selectedServiceId = this.partialData[this.partialData.length - 1].id;
      } else {
        this.selectedServiceId = this.partialData[currenSelectedIndex + 1].id;
      }
    }
    this.partialData = this.partialData.map(pd => ({ ...pd, selected: this.selectedServiceId === pd.id ? '>' : '', }));
  }
  selectPrevRow() {
    if (this.partialData.length === 0) {
      return;
    }
    const currenSelectedIndex = this.partialData.findIndex(s => s.id === this.selectedServiceId);
    if (currenSelectedIndex <= 0) {
      this.selectedServiceId = this.partialData[0].id;
    } else {
      this.selectedServiceId = this.partialData[currenSelectedIndex - 1].id;
    }
    this.partialData = this.partialData.map(pd => ({ ...pd, selected: this.selectedServiceId === pd.id ? '>' : '', }));
  }
  async selectPrevPage() {
    if (this.page <= 0) {
      return;
    }
    this.page--;
    await this.recalculatePartialData();
  }
  async selectNextPage() {
    this.page++;
    await this.recalculatePartialData();
  }


  getSelectedRow() {
    // const currenSelectedIndex = this.partialData.findIndex(s => s.id === this.selectedServiceId);
    // return currenSelectedIndex === -1 ? undefined : this.partialData[currenSelectedIndex];
    return this.partialData.find(s => s.id === this.selectedServiceId);
  }

  onRowSelected(serviceRow){
    console.log(serviceRow);
    this.selectedServiceId = serviceRow.serviceRef.id;
    this.partialData = this.partialData.map(pd => ({ ...pd, selected: this.selectedServiceId === pd.id ? '>' : '', }));
  }

  resetDataAndSubscriptions(){
    this.ngUnsubscribeIOEServiceListener.next();
    this.resetData();
    if (this.selectedBusinessId) { this.subscribeIOEServicesListener(); }    
  }
  //#endregion


}
