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
  take
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


import * as moment from 'moment';

//////////// Other Services ////////////
import { KeycloakService } from 'keycloak-angular';
import { GodsEyeService } from '../gods-eye.service';
import { ToolbarService } from '../../../../toolbar/toolbar.service';
import { HotkeysService, Hotkey } from 'angular2-hotkeys';
import { GodsEyeComponent } from '../gods-eye.component';

const REQUEST_SERVICE_DIALOG_MAX_DIMENSION = [400, 400];


@Component({
  // tslint:disable-next-line:component-selector
  selector: 'ge-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class ToolbarComponent implements OnInit, OnDestroy {

  // selected business in toolbar
  @Input('selectedBusinessId') selectedBusinessId: any;
  // user is supervisor
  @Input('userIsSupervisor') userIsSupervisor: any;


  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();
  // weather or not the stats should be visible
  isStatsVisible = false;
  supervisorWatchinAllOperation = false;
  // current layout
  private layout = undefined;
  // current user roles
  userRoles = undefined;
  zoom = 100;
  maxZoom = 300;
  minZoom = 25;
  searchText = "";
  

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
    private dialog: MatDialog,
    private _hotkeysService: HotkeysService
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    this.queryUserRols();
    this.listenLayoutChanges();
    this.listenToolbarCommands();
    this.configureHotkeys();
  }


  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this._hotkeysService.remove();
  }





  //#region Events/Commands listeners
  listenLayoutChanges() {
    this.godsEyeService.layoutChanges$.pipe(
      filter(e => e && e.layout),
      map(({ layout }) => layout),
      debounceTime(250),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      (layout) => {
        this.isStatsVisible = layout.stats.visible;
        this.layout = layout;
      },
      (error) => console.error(`toolbar.listenLayoutChanges.ngOnInit: Error => ${error}`),
      () => console.log(`toolbar.listenLayoutChanges.ngOnInit: Completed`),
    );
  }

  /**
   * Listen commands send by the command bar
   */
  listenToolbarCommands() {
    this.godsEyeService.toolbarCommands$.pipe(
      debounceTime(10),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      async ({ code, args }) => {
        
      },
      (error) => console.error(`MapComponent.listenToolbarCommands: Error => ${error}`),
      () => {
        console.log(`MapComponent.listenToolbarCommands: Completed`);
      },
    );
  }
  //#endregion

  //#region HOT KEYS COFIG

  configureHotkeys() {    
  }

  //#endregion

  //#region ACTIONS


  /**
   * Sends the command to refresh map
   * @param $event
   */
  sendMapRefreshCommand($event?) {
    if (this.isThereAnOpenDialog()) { return; }
    this.godsEyeService.publishToolbarCommand({ code: GodsEyeService.TOOLBAR_COMMAND_MAP_REFRESH, args: [] });
  }

  /**
   * Sends the command to refresh map
   * @param $event
   */
  searchVehicleByLicensePlate($event?) {
    if (this.isThereAnOpenDialog()) { return; }
    if (this.searchText && this.searchText.trim() !== "") {
      this.godsEyeService.publishToolbarCommand({ code: GodsEyeService.TOOLBAR_COMMAND_MAP_SEARCH_SHIFT, args: [this.searchText.trim().toUpperCase()] });
    }
    else { 
      this.showMessageSnackbar("TOOLBAR.SEARCH_INVALID_VALUE")
    }
  }
  
  /**
   * sendMapFocusCommand
   * @param $event
   */
  sendMapFocusCommand($event?) {
    if (this.isThereAnOpenDialog()) { return; }
    this.godsEyeService.publishToolbarCommand({ code: GodsEyeService.TOOLBAR_COMMAND_MAP_FOCUS, args: [] });
  }    
  

  isThereAnOpenDialog(): boolean {
    return false;
  }

  onCheckStatsChange($event) {
    this.isStatsVisible = !this.isStatsVisible;
    this.godsEyeService.publishLayoutCommand(
      {
        code: this.isStatsVisible
          ? GodsEyeService.LAYOUT_COMMAND_SHOW_STATS
          : GodsEyeService.LAYOUT_COMMAND_HIDE_STATS,
        args: []
      }
    );
  }

  //#endregion


  //#region OTHER/TOOLS
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

  /**
   * query current user roles
   */
  async queryUserRols() {
    this.userRoles = await this.keycloakService.getUserRoles(true);
  }

  //#endregion


}
