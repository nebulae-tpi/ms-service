////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener
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
import {
  TranslateService,
  LangChangeEvent,
  TranslationChangeEvent
} from '@ngx-translate/core';
import { locale as english } from '../i18n/en';
import { locale as spanish } from '../i18n/es';
import { FuseTranslationLoaderService } from '../../../../core/services/translation-loader.service';


import * as moment from 'moment';

//////////// Other Services ////////////
import { KeycloakService } from 'keycloak-angular';
import { OperatorWorkstationService } from './operator-workstation.service';
import { ToolbarService } from '../../../toolbar/toolbar.service';


export interface Tile {
  color: string;
  cols: number;
  rows: number;
  text: string;
}  

const HORIZONTAL_INBOX_COLS = 15;
const VERTICAL_INBOX_ROWS = 10;
const TOOLBAR_ROWS = 4;
const SCREEN_HEIGHT_WASTE = 110;



@Component({
  // tslint:disable-next-line:component-selector
  selector: 'operator-workstation',
  templateUrl: './operator-workstation.component.html',
  styleUrls: ['./operator-workstation.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class OperatorWorkstationComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();

  toolbarRows = 6;
  toolbarCols: number;
  inboxCols: number;
  inboxRows: number;
  datatableCols: number;
  datatableRows: number;

  screenCols: number;
  horizontalLayout: boolean;
  layoutType: number;
  showInbox = false;

  selectedBusiness: any;
  selectedBusinessId: any;
  userIsSupervisor = false;


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
    this.onResize();
  }


  ngOnInit() {
    this.listenLayoutCommnads();
    this.listenBusinessChanges();
    this.loadUserRoles();
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  isVerticalWithInboxLayout(): boolean {
    return this.layoutType === OperatorWorkstationService.LAYOUT_VERTICAL_WITH_INBOX;
  }

  isHorizontalWithInboxLayout(): boolean {
    return this.layoutType === OperatorWorkstationService.LAYOUT_HORIZONTAL_WITH_INBOX;
  }

  isNoInboxLayout(): boolean {
    return this.layoutType === OperatorWorkstationService.LAYOUT_NO_INBOX;
  }


  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    this.recalculateLayout();
  }


  listenLayoutCommnads() {
    this.operatorWorkstationService.layoutChanges$.pipe(
      tap(x => console.log(x)),
      filter(e => e && e.command),
      map(({ command }) => command),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      (command) => {
        console.log(command);
        switch (command.code) {
          case OperatorWorkstationService.LAYOUT_COMMAND_SHOW_INBOX:
            this.showInbox = true;
            this.recalculateLayout();
            break;
          case OperatorWorkstationService.LAYOUT_COMMAND_HIDE_INBOX:
            this.showInbox = false;
            this.recalculateLayout();
            break;
        }
      },
      (error) => console.error(`operator-workstation.listenLayoutChanges.ngOnInit: Error => ${error}`),
      () => console.log(`operator-workstation.listenLayoutChanges.ngOnInit: Completed`),
    );
  }

  listenBusinessChanges() {
    this.toolbarService.onSelectedBusiness$
      .pipe(
        tap(bu => {
          this.selectedBusiness = bu;
          this.selectedBusinessId = bu ? bu.id : null;
          this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_BUSINESS_UNIT_CHANGED, args: [this.selectedBusinessId] });
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();
  }
  

  loadUserRoles(){
    const userRoles = this.keycloakService.getUserRoles(true);
    this.userIsSupervisor = userRoles.includes('OPERATION-SUPERVISOR');
  }


  /**
   * Recalculate layout type and dimensions
   */
  recalculateLayout() {
    const rowHeight = 10;
    const colWidth = 10;
    const screenHeight = (window.innerHeight) - SCREEN_HEIGHT_WASTE;
    const screenWidth = window.innerWidth;


    const screenRows = screenHeight / rowHeight;
    this.screenCols = screenWidth / colWidth;
    this.horizontalLayout = screenWidth >= screenHeight;
    this.layoutType = !this.showInbox
      ? OperatorWorkstationService.LAYOUT_NO_INBOX
      : this.horizontalLayout
        ? OperatorWorkstationService.LAYOUT_HORIZONTAL_WITH_INBOX
        : OperatorWorkstationService.LAYOUT_VERTICAL_WITH_INBOX;

    if (this.showInbox) {
      if (this.horizontalLayout) {
        this.toolbarCols = (this.screenCols - HORIZONTAL_INBOX_COLS);
        this.toolbarRows = TOOLBAR_ROWS;
        this.inboxCols = HORIZONTAL_INBOX_COLS;
        this.inboxRows = screenRows;
        this.datatableCols = (this.screenCols - HORIZONTAL_INBOX_COLS);
        this.datatableRows = (screenRows - this.toolbarRows);
      } else {
        this.toolbarCols = this.screenCols;
        this.toolbarRows = TOOLBAR_ROWS;
        this.inboxCols = this.screenCols;
        this.inboxRows = VERTICAL_INBOX_ROWS;
        this.datatableCols = this.screenCols;
        this.datatableRows = (screenRows - this.toolbarRows - VERTICAL_INBOX_ROWS);
      }
    } else {
      this.toolbarCols = this.screenCols;
      this.toolbarRows = TOOLBAR_ROWS;
      this.datatableCols = this.screenCols;
      this.datatableRows = (screenRows - this.toolbarRows);
    }

    this.operatorWorkstationService.publishLayoutChange(
      this.layoutType,
      this.toolbarCols * colWidth,
      this.toolbarRows * rowHeight,
      this.datatableCols * colWidth,
      this.datatableRows * rowHeight,
      !this.showInbox ? undefined : this.inboxCols * colWidth,
      !this.showInbox ? undefined : this.inboxRows * rowHeight,
    );
  }

}
