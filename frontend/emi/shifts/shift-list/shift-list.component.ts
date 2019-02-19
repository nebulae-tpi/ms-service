////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef
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
  take
} from 'rxjs/operators';

import { Subject, fromEvent, of, forkJoin, Observable, concat, combineLatest } from 'rxjs';

////////// ANGULAR MATERIAL //////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog
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
import { ShiftListService } from './shift-list.service';
import { ToolbarService } from '../../../toolbar/toolbar.service';
import { DialogComponent } from '../dialog/dialog.component';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'shift-list',
  templateUrl: './shift-list.component.html',
  styleUrls: ['./shift-list.component.scss'],
  animations: fuseAnimations,
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es' },
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE]
    },
    { provide: MAT_DATE_FORMATS, useValue: MAT_MOMENT_DATE_FORMATS }
  ]
})
export class ShiftListComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();

  stateList: string[] = ['AVAILABLE', 'NOT_AVAILABLE', 'BUSY', 'BLOCKED', 'CLOSED'];


  //////// FORMS //////////
  filterForm: FormGroup;

  minInitDate: any = null;
  maxInitDate: any = null;
  maxEndDate: any = null;
  minEndDate: any = null;

  /////// TABLE /////////

  dataSource = new MatTableDataSource();

  @ViewChild(MatPaginator)
  paginator: MatPaginator;
  tableSize: number;
  tablePage = 0;
  tableCount = 10;

    // Columns to show in the table
    displayedColumns = [
      'timestamp',
      'driverUsername',
      'driverDocumentId',
      'licensePlate',
      'vehicleModel',
      'lastReceivedComm',
      'actions'
    ];

  /////// OTHERS ///////

  selectedService: any = null;

  // TEST
  CONST_LIST_RESPONSE = [];

  constructor(
    private formBuilder: FormBuilder,
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private snackBar: MatSnackBar,
    private router: Router,
    private adapter: DateAdapter<any>,
    private shiftListservice: ShiftListService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog,
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
    this.maxEndDate = moment(start.valueOf()).endOf('month');
    if (startMonthYear !== endMonthYear) {
      this.filterForm.patchValue({
        endTimestamp: this.maxEndDate
      });
    }
    console.log('minEndDate => ', this.minEndDate);
    console.log('maxEndDate => ', this.maxEndDate.format());

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
    const endOfMonth = moment().endOf('day');
    this.minEndDate = startOfMonth;
    this.maxEndDate = endOfMonth;
    // Reactive Filter Form
    this.filterForm = this.formBuilder.group({
      initTimestamp: [startOfMonth, [Validators.required]],
      endTimestamp: [endOfMonth, [Validators.required]],
      driverDocumentId: [null],
      driverFullname: [null],
      vehicleLicensePlate: [null],
      states: [null]
    });

    this.filterForm.disable({
      onlySelf: true,
      emitEvent: false
    });
  }

  updateFilterDataSubscription() {
    this.listenFilterFormChanges$()
      .pipe(
        takeUntil(this.ngUnsubscribe),
        tap(filterData => this.shiftListservice.updateFilterData(filterData) )
      )
      .subscribe();
  }

  updatePaginatorDataSubscription() {
    this.listenPaginatorChanges$()
      .pipe(
        takeUntil(this.ngUnsubscribe),
        map(pagination => ({ pagination: {page: pagination.pageIndex, count: pagination.pageSize, sort: -1} })),
        tap(paginator => this.shiftListservice.updatePaginatorData(paginator) )
      )
      .subscribe();
  }

  /**
   * First time that the page is loading is needed to check if there were filters applied previously to load this info into the forms
   */
  loadLastFilters() {
    combineLatest(
      this.shiftListservice.filter$,
      this.shiftListservice.paginator$
    ).pipe(
      take(1)
    ).subscribe(([filterValue, paginator]) => {
          if (filterValue) {
            this.filterForm.patchValue({
              initTimestamp: filterValue.initTimestamp,
              endTimestamp: filterValue.endTimestamp,
              driverDocumentId: filterValue.driverDocumentId,
              driverFullname: filterValue.driverFullname,
              vehicleLicensePlate: filterValue.vehicleLicensePlate,
              states: filterValue.states
            });
            this.onInitDateChange();
            this.onEndDateChange();
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
      this.shiftListservice.filter$,
      this.shiftListservice.paginator$,
      this.toolbarService.onSelectedBusiness$
    ).pipe(
      debounceTime(500),
      filter(([filterValue, paginator, selectedBusiness]) => (filterValue != null && paginator != null)),
      map(([filterValue, paginator, selectedBusiness]) => {


        const filterInput = {
          businessId: selectedBusiness ? selectedBusiness.id : null,
          initTimestamp: filterValue.initTimestamp ? filterValue.initTimestamp.valueOf() : null,
          endTimestamp: filterValue.endTimestamp ? filterValue.endTimestamp.valueOf() : null,
          driverDocumentId: filterValue.driverDocumentId,
          driverFullname: filterValue.driverFullname,
          vehicleLicensePlate: filterValue.vehicleLicensePlate,
          states: filterValue.states,
        };
        console.log('paginator', paginator);

        const paginationInput = {
          page: paginator.pagination.page,
          count: paginator.pagination.count,
          sort: paginator.pagination.sort,
        };

        return [filterInput, paginationInput];
      }),
      mergeMap(([filterInput, paginationInput]) => forkJoin(
        this.getShiftList$(filterInput, paginationInput),
        this.getShiftListSize$(filterInput),
      )),
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe(([list, size]) => {

      console.log('###############################');
      console.log(size);
      console.log(list);
      console.log('###############################');


      this.dataSource.data = list;
      this.tableSize = size;
    });
  }

  /**
   * Gets the service list
   * @param filterInput
   * @param paginationInput
   */
  getShiftList$(filterInput, paginationInput){
    return this.shiftListservice.getShiftList$(filterInput, paginationInput)
    .pipe(
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      map(resp => resp.data.ServiceShifts)
    );
  }

    /**
   * Gets the service size
   * @param filterInput
   */
  getShiftListSize$(filterInput){
    return this.shiftListservice.getShiftListSize$(filterInput)
    .pipe(
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      map(resp => resp.data.ServiceShiftsSize)
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
    this.tableCount = 10;

    const startOfMonth = moment().startOf('month');
    const endOfMonth = moment().endOf('day');
    this.filterForm.patchValue({
      initTimestamp: startOfMonth,
      endTimestamp: endOfMonth
    });
  }

  closeShift(shiftId: any){
    this.showConfirmationDialog$('SHIFT.CLOSE_SHIFT_MESSAGE', 'SHIFT.CLOSE_SHIFT')
      .pipe(
        mergeMap(() => this.shiftListservice.closeService$(shiftId)),
        mergeMap(response => this.graphQlAlarmsErrorHandler$(response)),
        map(r => !r.errors ? r.data : null),
        tap(response => {
          if (response && response.ServiceShiftClose && response.ServiceShiftClose.code === 200) {
            this.showMessageSnackbar(this.translate.instant('SHIFT.SHIFT_CLOSED'));
            this.dataSource.data.find((s: any) => s._id === shiftId)['state'] = 'CLOSED';
          }
        })
      )
      .subscribe(() => { }, e => console.log(e), () => { });

  }

  showConfirmationDialog$(dialogMessage, dialogTitle) {
    return this.dialog.open(DialogComponent, {
      data: {
        dialogMessage,
        dialogTitle
      }
    })
      .afterClosed()
      .pipe(
        filter(okButton => okButton)
      );
  }

  /**
   * Navigates to the detail page
   */
  goToDetail(){
    this.toolbarService.onSelectedBusiness$
    .pipe(
      take(1)
    ).subscribe(selectedBusiness => {
      if (selectedBusiness == null || selectedBusiness.id == null){
        this.showSnackBar('SERVICE.SELECT_BUSINESS');
      }else{
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
        this.showSnackBarError(resp);
        return resp;
      })
    );
  }

    /**
   * Shows an error snackbar
   * @param response
   */
  showSnackBarError(response) {
    if (response.errors) {
      if (Array.isArray(response.errors)) {
        response.errors.forEach(error => {
          if (Array.isArray(error)) {
            error.forEach(errorDetail => {
              this.showMessageSnackbar('ERRORS.' + errorDetail.message.code);
            });
          } else {
            response.errors.forEach(errorData => {
              this.showMessageSnackbar('ERRORS.' + errorData.message.code);
            });
          }
        });
      }
    }
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
          duration: 4000
        }
      );
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}
