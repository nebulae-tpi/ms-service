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
import { GodsEyeService } from './gods-eye.service';
import { ToolbarService } from '../../../toolbar/toolbar.service';


export interface Tile {
  color: string;
  cols: number;
  rows: number;
  text: string;
}

const HORIZONTAL_STATS_COLS = 34;
const VERTICAL_STATS_ROWS = 15;
const TOOLBAR_ROWS = 4;
const SCREEN_HEIGHT_WASTE = 110;



@Component({
  // tslint:disable-next-line:component-selector
  selector: 'gods-eye',
  templateUrl: './gods-eye.component.html',
  styleUrls: ['./gods-eye.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class GodsEyeComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();

  toolbarRows = 6;
  toolbarCols: number;
  statsCols: number;
  statsRows: number;
  mapCols: number;
  mapRows: number;

  screenCols: number;
  horizontalLayout: boolean;
  layoutType: number;
  showStats = true;

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
    private godsEyeService: GodsEyeService,
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

  isVerticalWithStatsLayout(): boolean {
    return this.layoutType === GodsEyeService.LAYOUT_VERTICAL_WITH_STATS;
  }

  isHorizontalWithStatsLayout(): boolean {
    return this.layoutType === GodsEyeService.LAYOUT_HORIZONTAL_WITH_STATS;
  }

  isNoStatsLayout(): boolean {
    return this.layoutType === GodsEyeService.LAYOUT_NO_STATS;
  }


  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    this.recalculateLayout();
  }


  listenLayoutCommnads() {
    this.godsEyeService.layoutChanges$.pipe(
      tap(x => console.log(x)),
      filter(e => e && e.command),
      map(({ command }) => command),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      (command) => {
        console.log(command);
        switch (command.code) {
          case GodsEyeService.LAYOUT_COMMAND_SHOW_STATS:
            this.showStats = true;
            this.recalculateLayout();
            break;
          case GodsEyeService.LAYOUT_COMMAND_HIDE_STATS:
            this.showStats = false;
            this.recalculateLayout();
            break;
        }
      },
      (error) => console.error(`gods-eye.listenLayoutChanges.ngOnInit: Error => ${error}`),
      () => console.log(`gods-eye.listenLayoutChanges.ngOnInit: Completed`),
    );
  }

  listenBusinessChanges() {
    this.toolbarService.onSelectedBusiness$
      .pipe(
        tap(bu => {
          this.selectedBusinessId = bu ? bu.id : null;          
          this.godsEyeService.publishToolbarCommand({ code: GodsEyeService.TOOLBAR_COMMAND_BUSINESS_UNIT_CHANGED, args: [this.selectedBusinessId,bu] });
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();
  }

  loadUserRoles(){
    const userRoles = this.keycloakService.getUserRoles(true);
    this.userIsSupervisor = userRoles.includes('OPERATION-SUPERVISOR');
    console.log('USER ROLES ==> ', this.userIsSupervisor );
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
    this.layoutType = !this.showStats
      ? GodsEyeService.LAYOUT_NO_STATS
      : this.horizontalLayout
        ? GodsEyeService.LAYOUT_HORIZONTAL_WITH_STATS
        : GodsEyeService.LAYOUT_VERTICAL_WITH_STATS;

    if (this.showStats) {
      if (this.horizontalLayout) {
        this.toolbarCols = (this.screenCols - HORIZONTAL_STATS_COLS);
        this.toolbarRows = TOOLBAR_ROWS;
        this.statsCols = HORIZONTAL_STATS_COLS;
        this.statsRows = screenRows;
        this.mapCols = (this.screenCols - HORIZONTAL_STATS_COLS);
        this.mapRows = (screenRows - this.toolbarRows);
      } else {
        this.toolbarCols = this.screenCols;
        this.toolbarRows = TOOLBAR_ROWS;
        this.statsCols = this.screenCols;
        this.statsRows = VERTICAL_STATS_ROWS;
        this.mapCols = this.screenCols;
        this.mapRows = (screenRows - this.toolbarRows - VERTICAL_STATS_ROWS);
      }
    } else {
      this.toolbarCols = this.screenCols;
      this.toolbarRows = TOOLBAR_ROWS;
      this.mapCols = this.screenCols;
      this.mapRows = (screenRows - this.toolbarRows);
    }

    this.godsEyeService.publishLayoutChange(
      this.layoutType,
      this.toolbarCols * colWidth,
      this.toolbarRows * rowHeight,
      this.mapCols * colWidth,
      this.mapRows * rowHeight,
      !this.showStats ? undefined : this.statsCols * colWidth,
      !this.showStats ? undefined : this.statsRows * rowHeight,
    );
  }
}
