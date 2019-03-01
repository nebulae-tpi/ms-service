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
  take
} from "rxjs/operators";

import { Subject, fromEvent, of, forkJoin, Observable, concat, combineLatest } from "rxjs";

////////// ANGULAR MATERIAL //////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog,
  MatDialogConfig,
  MatDialogRef
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
import { HotkeysService, Hotkey } from 'angular2-hotkeys';
import { RequestServiceDialogComponent } from '../request-service-dialog/request-service-dialog.component'
import { OperatorWorkstationComponent } from "../operator-workstation.component";

const REQUEST_SERVICE_DIALOG_MAX_DIMENSION = [400, 400];


@Component({
  // tslint:disable-next-line:component-selector
  selector: 'toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class ToolbarComponent implements OnInit, OnDestroy {
  //Subject to unsubscribe 
  private ngUnsubscribe = new Subject();
  //weather or not the inbox should be visible
  isInboxVisible: boolean = false;
  // current layout
  private layout = undefined;
  //current user roles
  userRoles = undefined
  page = 0;

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
    this.configureHotkeys();
  }


  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this._hotkeysService.remove();
  }




  onCheckInboxChange($event) {
    this.operatorWorkstationService.publishLayoutCommand(
      {
        code: this.isInboxVisible
          ? OperatorWorkstationService.LAYOUT_COMMAND_SHOW_INBOX
          : OperatorWorkstationService.LAYOUT_COMMAND_HIDE_INBOX,
        args: []
      }
    )
  }


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

  configureHotkeys() {
    this._hotkeysService.add(new Hotkey(['+', 's'], (event: KeyboardEvent): boolean => {
      this.showRequestServiceDialog();
      return false;
    }));
    this._hotkeysService.add(new Hotkey(['r'], (event: KeyboardEvent): boolean => {
      this.sendDatatableRefreshCommand();
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
  }


  /**
   * displays request service dialog
   * @param $event 
   */
  showRequestServiceDialog($event?) {
    if (this.isThereAnOpenDialog()) return;
    if (!this.userRoles.includes('OPERATOR') || this.userRoles.includes('OPERATION-SUPERVISOR')) {
      this.showMessageSnackbar("ERRORS.2")
      return;
    }

    const dialogConfig = new MatDialogConfig();

    const width = this.layout.total.width > REQUEST_SERVICE_DIALOG_MAX_DIMENSION[0]
      ? REQUEST_SERVICE_DIALOG_MAX_DIMENSION[0]
      : this.layout.total.width - 10;
    const height = this.layout.total.height > REQUEST_SERVICE_DIALOG_MAX_DIMENSION[1]
      ? REQUEST_SERVICE_DIALOG_MAX_DIMENSION[1]
      : this.layout.total.height - 10;

    dialogConfig.width = `${width}px`;
    dialogConfig.height = `${height}px`;
    dialogConfig.autoFocus = true;

    this.requestServiceDialogRef = this.dialog.open(RequestServiceDialogComponent, dialogConfig);
    this.requestServiceDialogRef.afterClosed().subscribe(
      data => {
        this.requestServiceDialogRef = undefined;
      }
    );
  }

  /**
   * Sends the command to refresh datatable 
   * @param $event 
   */
  sendDatatableRefreshCommand($event?) {
    if (this.isThereAnOpenDialog()) return;
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_REFRESH, args: [] });
  }
  /**
   * sendDatatableApplyChannelFilterCommand
   * @param $event 
   */
  sendDatatableApplyChannelFilterCommand($event?) {
    if (this.isThereAnOpenDialog()) return;
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_APPLY_CHANNEL_FILTER, args: [] });
  }
  /**
   * sendDatatableApplyServiceFilterCommand
   * @param $event 
   */
  sendDatatableApplyServiceFilterCommand($event?) {
    if (this.isThereAnOpenDialog()) return;
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_APPLY_SERVICE_FILTER, args: [] });
  }
  /**
   * sendDatatableApplyChangePageCommand
   * @param $event 
   */
  sendDatatableApplyChangePageCommand($event?) {
    if (this.isThereAnOpenDialog()) return;
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_CHANGE_PAGE, args: {page:this.page} });
  }
  /**
   * sendDatatableApplyChangePageCountCommand
   * @param $event 
   */
  sendDatatableApplyChangePageCountCommand($event?) {
    if (this.isThereAnOpenDialog()) return;
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_CHANGE_PAGE_COUNT, args: [] });
  }
  /**
   * sendDatatableFocusCommand
   * @param $event 
   */
  sendDatatableFocusCommand($event?) {
    if (this.isThereAnOpenDialog()) return;
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_FOCUS, args: [] });
  }
  /**
   * sendDatatableApplyPrevPage
   * @param $event 
   */
  sendDatatableApplyPrevPage($event?) {
    if (this.isThereAnOpenDialog() || this.page <= 0) return;
    this.page--;
    this.sendDatatableApplyChangePageCommand();
  }
  /**
   * sendDatatableApplyPrevPage
   * @param $event 
   */
  sendDatatableApplyNextPage($event?) {
    if (this.isThereAnOpenDialog()) return;
    this.page++;
    this.sendDatatableApplyChangePageCommand();
  }
  /**
   * sendDatatableServiceCancelCommand
   * @param $event 
   */
  sendDatatableServiceCancelCommand($event?) {
    if (this.isThereAnOpenDialog()) return;
    if (!this.userRoles.includes('OPERATOR') || this.userRoles.includes('OPERATION-SUPERVISOR')) {
      this.showMessageSnackbar("ERRORS.2")
      return;
    }
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_SERVICE_CANCEL, args: [] });
  }
  /**
   * sendDatatableServiceAssignCommand
   * @param $event 
   */
  sendDatatableServiceAssignCommand($event?) {
    if (this.isThereAnOpenDialog()) return;
    if (!this.userRoles.includes('OPERATOR') || this.userRoles.includes('OPERATION-SUPERVISOR')) {
      this.showMessageSnackbar("ERRORS.2")
      return;
    }
    this.operatorWorkstationService.publishToolbarCommand({ code: OperatorWorkstationService.TOOLBAR_COMMAND_SERVICE_ASSIGN, args: [] });
  }

  isThereAnOpenDialog(): boolean {
    return (this.requestServiceDialogRef !== undefined);
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
        messageKey ? data[messageKey] : "",
        detailMessageKey ? data[detailMessageKey] : "",
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



}
