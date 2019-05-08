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
  // tslint:disable-next-line:component-selector
  selector: 'shift-card',
  templateUrl: './shift-card.component.html',
  styleUrls: ['./shift-card.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class ShiftCardComponent implements OnInit, OnDestroy {


  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();
  // weather or not the stats should be visible
  isStatsVisible = false;

  loaded: boolean = true;

  scheme: any = {
    domain: ['#00E100', '#ff0000', '#0000FF', '#000000', '#A9A9A9']
  };

  data: any = [
    {

      'type': 'AVAILABLE',
      'name': this.translationLoader.getTranslate().instant('GODSEYE.STATS.SHIFT.AVAILABLE'),
      'value': 0,
    },
    {
      'type': 'NOT_AVAILABLE',
      'name': this.translationLoader.getTranslate().instant('GODSEYE.STATS.SHIFT.NOT_AVAILABLE'),
      'value': 0,
    },
    {
      'type': 'BUSY',
      'name': this.translationLoader.getTranslate().instant('GODSEYE.STATS.SHIFT.BUSY'),
      'value': 0,
    },
    {
      'type': 'BLOCKED',
      'name': this.translationLoader.getTranslate().instant('GODSEYE.STATS.SHIFT.BLOCKED'),
      'value': 0,
    },
    {
      'type': 'OFFLINE',
      'name': this.translationLoader.getTranslate().instant('GODSEYE.STATS.SHIFT.OFFLINE'),
      'value': 0,
    }
  ];
  dataCount = 0;


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
      filter((cmd: any) => cmd.code === GodsEyeService.STATS_COMMAND_UPDATE_SHIFTS),
      debounceTime(100),
      filter( ({ code, args }) => code && args),
      map( ({ code, args }) => ({
        data: Object.keys(args).reduce((acc, type) => { acc.push({ type, name: this.translationLoader.getTranslate().instant(`GODSEYE.STATS.SHIFT.${type}`), value: args[type] }); return acc; }, []),
        count: Object.values(args).reduce((acc: number, d: number) => { acc = acc + d; return acc; }, 0)
      })),
      //tap( () => this.loaded = false),
      tap( ({data, count}) => { this.data = data; this.dataCount=(count as number); }),
      //delay(50),
      //tap( () => this.loaded = true),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      ({data, count}) => {
        //console.log(`ShiftCardComponent.listenStatsCommands`, { data, count });        
      },
      (error) => console.error(`ShiftCardComponent.listenStatsCommands: Error => ${error}`),
      () => {
        console.log(`ShiftCardComponent.listenStatsCommands: Completed`);
      },
    );
  }
  //#endregion

  //#region HOT KEYS COFIG

  configureHotkeys() {
  }

  //#endregion



}
