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
  bufferTime,
  throttleTime,
  catchError
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
import { ForceServiceDialogComponent } from '../force-service-dialog/force-service.component';

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

  private duplicateServiceSubject = new Subject();
  // Subject to unsubscrtibe
  private ngUnsubscribeIOEServiceListener = new Subject();
  private loadingData = false;
  // current table max height
  tableHeight = 400;

  /*
  DATA TABLE VARS
  */
  // columns to display
  displayedColumns: string[] = ['state', 'creation_timestamp', 'client_name', 'driverDocumentId', 'pickup_addr', 'pickup_neig', 'vehicle_plate', 'eta', 'state_time_span'];
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
  // selected filters to filter services
  channelsFilter: String[] = ['OPERATOR'];

  searchBar: String;
  // selected state filters
  statesFilter: String[] = [];
  //last cancelled Service command
  lastCancelledService: { id: string, time: number } = null;


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
    this.listenServiceRequests();
    this.listenToolbarCommands();
    await this.resetData();
    this.subscribeIOEServicesListener();
    this.registerTimer();
    this.duplicateServiceSubject
      .pipe(
        throttleTime(3000),
        mergeMap(ioeRequestServiceData => {
          return this.operatorWorkstationService.requestService$(ioeRequestServiceData)
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(
        (result: any) => {
          this.showMessageSnackbar('SERVICES.DUPLICATE_SERVICE_MSG');
        },
        error => {
          this.showMessageSnackbar('SERVICES.ERROR_OPERATION');
        }
      );
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
    this.userId = this.userDetails.attributes.userId ? this.userDetails.attributes.userId[0] : undefined;
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

  listenServiceRequests() {
    this.operatorWorkstationService.requestServiceSubject$.pipe(
      filter(s => ((s as any) || {}).request),
      mergeMap(ioeRequest => {
        return this.operatorWorkstationService.requestService$(ioeRequest).pipe(
          mergeMap(result => {
            if (result.data && result.data.IOERequestService && result.data.IOERequestService.accepted) {
              this.showMessageSnackbar('SERVICES.REQUEST_SERVICE_SUCCESS');
            }
            const errorMessage = (result.errors || [])[0];
            if (errorMessage && (errorMessage.extensions || {}).code === 23212) {
              this.showConfirmationDialog$("El cliente actualmente tiene solicitado un servicio por el operador " + errorMessage.message.split("===>")[1] + ".\n¿Desea solicitar el servicio duplicado?", "Servicio Duplicado").pipe(
                mergeMap(() => this.operatorWorkstationService.requestService$({ ...ioeRequest, forced: true })),
              ).subscribe(() => { })
            }
            return of(undefined)
          })
        )
      }),
      takeUntil(this.ngUnsubscribe),
    ).subscribe(
      (result: any) => {
      },
      error => {
        this.listenServiceRequests();
        this.showMessageSnackbar('SERVICES.ERROR_OPERATION');
      }
    );
  }

  showConfirmationDialog$(dialogMessage, dialogTitle) {
    return this.dialog
      // Opens confirm dialog
      .open(ForceServiceDialogComponent, {
        data: {
          dialogMessage,
          dialogTitle
        }
      })
      .afterClosed()
      .pipe(
        filter(okButton => okButton),
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
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_DUPLICATE_SERVICE:
            this.duplicateService();
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
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_CHANNELS_FILTER_CHANGED:
            this.channelsFilter = args[0];
            this.resetDataAndSubscriptions();
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_SEARCHBAR_FILTER_CHANGED:
            console.log("ARGS ===> ", args)
            this.searchBar = args;
            this.resetDataAndSubscriptionsSearchBar();
            break;

          case OperatorWorkstationService.TOOLBAR_COMMAND_BUSINESS_UNIT_CHANGED:
            // console.log('TOOLBAR_COMMAND_BUSINESS_UNIT_CHANGED', args);
            this.selectedBusinessId = args[0];
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
    console.log(`subscribeIOEServicesListener: ${this.selectedBusinessId}, ${this.seeAllOperation} ? null : ${this.userId}, ${this.statesFilter}, ${this.channelsFilter} `);
    of(this.selectedBusinessId)
      .pipe(
        filter(selectedBusinessId => selectedBusinessId),
        mergeMap(() => this.operatorWorkstationService.listenIOEService$(this.selectedBusinessId, this.seeAllOperation ? null : this.userId, this.statesFilter, this.channelsFilter, this.searchBar )),
        map(subscription => subscription.data.IOEService),
        bufferTime(1000, 1000),
        takeUntil(this.ngUnsubscribe),
        takeUntil(this.ngUnsubscribeIOEServiceListener)
      )
      .subscribe(
        (services: any) => {
          services.forEach(s => {
            if (s.state === "CANCELLED_OPERATOR" && (s.client || {}).clientId) {
              console.log("SERVICIO CANCELADO ====> ", { client: s.client.fullname, id: s.id })
            }
          });
          this.appendData(services);
        },
        (error) => console.error(`DatatableComponent.subscribeIOEServicesListener: Error => ${JSON.stringify(error)}`),
        () => { },
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

    const today = new Date();
    const explorePastMonth = today.getDate() <= 1;
    console.log(`Current Date: date=${today.getDate()}, hours=${today.getHours()}, explorePastMonth=${explorePastMonth}`);

    this.totalRawData = this.selectedBusinessId ? await this.queryAllDataFromServer(0) : [];
    if (explorePastMonth) {
      const pastMonthTotalRawData = this.selectedBusinessId ? await this.queryAllDataFromServer(-1) : [];
      this.totalRawData = this.totalRawData.concat(pastMonthTotalRawData);
    }

    this.totalData = this.totalRawData.map(s => this.convertServiceToTableFormat(s));
    await this.recalculatePartialData();
  }

  /**
   * Adds (or removes in case of closing services) services
   * @param service
   */
  async appendData(services) {
    if (services.length <= 0) return;

    let additions = 0;
    let deletions = 0;
    let updates = 0;
    let uhm = 0;
    for (let service of services) {
      const oldDataIndex = this.totalRawData.findIndex(raw => raw.id === service.id);
      if (service.closed) {
        if (oldDataIndex >= 0) {
          this.totalRawData.splice(oldDataIndex, 1);
          deletions++;
        } else {
          uhm++;
        }
      } else if (oldDataIndex >= 0) {
        this.totalRawData[oldDataIndex] = service;
        updates++;
      } else {
        this.totalRawData.unshift(service);
        additions++
      }
    }
    //console.log(`evts:${services.length}, adds:${additions}, del:${deletions}, upd:${updates} uhm:${uhm}`);
    this.totalData = this.totalRawData
    .map(s => this.convertServiceToTableFormat(s))
    .filter(t => !this.searchBar || this.searchBar === "" || t.vehicle_plate.includes(this.searchBar) || t.client_name.includes(this.searchBar));;
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
  async queryAllDataFromServer(monthsToAdd = 0) {
    const data = [];
    let moreDataAvailable = true;
    let page = 0;
    while (moreDataAvailable) {
      console.log(`datatable.queryAllDataFromServer: nextPage=${page}`);
      const gqlResult = await this.operatorWorkstationService.queryServices$([], this.channelsFilter, this.seeAllOperation, this.selectedBusinessId, page++, 10, monthsToAdd, undefined).toPromise();
      if (gqlResult && gqlResult.data && gqlResult.data.IOEServices && gqlResult.data.IOEServices.length > 0) {
        const res = gqlResult.data.IOEServices
        if(this.searchBar && this.searchBar !== ""){
          data.push(...res.filter(s => (((s.vehicle || {}).licencePlate) || "").includes(this.searchBar) || (((s.client || {}).fullname) || "").includes(this.searchBar) ));
        }
        else {
          data.push(...res);
        }
      }
      moreDataAvailable = (gqlResult && gqlResult.data && gqlResult.data.IOEServices && gqlResult.data.IOEServices.length == 10);
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
      driverDocumentId: service.driver ? service.driver.documentId : '---',
      'client_name': service.client ? service.client.fullname : '-',
      'pickup_addr': service.pickUp ? service.pickUp.addressLine1 : '-',
      'pickup_neig': service.pickUp ? service.pickUp.neighborhood : '-',
      'vehicle_plate': service.vehicle ? service.vehicle.licensePlate : '-',
      eta: this.calcServiceEta(service),
      'state_time_span': this.calcServiceStateTimeSpan(service),
      'distance': 0.00,
      lastStateChangeTimeStamp: lastStateChange ? lastStateChange.timestamp : undefined,
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

  updateStylesVariablesForPartialData$() {
    this.toggleState = !this.toggleState;
    return from(this.partialData)
      .pipe(
        tap(service => {
          const offerSpanPercentage = Math.floor((((Date.now() - service.lastStateChangeTimeStamp) / 10)) / this.offerSpan);
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
                  tTrans: {}
                }
              }
              break;

            case 'ASSIGNED':
              const etaTime = service.serviceRef.pickUpETA;
              if (!etaTime || etaTime && Date.now() < etaTime) {
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
    if (!service.pickUpETA || service.state !== 'ASSIGNED') {
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

  duplicateService() {
    const selectedRow = this.getSelectedRow();
    if (selectedRow) {
      let rawRequest = {
        client: { ...selectedRow.serviceRef.client, __typename: undefined, businessId: undefined, clientId: undefined, id: (selectedRow.serviceRef.client || {}).id },
        pickUp: { ...selectedRow.serviceRef.pickUp, __typename: undefined, marker: { ...selectedRow.serviceRef.pickUp.marker, __typename: undefined } },
        paymentType: 'CASH',
        requestedFeatures: (selectedRow.serviceRef.requestedFeatures || []),
        dropOff: null,
        // dropOffSpecialType: destinationOptionsGroup,
        fareDiscount: selectedRow.serviceRef.fareDiscount,
        request: {
          sourceChannel: 'OPERATOR',
          destChannel: 'DRIVER_APP',
        }
      };
      this.duplicateServiceSubject.next(rawRequest);
    }

  }


  requestService({ client, destinationOptionsGroup, featureOptionsGroup, paymentType = 'CASH', tip, fare, fareDiscount }) {

    const ioeRequest = {
      client: {
        id: client._id,
        fullname: client.generalInfo.name,
        username: client.auth ? client.auth.username : null,
        tip,
        referrerDriverDocumentId: client.satelliteInfo ? client.satelliteInfo.referrerDriverDocumentId : null,
        offerMinDistance: client.satelliteInfo ? client.satelliteInfo.offerMinDistance : null,
        offerMaxDistance: client.satelliteInfo ? client.satelliteInfo.offerMaxDistance : null,
      },
      pickUp: {
        marker: {
          lat: client.location.lat,
          lng: client.location.lng,
        },
        polygon: null,
        city: client.generalInfo.city,
        zone: client.generalInfo.zone,
        unaccurateLocation: client.generalInfo.unaccurateLocation,
        neighborhood: client.generalInfo.neighborhood,
        addressLine1: client.generalInfo.addressLine1,
        addressLine2: client.generalInfo.addressLine2,
        notes: client.generalInfo.notes
      },
      paymentType,
      requestedFeatures: featureOptionsGroup,
      dropOff: null,
      // dropOffSpecialType: destinationOptionsGroup,
      fareDiscount,
      fare,
      tip,
      request: {
        sourceChannel: 'OPERATOR',
        destChannel: 'DRIVER_APP',
      }
    }
    return this.operatorWorkstationService.requestService$(ioeRequest)
      .pipe(
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(
        (result: any) => {
          if (result.data && result.data.IOERequestService && result.data.IOERequestService.accepted) {
            this.showMessageSnackbar('SERVICES.REQUEST_SERVICE_SUCCESS');
          }
        },
        error => {
          this.showMessageSnackbar('SERVICES.ERROR_OPERATION');
          console.log('Error ==> ', error);
        }
      );
  }

  /**
   * Cancel selected service
   */
  cancelSelectedTrip() {
    const selectedRow = this.getSelectedRow();
    if (this.lastCancelledService && this.lastCancelledService.id === selectedRow.id && (this.lastCancelledService.time + 5000) > Date.now()) {
      return;
    }
    if (selectedRow && selectedRow.state.includes('CANCELLED')) {
      this.showMessageSnackbar('ERRORS.4')
      return;
    }
    if (selectedRow) {
      this.lastCancelledService = { id: selectedRow.id, time: Date.now() };
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

  onRowSelected(serviceRow) {
    this.selectedServiceId = serviceRow.serviceRef.id;
    this.partialData = this.partialData.map(pd => ({ ...pd, selected: this.selectedServiceId === pd.id ? '>' : '', }));
  }

  async resetDataAndSubscriptions() {
    this.ngUnsubscribeIOEServiceListener.next();
    await this.resetData();
    console.log(this.selectedBusinessId);
    if (this.selectedBusinessId) { this.subscribeIOEServicesListener(); }
  }

  async resetDataAndSubscriptionsSearchBar() {
    this.ngUnsubscribeIOEServiceListener.next();
    
    this.totalData = this.totalData.filter(t => (t.vehicle_plate || "").toUpperCase().includes((this.searchBar || "").toUpperCase()) || (t.client_name || "").toUpperCase().includes((this.searchBar || "").toUpperCase()));
    await this.recalculatePartialData();

    if (this.selectedBusinessId) { this.subscribeIOEServicesListener(); }
  }
  //#endregion

  /**
   * Shows a message snackbar on the bottom of the page
   * @param messageKey Key of the message to i18n
   * @param detailMessageKey Key of the detail message to i18n
   */
  showMessageSnackbar(messageKey, detailMessageKey?) {
    const translationData = [];
    if (messageKey) {
      translationData.push(messageKey);
    }

    if (detailMessageKey) {
      translationData.push(detailMessageKey);
    }

    this.translate.get(translationData).subscribe(data => {
      this.snackBar.open(
        messageKey ? data[messageKey] : '',
        detailMessageKey ? data[detailMessageKey] : '',
        {
          duration: 5000
        }
      );
    });
  }


}
