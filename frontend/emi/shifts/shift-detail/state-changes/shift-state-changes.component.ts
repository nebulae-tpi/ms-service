////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
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
  take
} from 'rxjs/operators';

import { Subject, fromEvent, of, forkJoin, Observable, concat, combineLatest } from 'rxjs';

//////////// ANGULAR MATERIAL ///////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog
} from '@angular/material';

//////////// i18n ////////////
import {
  TranslateService
} from '@ngx-translate/core';
import { locale as english } from '../../i18n/en';
import { locale as spanish } from '../../i18n/es';
import { FuseTranslationLoaderService } from '../../../../../core/services/translation-loader.service';

//////////// Others ////////////
import { KeycloakService } from 'keycloak-angular';
import { ShiftDetailService } from '../shift-detail.service';
import { DialogComponent } from '../../dialog/dialog.component';
import { ToolbarService } from '../../../../toolbar/toolbar.service';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'shift-state-changes',
  templateUrl: './shift-state-changes.component.html',
  styleUrls: ['./shift-state-changes.component.scss']
})
// tslint:disable-next-line:class-name
export class ShiftStateChangesComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();
  @Input('shift') shift: any;

  ////////////////// Table for state changes  //////////////////////
  stateChangesDataSource = new MatTableDataSource();

  @ViewChild('stateChangesPaginator') stateChangesPaginator: MatPaginator;
  stateChangesTableSize: number;
  stateChangesTablePage = 0;
  stateChangesTableCount = 10;

  // Columns to show in the table
  stateChangesDisplayedColumns = [
    'timestamp',
    'state'
  ];
  //////////////////////////////////////////////////////////////////////
  ////////////////// Table for state changes  //////////////////////
  conectDisconectDataSource = new MatTableDataSource();

  @ViewChild('conectDisconectPaginator') conectDisconectPaginator: MatPaginator;
  conectDisconectTableSize: number;
  conectDisconectTablePage = 0;
  conectDisconectTableCount = 10;

  // Columns to show in the table
  conectDisconectDisplayedColumns = [
    'timestamp',
    'state'
  ];
   //////////////////////////////////////////////////////////////////////



  constructor(
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private formBuilder: FormBuilder,
    public snackBar: MatSnackBar,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private shiftDetailService: ShiftDetailService,
    private dialog: MatDialog,
    private toolbarService: ToolbarService
  ) {
      this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    this.initPaginatorsListeners();
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

    this.translate.get(translationData)
      .subscribe(data => {
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

  selectState(state){

  }

  initPaginatorsListeners(){
    this.stateChangesPaginator.page
    .pipe(
      startWith({pageIndex: 0, pageSize: 10}),
      map(p => ({pagination: {page: p.pageIndex, count: p.pageSize , sort: -1}})),      
      // query here
      mergeMap(pagination => forkJoin(
        this.shiftDetailService.getStateChangesList$(this.shift._id, pagination).pipe(map(r => r.data.ServiceShiftStateChangesList )),
        this.shiftDetailService.getStateChangesListSize$(this.shift._id).pipe(map(r => r.data.ServiceShiftStateChangesListSize ))
      )),
      tap(([stateChangesList, listSize]) => {
        this.stateChangesTableSize = listSize;
        this.stateChangesDataSource.data = stateChangesList;
      }),
      takeUntil(this.ngUnsubscribe),
      //tap(r => console.log(r))
    )
    .subscribe(() => { }, e => console.log(), () => console.log('COMPLETED'));

    this.conectDisconectPaginator.page
    .pipe(
      startWith({pageIndex: 0, pageSize: 10}),
      map(p => ({pagination: {page: p.pageIndex, count: p.pageSize , sort: -1}})),      
      // query here
      mergeMap(pagination => forkJoin(
        this.shiftDetailService.getOnlineChangesList$(this.shift._id, pagination).pipe(map(r => r.data.ServiceShiftOnlineChangesList )),
        this.shiftDetailService.getOnlineChangesListSize$(this.shift._id).pipe(map(r => r.data.ServiceShiftOnlineChangesListSize )),
      )),
      tap(([onlineChangesList, onlineChangesListSize])  => {
        this.conectDisconectTableSize = onlineChangesListSize;
        this.conectDisconectDataSource.data = onlineChangesList;
      }),
      takeUntil(this.ngUnsubscribe),
      //tap(result => console.log(result) )
    )
    .subscribe(() => { }, e => console.log(), () => console.log('COMPLETED'));


  }

}
