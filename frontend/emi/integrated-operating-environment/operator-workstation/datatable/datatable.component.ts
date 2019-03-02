////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener
} from "@angular/core";

import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from "@angular/forms";

import { Router, ActivatedRoute } from "@angular/router";

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
} from "rxjs/operators";

import { Subject, fromEvent, of, forkJoin, Observable, concat, combineLatest } from "rxjs";

////////// ANGULAR MATERIAL //////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog
} from "@angular/material";
import { fuseAnimations } from "../../../../../core/animations";

//////////// i18n ////////////
import {
  TranslateService,
  LangChangeEvent,
  TranslationChangeEvent
} from "@ngx-translate/core";
import { locale as english } from "../../i18n/en";
import { locale as spanish } from "../../i18n/es";
import { FuseTranslationLoaderService } from "../../../../../core/services/translation-loader.service";


import * as moment from "moment";

//////////// Other Services ////////////
import { KeycloakService } from "keycloak-angular";
import { OperatorWorkstationService } from '../operator-workstation.service';
import { ToolbarService } from "../../../../toolbar/toolbar.service";
import { SelectionModel } from "@angular/cdk/collections";
import { from } from "zen-observable";

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class DatatableComponent implements OnInit, OnDestroy {
  //Subject to unsubscribe 
  private ngUnsubscribe = new Subject();
  private loadingData = false;
  //current table max height
  tableHeight: number = 400;

  /*
  DATA TABLE VARS
  */
  // columns to display
  displayedColumns: string[] = ['state', 'creation_timestamp', 'client_name', 'pickup_addr', 'pickup_neig', 'vehicle_plate', 'eta'];//'state_time_span'
  //Partial data: this is what is displayed to the user
  partialData = [];
  //total data source
  totalData = [];
  //total RAW data source
  totalRawData = [];
  //service state filters
  serviceStateFilters = [];
  //factor to calucllates how many rows per display
  private paginationFactor = 1;
  //current page index
  private page = 0;
  //items per page
  private pageCount = 0;
  //current selected service id
  private selectedServiceId = undefined;



  selection = new SelectionModel(false, []);

  //current user roles
  userRoles = undefined
  userDetails = undefined
  businessId = undefined
  userId = undefined


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
    this.businessId = this.userDetails.attributes.businessId[0];
    this.userId = this.userDetails.attributes.userId[0];
  }

  //#region LISTENERS
  listenLayoutChanges() {
    this.operatorWorkstationService.layoutChanges$.pipe(
      filter(e => e && e.layout),
      map(({ layout }) => layout),
      debounceTime(250),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      (layout) => {
        this.tableHeight = layout.datatable.height;
        this.pageCount = parseInt(`${(this.tableHeight / 30) * this.paginationFactor}`)
        console.log(`Layout = ${JSON.stringify(layout)}`);
        console.log(`pageCount = ${this.pageCount}`);
        this.recalculatePartialData();
      },
      (error) => console.error(`DatatableComponent.listenLayoutChanges: Error => ${error}`),
      () => console.log(`DatatableComponent.listenLayoutChanges: Completed`),
    );
  }

  listenToolbarCommands() {
    this.operatorWorkstationService.toolbarCommands$.pipe(
      //filter(e => e),
      debounceTime(250),
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
            this.page = args.page;
            await this.recalculatePartialData();
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_CHANGE_PAGE_COUNT:
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_SERVICE_CANCEL:
            this.cancelSelectedTrip();
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_SERVICE_ASSIGN:
            break;
        }
        console.log({ code, args });
      },
      (error) => console.error(`DatatableComponent.listenToolbarCommands: Error => ${error}`),
      () => console.log(`DatatableComponent.listenToolbarCommands: Completed`),
    );
  }

  subscribeIOEServicesListener() {
    this.operatorWorkstationService.listenIOEService$(this.businessId, this.userId)
      .pipe(
        map(subscription => subscription.data.IOEService),
        takeUntil(this.ngUnsubscribe),
      )
      .subscribe(
        (service: any) => {
          this.appendData(service);
        },
        (error) => console.error(`DatatableComponent.subscribeIOEServicesListener: Error => ${JSON.stringify(error)}`),
        () => console.log(`DatatableComponent.subscribeIOEServicesListener: Completed`),
      );
  }
  //#endregion

  async resetData() {
    this.totalRawData = await this.queryAllDataFromServer();
    this.totalData = this.totalRawData.map(s => this.convertServiceToTableFormat(s));
    await this.recalculatePartialData();
  }

  async appendData(service) {
    console.log(`SERVICE => ${service.state}`);

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

  async recalculatePartialData() {
    this.totalData.sort((s1, s2) => { return s2.timestamp < s1.timestamp ? 1 : 0 });
    const filteredData = this.totalData.filter(s => this.serviceStateFilters.length === 0 ? true : this.serviceStateFilters.indexOf(s.state) !== -1);
    const skip = this.page * this.pageCount;
    this.partialData = filteredData.slice(skip, skip + this.pageCount);
    // console.log(this.partialData.map(x => x.state))
  }


  async queryAllDataFromServer() {
    const data = [];
    let moreDataAvailable = true;
    let page = 0;
    while (moreDataAvailable) {
      console.log(`datatable.queryAllDataFromServer: nextPage=${page}`);
      const gqlResult = await this.operatorWorkstationService.queryServices$([], [], false, page++, 10, undefined).toPromise();
      if (gqlResult && gqlResult.data && gqlResult.data.IOEServices && gqlResult.data.IOEServices.length > 0) {
        data.push(...gqlResult.data.IOEServices);
      } else {
        moreDataAvailable = false;
      }
    }
    console.log(`datatable.queryAllDataFromServer: totalCount=${data.length}`);
    return data;
  }


  convertServiceToTableFormat({ id, state, timestamp, client, pickUp, pickUpETA, vehicle, driver }) {
    let eta = pickUpETA ? Math.floor((pickUpETA - Date.now()) / 60000) : null;
    eta = (eta !== null && eta < 0) ? 0 : eta;
    return {
      selected: this.selectedServiceId === id ? ">" : "",
      id,
      state,
      'creation_timestamp': timestamp,
      'client_name': client.fullname,
      'pickup_addr': pickUp.addressLine1,
      'pickup_neig': pickUp.neighborhood,
      'vehicle_plate': vehicle.licensePlate,
      eta,
      'state_time_span': '00:00:00',
      'distance': 0.00
    };
  }


  //#region SERVICE ACTIONS

  cancelSelectedTrip() {
    const selectedRow = this.getSelectedRow();
    console.log(selectedRow);
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
          console.log(`DatatableComponent.cancelService: Completed`)
          this.loadingData = false;
        },
      );
    }

  }

  //#endregion

  //#region ROW + PAGE SELECTION
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    console.log(event.key);
    switch (event.key) {
      case 'ArrowUp':
        this.selectPrevRow();
        break;
      case 'ArrowDown':
        this.selectNextRow();
        break;
    }
  }

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
    this.partialData = this.partialData.map(pd => ({ ...pd, selected: this.selectedServiceId === pd.id ? ">" : "", }));
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
    this.partialData = this.partialData.map(pd => ({ ...pd, selected: this.selectedServiceId === pd.id ? ">" : "", }));
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
    const currenSelectedIndex = this.partialData.findIndex(s => s.id === this.selectedServiceId);
    return currenSelectedIndex === -1 ? undefined : this.partialData[currenSelectedIndex];
  }
  //#endregion


}
