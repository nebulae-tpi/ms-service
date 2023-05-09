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
import { OperatorWorkstationService } from '../operator-workstation.service';
import { ToolbarService } from '../../../../toolbar/toolbar.service';
import { HotkeysService, Hotkey } from 'angular2-hotkeys';
import { RequestServiceDialogComponent } from '../request-service-dialog/request-service-dialog.component';
import { OperatorWorkstationComponent } from '../operator-workstation.component';

const REQUEST_SERVICE_DIALOG_MAX_DIMENSION = [500, 400];


@Component({
  // tslint:disable-next-line:component-selector
  selector: 'toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class ToolbarComponent implements OnInit, OnDestroy {

  // selected business in toolbar
  // @Input('selectedBusiness') selectedBusiness: any;
  public selectedBusinessRef: any;
  // user is supervisor
  @Input('userIsSupervisor') userIsSupervisor: any;
  // Last refresh command sent timestamp
  lastRefreshCommandSentTimestamp = 0;


  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();

  private searchBarSubject = new Subject();
  // weather or not the inbox should be visible
  isInboxVisible = false;
  supervisorWatchinAllOperation = false;
  // current layout
  private layout = undefined;
  // current user roles
  userRoles = undefined;
  page = 0;
  maxPage = 0;

  // selected filters to filter services
  channelsFilter: String[] = ['OPERATOR'];

  isBusinessOwner = false;
  isPlatformAdmin = false;
  isSysAdmin = false;


  /**
   * open RequestServiceDialogComponent reference
   */
  private requestServiceDialogRef: MatDialogRef<RequestServiceDialogComponent> = undefined;

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
    this.searchBarSubject.pipe(
      debounceTime(1000),
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe(searchVal => {
      this.operatorWorkstationService.publishToolbarCommand({
      code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_SEARCHBAR_FILTER_CHANGED,
      args: searchVal
      });
    })
  }


  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this._hotkeysService.remove();
  }

  get selectedBusiness(): any {
    // transform value for display
    return this.selectedBusinessRef;
  }

  @Input()
  set selectedBusiness(selectedBusiness: any) {
    // console.log('prev value: ', this._selectedBusiness);
    // console.log('got name: ', selectedBusiness);
    this.selectedBusinessRef = selectedBusiness;
  }

  //#region Events/Commands listeners
  listenLayoutChanges() {
    this.operatorWorkstationService.layoutChanges$.pipe(
      filter(e => e && e.layout),
      map(({ layout }) => layout),
      debounceTime(250),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      (layout) => {
        this.isInboxVisible = layout.inbox.visible;
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
    this.operatorWorkstationService.toolbarCommands$.pipe(
      debounceTime(10),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      async ({ code, args }) => {
        switch (code) {
          case OperatorWorkstationService.TOOLBAR_COMMAND_TOOLBAR_SET_MAX_PAGINATION:
            this.maxPage = args.maxPage;
            if ((this.page + 1) >= this.maxPage) {
              this.page = this.maxPage - 1;
              this.sendDatatableApplyChangePageCommand();
            }
            break;
        }
      },
      (error) => console.error(`DatatableComponent.listenToolbarCommands: Error => ${error}`),
      () => {
        console.log(`DatatableComponent.listenToolbarCommands: Completed`);
      },
    );
  }
  //#endregion

  //#region HOT KEYS COFIG

  configureHotkeys() {
    this._hotkeysService.add(new Hotkey(['+', 's'], (event: KeyboardEvent): boolean => {
      if (this.selectedBusinessRef && this.selectedBusinessRef.id){
        this.showRequestServiceDialog(0);
      } else {
        this.showMessageSnackbar('ERRORS.3');
      }
      return false;
    }));
    this._hotkeysService.add(new Hotkey(['alt+s'], (event: KeyboardEvent): boolean => {
      if (this.selectedBusinessRef && this.selectedBusinessRef.id){
        this.showRequestServiceDialog(1);
      } else {
        this.showMessageSnackbar('ERRORS.3');
      }
      return false;
    }));
    this._hotkeysService.add(new Hotkey(['r'], (event: KeyboardEvent): boolean => {
      if (this.selectedBusinessRef && this.selectedBusinessRef.id ){
        this.sendDatatableRefreshCommand();
      }
      return false;
    }));
    this._hotkeysService.add(new Hotkey(['d'], (event: KeyboardEvent): boolean => {
      if (this.selectedBusinessRef && this.selectedBusinessRef.id ){
        this.duplicateServices();
      }
      return false;
    }));
    this._hotkeysService.add(new Hotkey(['c'], (event: KeyboardEvent): boolean => {
      this.sendDatatableServiceCancelCommand();
      return false;
    }));
    this._hotkeysService.add(new Hotkey(['a'], (event: KeyboardEvent): boolean => {
      this.sendDatatableServiceAssignCommand();
      return false;
    }));
    this._hotkeysService.add(new Hotkey(['t'], (event: KeyboardEvent): boolean => {
      this.sendDatatableFocusCommand();
      return false;
    }));
    this._hotkeysService.add(new Hotkey(['left'], (event: KeyboardEvent): boolean => {
      this.sendDatatableApplyPrevPage();
      return false;
    }));
    this._hotkeysService.add(new Hotkey(['right'], (event: KeyboardEvent): boolean => {
      this.sendDatatableApplyNextPage();
      return false;
    }));
    this._hotkeysService.add(new Hotkey(['up'], (event: KeyboardEvent): boolean => {
      this.sendDatatableSelectPrevRow();
      return false;
    }));
    this._hotkeysService.add(new Hotkey(['down'], (event: KeyboardEvent): boolean => {
      this.sendDatatableSelectNextRow();
      return false;
    }));
  }

  //#endregion

  //#region ACTIONS

  /**
   * displays request service dialog
   * @param type
   */
  showRequestServiceDialog(type?) {
    if (this.isThereAnOpenDialog()) { return; }
    if (!this.userRoles.includes('OPERATOR') && !this.userRoles.includes('OPERATION-SUPERVISOR') && !this.userRoles.includes('POI')) {
      this.showMessageSnackbar('ERRORS.2');
      return;
    }

    const dialogConfig = new MatDialogConfig();

    const width = this.layout.total.width > REQUEST_SERVICE_DIALOG_MAX_DIMENSION[0]
      ? REQUEST_SERVICE_DIALOG_MAX_DIMENSION[0]
      : this.layout.total.width - 10;
    let height = this.layout.total.height > REQUEST_SERVICE_DIALOG_MAX_DIMENSION[1]
      ? REQUEST_SERVICE_DIALOG_MAX_DIMENSION[1]
      : this.layout.total.height - 10;
    if (type === 1){
      height =  height + 100;
    }

    dialogConfig.width = `${width}px`;
    dialogConfig.height = `${height + 50}px`;
    dialogConfig.autoFocus = true;
    dialogConfig.data = { type, business: this.selectedBusinessRef };
    console.log('DIALOG CONFIG ==> ', dialogConfig);

    this.requestServiceDialogRef = this.dialog.open(RequestServiceDialogComponent, dialogConfig);
    this.requestServiceDialogRef.afterClosed().subscribe(
      data => {
        this.requestServiceDialogRef = undefined;
      }
    );
  }
  duplicateServices($event?) {
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_DUPLICATE_SERVICE, args: [] });
  }

  /**
   * Sends the command to refresh datatable
   * @param $event
   */
  sendDatatableRefreshCommand($event?) {
    if (this.isThereAnOpenDialog() || (this.lastRefreshCommandSentTimestamp + 2000) > Date.now()) { return; }
    this.lastRefreshCommandSentTimestamp = Date.now();
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_REFRESH, args: [] });
  }
  /**
   * sendDatatableApplyChannelFilterCommand
   * @param $event
   */
  sendDatatableApplyChannelFilterCommand($event?) {
    if (this.isThereAnOpenDialog()) { return; }
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_APPLY_CHANNEL_FILTER, args: [] });
  }
  /**
   * sendDatatableApplyServiceFilterCommand
   * @param $event
   */
  sendDatatableApplyServiceFilterCommand($event?) {
    if (this.isThereAnOpenDialog()) { return; }
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_APPLY_SERVICE_FILTER, args: [] });
  }
  /**
   * sendDatatableApplyChangePageCommand
   * @param $event
   */
  sendDatatableApplyChangePageCommand($event?) {
    if (this.isThereAnOpenDialog()) { return; }
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_CHANGE_PAGE, args: { page: this.page } });
  }
  /**
   * sendDatatableApplyChangePageCountCommand
   * @param $event
   */
  sendDatatableApplyChangePageCountCommand($event?) {
    if (this.isThereAnOpenDialog()) { return; }
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_CHANGE_PAGE_COUNT, args: [] });
  }
  /**
   * sendDatatableFocusCommand
   * @param $event
   */
  sendDatatableFocusCommand($event?) {
    if (this.isThereAnOpenDialog()) { return; }
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_FOCUS, args: [] });
  }
  /**
   * sendDatatableApplyPrevPage
   * @param $event
   */
  sendDatatableApplyPrevPage($event?) {
    if (this.isThereAnOpenDialog() || this.page <= 0) { return; }
    this.page--;
    this.sendDatatableApplyChangePageCommand();
  }
  /**
   * sendDatatableApplyPrevPage
   * @param $event
   */
  sendDatatableApplyNextPage($event?) {
    if (this.isThereAnOpenDialog() || (this.page + 1) >= this.maxPage) { return; }
    this.page++;
    this.sendDatatableApplyChangePageCommand();
  }
  /**
   * sendDatatableSelectPrevRow
   * @param $event
   */
  sendDatatableSelectPrevRow($event?) {
    if (this.isThereAnOpenDialog()) { return; }
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_SELECT_PREV_ROW, args: {} });
  }
  /**
   * sendDatatableSelectNextRow
   * @param $event
   */
  sendDatatableSelectNextRow($event?) {
    if (this.isThereAnOpenDialog()) { return; }
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_SELECT_NEXT_ROW, args: {} });
  }
  /**
   * sendDatatableServiceCancelCommand
   * @param $event
   */
  sendDatatableServiceCancelCommand($event?) {
    if (this.isThereAnOpenDialog()) { return; }
    if (!this.userRoles.includes('OPERATOR') && !this.userRoles.includes('OPERATION-SUPERVISOR') && !this.userRoles.includes('POI')) {
      this.showMessageSnackbar('ERRORS.2');
      return;
    }
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_SERVICE_CANCEL, args: [] });
  }
  /**
   * sendDatatableServiceAssignCommand
   * @param $event
   */
  sendDatatableServiceAssignCommand($event?) {
    if (this.isThereAnOpenDialog()) { return; }
    if (!this.userRoles.includes('OPERATOR') && !this.userRoles.includes('OPERATION-SUPERVISOR')  && !this.userRoles.includes('POI')) {
      this.showMessageSnackbar('ERRORS.2');
      return;
    }
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_SERVICE_ASSIGN, args: [] });
  }

  isThereAnOpenDialog(): boolean {
    return (this.requestServiceDialogRef !== undefined);
  }

  onCheckInboxChange($event) {
    this.operatorWorkstationService.publishLayoutCommand(
      {
        code: this.isInboxVisible
          ? OperatorWorkstationService.LAYOUT_COMMAND_SHOW_INBOX
          : OperatorWorkstationService.LAYOUT_COMMAND_HIDE_INBOX,
        args: []
      }
    );
  }

  onCheckViewAllOperationChange($event) {
    this.operatorWorkstationService.publishToolbarCommand({
      code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_SEE_ALL_OPERATION_CHANGED,
      args: [this.supervisorWatchinAllOperation]
    });
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
    this.isBusinessOwner = this.userRoles.includes('BUSINESS-OWNER');
    this.isPlatformAdmin = this.userRoles.includes('PLATFORM-ADMIN');
    this.isSysAdmin = this.userRoles.includes('SYSADMIN');
  }

  updateChannelFilters(event, channel, activateViewAllOperation){

    this.channelsFilter = event.checked
      ? [...this.channelsFilter, channel]
      : this.channelsFilter.filter(ch => ch  !== channel);

    this.operatorWorkstationService.publishToolbarCommand({
      code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_CHANNELS_FILTER_CHANGED,
      args: [this.channelsFilter]
    });


  }

  onSearchChange(textVal){
    this.searchBarSubject.next(textVal)
  }

  //#endregion


}
