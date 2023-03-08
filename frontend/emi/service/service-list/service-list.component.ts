////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
  FormArray
} from '@angular/forms';

import { Router } from '@angular/router';

////////// RXJS ///////////
import {
  map,
  mergeMap,
  filter,
  tap,
  takeUntil,
  startWith,
  debounceTime,
  distinctUntilChanged,
  take,
  toArray
} from 'rxjs/operators';

import { Subject, of, forkJoin, combineLatest, Observable, iif, from } from 'rxjs';

////////// ANGULAR MATERIAL //////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar
} from '@angular/material';
import { fuseAnimations } from '../../../../core/animations';

//////////// i18n ////////////
import { TranslateService } from '@ngx-translate/core';
import { locale as english } from '../i18n/en';
import { locale as spanish } from '../i18n/es';
import { FuseTranslationLoaderService } from '../../../../core/services/translation-loader.service';

///////// DATEPICKER //////////
import { MAT_MOMENT_DATE_FORMATS } from './my-date-format';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MomentDateAdapter
} from '@coachcare/datepicker';

import * as moment from 'moment';

//////////// Other Services ////////////
import { ServiceListService } from './service-list.service';
import { ToolbarService } from '../../../toolbar/toolbar.service';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'service',
  templateUrl: './service-list.component.html',
  styleUrls: ['./service-list.component.scss'],
  animations: fuseAnimations,
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es' },
    // {
    //   provide: DateAdapter,
    //   useClass: MomentDateAdapter,
    //   deps: [MAT_DATE_LOCALE]
    // },
    // { provide: MAT_DATE_FORMATS, useValue: MAT_MOMENT_DATE_FORMATS }
  ]
})
export class ServiceListComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();
  queriedClientsByAutocomplete$: Observable<any[]>;
  queriedDriversByAutocomplete$: Observable<any[]>;
  clientNameFilterCtrl: FormControl;
  driverNameFilterCtrl: FormControl;

  stateList: string[] = ['REQUESTED', 'ASSIGNED', 'ARRIVED', 'ON_BOARD', 'DONE', 'CANCELLED_CLIENT', 'CANCELLED_DRIVER', 'CANCELLED_OPERATOR', 'CANCELLED_SYSTEM'];

  minInitDate: any = null;
  maxInitDate: any = null;
  maxEndDate: any = null;
  minEndDate: any = null;

  //////// FORMS //////////
  filterForm: FormGroup;


  /////// TABLE /////////

  dataSource = new MatTableDataSource();

  @ViewChild(MatPaginator)
  paginator: MatPaginator;
  tableSize: number;
  tablePage = 0;
  tableCount = 25;
  channelList = ["OPERATOR", "CLIENT", "APP_CLIENT", "CHAT_SATELITE"]
  foods = [
    {value: 'steak-0', viewValue: 'Steak'},
    {value: 'pizza-1', viewValue: 'Pizza'},
    {value: 'tacos-2', viewValue: 'Tacos'},
  ];

    // Columns to show in the table
    displayedColumns = [
      'timestamp',
      'clientName',
      'driverName',
      'licensePlate',
      // 'paymentType',
      'state'
    ];

  /////// OTHERS ///////

  selectedService: any = null;

  constructor(
    private formBuilder: FormBuilder,
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private snackBar: MatSnackBar,
    private router: Router,
    private adapter: DateAdapter<any>,
    private ServiceListservice: ServiceListService,
    private toolbarService: ToolbarService
  ) {
      this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    this.onLangChange();
    this.buildFilterForm();
    this.updateFilterDataSubscription();
    this.updatePaginatorDataSubscription();
    this.loadLastFilters();
    this.refreshTableSubscription();
    this.buildClientNameFilterCtrl();
    this.buildDriverNameFilterCtrl();

    this.ServiceListservice
      .getClientTest()
      .subscribe(result => {
        console.log("RESULT ===> ",result)
      });
  }

  onInitDateChange() {
    const start = this.filterForm.get('initTimestamp').value;
    const end = this.filterForm.get('endTimestamp').value;

    const startMonth = start.month();
    const startYear = start.year();
    const startMonthYear = startMonth + '-' + startYear;

    const endMonth = end.month();
    const endYear = end.year();
    const endMonthYear = endMonth + '-' + endYear;

    this.minEndDate = moment(start);
    this.maxEndDate =  moment(start.valueOf()).endOf('month');
    if (startMonthYear !== endMonthYear) {
      this.filterForm.patchValue({
        endTimestamp: this.maxEndDate
      });
    }

  }

  onClientSelected(client) {
    this.filterForm.patchValue({ client });
  }

  onDriverSelected(driver) {
    this.filterForm.patchValue({ driver });
  }

  /**
  * extract client name from client object
  * @param client
  */
  clientDisplayFn(client) {
    return client ? client.generalInfo.name : '';
  }

  driverDisplayFn(driver) {
    console.log("DRIVER TO DISPLAY")
    return driver ? driver.name+ " "+ driver.lastname : '';
  }

  buildClientNameFilterCtrl() {
    this.clientNameFilterCtrl = new FormControl();
    this.queriedClientsByAutocomplete$ = this.clientNameFilterCtrl.valueChanges.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      tap((selected) => {
        if (typeof selected === 'string' || selected instanceof String) {
          //this.filterForm.patchValue({ client: null });
        }
      }),
      filter(text => (typeof text === 'string' || text instanceof String)),
      mergeMap(x => iif(() => !x, of([]), this.getAllSatelliteClientsFiltered$(x, 3)))
    );
  }

  buildDriverNameFilterCtrl() {
    this.driverNameFilterCtrl = new FormControl();
    this.queriedDriversByAutocomplete$ = this.driverNameFilterCtrl.valueChanges.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      tap((selected) => {
        if (typeof selected === 'string' || selected instanceof String) {
          //this.filterForm.patchValue({ client: null });
        }
      }),
      filter(text => (typeof text === 'string' || text instanceof String)),
      mergeMap(x => iif(() => !x, of([]), this.getAllDriversFiltered$(x)))
    );
  }

  getAllSatelliteClientsFiltered$(filterText: String, limit: number): Observable<any[]> {
    return this.ServiceListservice
      .getClientsByFilter(filterText, limit)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter(resp => !resp.errors),
        map(clientSatellites => clientSatellites.data.ServiceClientSatellites)
      );
  }

  getAllDriversFiltered$(filterText: String): Observable<any[]> {
    return this.ServiceListservice
      .getDriversByFilter(filterText, this.toolbarService.onSelectedBusiness$.getValue().id)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter(resp => !resp.errors),
        map(drivers => {
          console.log("DRIVERS ===> ", drivers.data.ServiceDrivers);
          return drivers.data.ServiceDrivers
        })
      );
  }

  onEndDateChange() {
    const start = this.filterForm.get('initTimestamp').value;
    this.minEndDate = moment(start);
  }


  /**
   * Changes the internationalization of the dateTimePicker component
   */
  onLangChange() {
    this.translate.onLangChange
      .pipe(
        startWith({ lang: this.translate.currentLang }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(event => {
        if (event) {
          this.adapter.setLocale(event.lang);
        }
      });
  }

  /**
   * Emits the filter form data when it changes
   */
  listenFilterFormChanges$() {
    return this.filterForm.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    );
  }

  /**
   * Emits the paginator data when it changes
   */
  listenPaginatorChanges$() {
    return this.paginator.page;
  }

  /**
   * Builds filter form
   */
  buildFilterForm() {
    this.minInitDate = moment('2019-01-01').startOf('month');
    this.maxInitDate = moment().add(1, 'months').endOf('day');

    const startOfMonth = moment().startOf('month');
    const initTimeStampValue = moment().subtract(1, 'day').startOf('day');
    const endOfMonth = moment().endOf('day');
    this.minEndDate = startOfMonth;
    this.maxEndDate = endOfMonth;

    this.filterForm = this.formBuilder.group({
      initTimestamp: [initTimeStampValue, [Validators.required]],
      endTimestamp: [endOfMonth, [Validators.required]],
      driverDocumentId: [null],
      driverFullname: [null],
      vehicleLicensePlate: [null],
      channelVal: [null],
      clientUsername: [null],
      clientFullname: [null],
      states: this.formBuilder.array([]),
      showClosedServices: [false]
    });

    this.stateList.forEach(stateKey => {
      const stateControl = (this.filterForm.get('states') as FormArray).controls.find(control => control.get('name').value === stateKey );
      if (!stateControl){
        (this.filterForm.get('states') as FormArray).push(
          new FormGroup({
            name: new FormControl(stateKey),
            active: new FormControl(stateKey !==  'DONE')
          })
        );
      }
    });


    // console.log('raw => ', this.filterForm.getRawValue());
    this.filterForm.disable({
      onlySelf: true,
      emitEvent: false
    });
  }

  updateFilterDataSubscription() {
    this.listenFilterFormChanges$()
      .pipe(
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(filterData => {
        // console.log('filterData => ', filterData.initTimestamp.format(), filterData.endTimestamp.format());
        this.ServiceListservice.updateFilterData(filterData);
      });
  }

  updatePaginatorDataSubscription() {
    this.listenPaginatorChanges$()
      .pipe(
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(pagination => {
        const paginator = {
          pagination: {
            page: pagination.pageIndex, count: pagination.pageSize, sort: -1
          },
        };
        this.ServiceListservice.updatePaginatorData(paginator);
      });
  }

  /**
   * First time that the page is loading is needed to check if there were filters applied previously to load this info into the forms
   */
  loadLastFilters() {
    combineLatest(
      this.ServiceListservice.filter$,
      this.ServiceListservice.paginator$
    ).pipe(
      take(1)
    ).subscribe(([filterValue, paginator]) => {
          if (filterValue) {
            // console.log('loadLastFilters => ', filterValue.initTimestamp.format(), filterValue.endTimestamp.format());
            // console.log('filterValue.states =====> ', filterValue.states);

            this.filterForm.patchValue({
              initTimestamp: filterValue.initTimestamp,
              endTimestamp: filterValue.endTimestamp,
              driverDocumentId: filterValue.driverDocumentId,
              driverFullname: filterValue.driverFullname,
              vehicleLicensePlate: filterValue.vehicleLicensePlate,
              channelVal: filterValue.channelVal,
              clientUsername: filterValue.clientUsername,
              clientFullname: filterValue.clientFullname,
              // states: filterValue.states ? filterValue.states.filter(control => control.active === true).map(control => control.name) : [],
              // states: this.formBuilder.array([]),
              showClosedServices: filterValue.showClosedServices
            });


          if (filterValue.states) {
            this.filterForm.setControl('states', this.formBuilder.array([]));
              filterValue.states.forEach(stateKey => {
                  (this.filterForm.get('states') as FormArray).push(
                    new FormGroup({
                      name: new FormControl(stateKey.name),
                      active: new FormControl(stateKey.active)
                    })
                  );
              });
          }


            this.onInitDateChange();
            // this.onEndDateChange();
          }

          if (paginator) {
            this.tablePage = paginator.pagination.page;
            this.tableCount = paginator.pagination.count;
          }


        this.filterForm.enable({ emitEvent: true });
      });
  }

  /**
   * If a change is detect in the filter or the paginator then the table will be refreshed according to the values emmited
   */
  refreshTableSubscription() {
    combineLatest(
      this.ServiceListservice.filter$,
      this.ServiceListservice.paginator$,
      this.toolbarService.onSelectedBusiness$
    ).pipe(
      debounceTime(500),
      filter(([filterValue, paginator, selectedBusiness]) => (filterValue != null && paginator != null)),
      map(([filterValue, paginator, selectedBusiness]) => {
        // console.log('filterForm --> ', this.filterForm.getRawValue());
        const clientObj = this.clientNameFilterCtrl as any;
        const driverObj = this.driverNameFilterCtrl as any;
        console.log("driverObj ===> ", filterValue )
        const filterInput = {
          businessId: selectedBusiness ? selectedBusiness.id : null,
          initTimestamp: filterValue.initTimestamp ? filterValue.initTimestamp.valueOf() : null,
          endTimestamp: filterValue.endTimestamp ? filterValue.endTimestamp.valueOf() : null,
          driverDocumentId: filterValue.driverDocumentId,
          driverFullname: driverObj && (typeof driverObj.value === "string" || !driverObj.value) ? null : ((driverObj || {}).value || {}).name+ " "+((driverObj || {}).value || {}).lastname,
          vehicleLicensePlate: filterValue.vehicleLicensePlate,
          sourceChannel: filterValue.channelVal,
          clientUsername: filterValue.clientUsername,
          clientFullname: (((clientObj || {}).value || {}).generalInfo || {}).name,
          states: filterValue.states.filter(control => control.active === true).map(control => control.name),
          showClosedServices: filterValue.showClosedServices
        };

        const paginationInput = {
          page: paginator.pagination.page,
          count: paginator.pagination.count,
          sort: paginator.pagination.sort,
        };

        return [filterInput, paginationInput];
      }),
      mergeMap(([filterInput, paginationInput]) => forkJoin(
        this.getserviceList$(filterInput, paginationInput),
        this.getserviceSize$(filterInput),
      )),
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe(([list, size]) => {
      this.dataSource.data = list;
      this.tableSize = size;
    });
  }

  /**
   * Gets the service list
   * @param filterInput
   * @param paginationInput
   */
  getserviceList$(filterInput, paginationInput){
    return this.ServiceListservice.getserviceList$(filterInput, paginationInput)
    .pipe(
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      map(resp => resp.data.ServiceServices)
    );
  }

    /**
   * Gets the service size
   * @param filterInput
   */
  getserviceSize$(filterInput){
    return this.ServiceListservice.getserviceSize$(filterInput)
    .pipe(
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      map(resp => resp.data && resp.data.ServiceServicesSize ? resp.data.ServiceServicesSize : 0)
    );
  }

  /**
   * Receives the selected service
   * @param service selected service
   */
  selectserviceRow(service) {
    this.selectedService = service;
  }

  resetFilter() {
    this.filterForm.reset();
    this.paginator.pageIndex = 0;
    this.tablePage = 0;
    this.tableCount = 25;

    const startOfMonth = moment().startOf('month');
    const startYesterday = moment().subtract(1, 'day').startOf('day');
    const endOfMonth = moment().endOf('day');
    this.filterForm.patchValue({
      initTimestamp: startYesterday,
      endTimestamp: endOfMonth
    });

    while ((this.filterForm.get('states') as FormArray).length !== 0) {
      (this.filterForm.get('states') as FormArray).removeAt(0);
    }

    this.stateList.forEach(stateKey => {
      const stateControl = (this.filterForm.get('states') as FormArray).controls.find(control => control.get('name').value === stateKey );
      if (!stateControl){
        (this.filterForm.get('states') as FormArray).push(
          new FormGroup({
            name: new FormControl(stateKey),
            active: new FormControl(stateKey !==  'DONE')
          })
        );
      }
    });

    this.paginator._changePageSize(25);

  }

  refreshData(){
    const driverDocumentId = this.filterForm.get('driverDocumentId').value;
    this.filterForm.get('driverDocumentId').setValue(driverDocumentId);
  }

  /**
   * Navigates to the detail page
   */
  goToDetail() {
    this.toolbarService.onSelectedBusiness$
      .pipe(
        take(1)
      ).subscribe(selectedBusiness => {
        if (selectedBusiness == null || selectedBusiness.id == null) {
          this.showSnackBar('SERVICE.SELECT_BUSINESS');
        } else {
          this.router.navigate(['service/new']);
        }
      });
  }

  showSnackBar(message) {
    this.snackBar.open(this.translationLoader.getTranslate().instant(message),
      this.translationLoader.getTranslate().instant('SERVICE.CLOSE'), {
        duration: 4000
      });
  }

  graphQlAlarmsErrorHandler$(response) {
    return of(JSON.parse(JSON.stringify(response))).pipe(
      tap((resp: any) => {
        if (response && Array.isArray(response.errors)) {
          response.errors.forEach(error => {
            this.showMessageSnackbar('ERRORS.' + ((error.extensions||{}).code || 1) )
          });
        }
        return resp;
      })
    );
  }
  
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
          duration: 2000
        }
      );
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}
