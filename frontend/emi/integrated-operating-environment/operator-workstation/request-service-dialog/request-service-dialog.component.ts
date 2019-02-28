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
  Validators,
  FormArray
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

import { Subject, iif, from, of, forkJoin, Observable, concat, combineLatest } from "rxjs";

////////// ANGULAR MATERIAL //////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog,
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




@Component({
  // tslint:disable-next-line:component-selector
  selector: 'request-service-dialog',
  templateUrl: './Request-service-dialog.component.html',
  styleUrls: ['./Request-service-dialog.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class RequestServiceDialogComponent implements OnInit, OnDestroy {
  //current user roles
  userRoles = undefined
  //Subject to unsubscribe 
  private ngUnsubscribe = new Subject();
  // Main form group
  form: FormGroup;
  // auto-complete search control
  clientNameFilterCtrl: FormControl;
  //Stream of filtered client by auto-complete text
  queriedClientsByAutocomplete$: Observable<any[]>;


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
    private dialogRef: MatDialogRef<RequestServiceDialogComponent>
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }



  ngOnInit() {
    this.queryUserRols();
    this.buildRequesServiceForm();
    this.buildClientNameFilterCtrl();    
  }


  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }



  /**
   * Builds request service form
   */
  buildRequesServiceForm() {
    // Reactive Filter Form
    this.form = new FormGroup({
      client: new FormControl(undefined, [Validators.nullValidator]),
      quantity: new FormControl(1, [Validators.min(1), Validators.max(5)]),
      featureOptionsGroup: new FormControl(),
      destinationOptionsGroup: new FormControl(),
    });
  }

  /**
   * Builds client name input autocomplete search function
   */
  buildClientNameFilterCtrl() {
    this.clientNameFilterCtrl = new FormControl();
    this.queriedClientsByAutocomplete$ = this.clientNameFilterCtrl.valueChanges.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      filter(text =>  (typeof text === 'string' || text instanceof String)),
      mergeMap(x => iif(() => !x, of([]), this.getAllSatelliteClientsFiltered$(x,3)))
    );
  }

  getAllSatelliteClientsFiltered$(filterText: String, limit: number): Observable<any[]> {
    return this.operatorWorkstationService
      .getSatelliteClientsByFilter(filterText, limit)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter(resp => !resp.errors),
        mergeMap(clientSatellites => from(clientSatellites.data.ServiceClientSatellites)),
        toArray(),
        tap(x => console.log(JSON.stringify(x)))
      );
  }

  onClientSelected(client) {
    this.form.patchValue({ client });
  }

  /**
   * extract client name from client object
   * @param client 
   */
  clientDisplayFn(client) {
    return client ? client.generalInfo.name : '';
  }

  submit(event?) {
    console.log(this.form.getRawValue());
    this.dialogRef.close();
  }


  //#region TOOLS - ERRORS HANDLERS - SNACKBAR

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
              this.showMessageSnackbar("ERRORS." + errorDetail.message.code);
            });
          } else {
            response.errors.forEach(errorData => {
              this.showMessageSnackbar("ERRORS." + errorData.message.code);
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
    console.log(JSON.stringify(this.userRoles));
  }
  //#endregion



}
