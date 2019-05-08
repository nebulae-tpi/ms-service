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
  take,
  delay
} from 'rxjs/operators';

import { Subject, fromEvent, of, forkJoin, Observable, concat, combineLatest } from 'rxjs';

////////// ANGULAR MATERIAL //////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog,
  MatDialogConfig,
  MatDialogRef
} from '@angular/material';
import { fuseAnimations } from '../../../../../../core/animations';

//////////// i18n ////////////
import {
  TranslateService,
  LangChangeEvent,
  TranslationChangeEvent
} from '@ngx-translate/core';
import { locale as english } from '../../../i18n/en';
import { locale as spanish } from '../../../i18n/es';
import { FuseTranslationLoaderService } from '../../../../../../core/services/translation-loader.service';


import * as moment from 'moment';

//////////// Other Services ////////////
import { KeycloakService } from 'keycloak-angular';
import { GodsEyeService } from '../../gods-eye.service';
import { ToolbarService } from '../../../../../toolbar/toolbar.service';
import { HotkeysService, Hotkey } from 'angular2-hotkeys';
import { GodsEyeComponent } from '../../gods-eye.component';



@Component({
  selector: 'service-card',
  templateUrl: './service-card.component.html',
  styleUrls: ['./service-card.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class ServiceCardComponent implements OnInit, OnDestroy {


  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();
  // weather or not the stats should be visible
  isStatsVisible = false;

  loaded: boolean = true;

  scheme: any = {
    domain: ['#FFDAB9', '#00ff00', '#0000FF', '#000088', '#00174f', '#FFB6C1', '#FFB6C1', '#FFB6C1', '#ff0000']
  };

  data: any = [
    {

      'type': 'REQUESTED',
      'name': this.translationLoader.getTranslate().instant(`GODSEYE.STATS.SHIFT.REQUESTED`),
      'value': 0,
    },
    {
      'type': 'ASSIGNED',
      'name': this.translationLoader.getTranslate().instant(`GODSEYE.STATS.SHIFT.ASSIGNED`),
      'value': 0,
    },
    {
      'type': 'ARRIVED',
      'name': this.translationLoader.getTranslate().instant(`GODSEYE.STATS.SHIFT.ARRIVED`),
      'value': 0,
    },
    {
      'type': 'ON_BOARD',
      'name': this.translationLoader.getTranslate().instant(`GODSEYE.STATS.SHIFT.ON_BOARD`),
      'value': 0,
    },
    {
      'type': 'DONE',
      'name': this.translationLoader.getTranslate().instant(`GODSEYE.STATS.SHIFT.DONE`),
      'value': 0,
    },
    {
      'type': 'CANCELLED_CLIENT',
      'name': this.translationLoader.getTranslate().instant(`GODSEYE.STATS.SHIFT.CANCELLED_CLIENT`),
      'value': 0,
    },
    {
      'type': 'CANCELLED_OPERATOR',
      'name': this.translationLoader.getTranslate().instant(`GODSEYE.STATS.SHIFT.CANCELLED_OPERATOR`),
      'value': 0,
    },
    {
      'type': 'CANCELLED_DRIVER',
      'name': this.translationLoader.getTranslate().instant(`GODSEYE.STATS.SHIFT.CANCELLED_DRIVER`),
      'value': 0,
    },
    {
      'type': 'CANCELLED_SYSTEM',
      'name': this.translationLoader.getTranslate().instant(`GODSEYE.STATS.SHIFT.CANCELLED_SYSTEM`),
      'value': 0,
    }
  ];
  dataCount: number = 0;


  constructor(
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private godsEyeService: GodsEyeService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog,
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    this.listenStatsCommands();
  }


  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }





  //#region Events/Commands listeners

  /**
   * Listen commands send by the command bar
   */
  listenStatsCommands() {
    this.godsEyeService.statsCommands$.pipe(
      filter((cmd: any) => cmd.code === GodsEyeService.STATS_COMMAND_UPDATE_SERVICES),
      debounceTime(100),
      filter(({ code, args }) => code && args),
      map(({ code, args }) => ({
        data: Object.keys(args).reduce((acc, type) => { acc.push({ type, name: this.translationLoader.getTranslate().instant(`GODSEYE.STATS.SERVICE.${type}`), value: args[type] }); return acc; }, []),
        count: Object.values(args).reduce((acc: number, d: number) => { acc = acc + d; return acc; }, 0)
      })),
      tap(({ data, count }) => { this.data = data; this.dataCount = (count as number); }),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      ({ data, count }) => {
        //console.log(`ServiceCardComponent.listenStatsCommands`, { data, count });
      },
      (error) => console.error(`ServiceCardComponent.listenStatsCommands: Error => ${error}`),
      () => {
        console.log(`ServiceCardComponent.listenStatsCommands: Completed`);
      },
    );
  }
  //#endregion

  //#region HOT KEYS COFIG

  configureHotkeys() {
  }

  //#endregion



}
