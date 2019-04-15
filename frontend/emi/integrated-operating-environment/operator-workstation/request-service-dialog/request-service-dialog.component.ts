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
  Validators,
  FormArray
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
  throttleTime,
  distinctUntilChanged,
  take
} from 'rxjs/operators';

import { Subject, iif, from, of, forkJoin, Observable, range, combineLatest } from 'rxjs';

////////// ANGULAR MATERIAL //////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog,
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

const SPECIAL_DESTINATION_PRICE_MODS = { '5000': 5000, '10000': 10000 };


@Component({
  // tslint:disable-next-line:component-selector
  selector: 'request-service-dialog',
  templateUrl: './request-service-dialog.component.html',
  styleUrls: ['./request-service-dialog.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class RequestServiceDialogComponent implements OnInit, OnDestroy {
  // current user roles
  userRoles = undefined;
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();
  // Main form group
  form: FormGroup;
  // auto-complete search control
  clientNameFilterCtrl: FormControl;
  // Stream of filtered client by auto-complete text
  queriedClientsByAutocomplete$: Observable<any[]>;
  // hotkeys configuration for this form only
  hotkeys: Hotkey[] = [];
  clientDefaultTip = 0;

  selectedIndexDoorman = -1;
  doorMenOptions: any[];


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
    private dialogRef: MatDialogRef<RequestServiceDialogComponent>,
    private _hotkeysService: HotkeysService
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }



  ngOnInit() {
    this.queryUserRols();
    this.buildRequesServiceForm();
    this.buildClientNameFilterCtrl();
    this.configureHotkeys();
  }


  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this._hotkeysService.remove(this.hotkeys);
  }



  /**
   * Builds request service form
   */
  buildRequesServiceForm() {
    // Reactive Filter Form
    this.form = new FormGroup({
      client: new FormControl(undefined, [Validators.nullValidator]),
      quantity: new FormControl(1, [Validators.min(1), Validators.max(5)]),
      featureOptionsGroup: new FormControl([]),
      destinationOptionsGroup: new FormControl('DEFAULT'),
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
      tap((selected) => {
        if (typeof selected === 'string' || selected instanceof String) {
          this.doorMenOptions = undefined;
          this.selectedIndexDoorman=-1;
          this.clientDefaultTip=0;
          this.form.patchValue({ client: null });
        }
      }),
      filter(text => (typeof text === 'string' || text instanceof String)),
      mergeMap(x => iif(() => !x, of([]), this.getAllSatelliteClientsFiltered$(x, 3)))
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
      );
  }

  onClientSelected(client) {
    this.doorMenOptions = (client.satelliteInfo && client.satelliteInfo.clientAgreements && client.satelliteInfo.clientAgreements.length > 0 ) ? client.satelliteInfo.clientAgreements: undefined;
    this.form.patchValue({ client });
    if (client) {  
      this.clientDefaultTip = !this.doorMenOptions ? client.satelliteInfo.tip : 0;
      if(this.doorMenOptions && this.doorMenOptions.length == 1 ){
        this.selectedIndexDoorman = 0;
        this.clientDefaultTip = this.doorMenOptions[0].tip;
      }      
    }
  }

  /**
   * extract client name from client object
   * @param client
   */
  clientDisplayFn(client) {
    return client ? client.generalInfo.name : '';
  }

  submit(event?) {
    this.requestService(this.form.getRawValue());
    this.form.patchValue({ client: null });
    this.dialogRef.close();
  }

  /**
   * Send the request service command to the server
   */
  requestService({ client, destinationOptionsGroup, featureOptionsGroup, quantity, paymentType = 'CASH', tip, fare, fareDiscount }) {    
    return range(1, quantity || 1)
      .pipe(
        filter(() => client != null),
        map(requestNumber => ({
          client: {
            id: client._id,
            fullname: client.generalInfo.name,
            username: client.auth ? client.auth.username : null,
            tip : this.doorMenOptions 
              ? this.doorMenOptions[this.selectedIndexDoorman].tip
              : (destinationOptionsGroup && SPECIAL_DESTINATION_PRICE_MODS[destinationOptionsGroup])
                ? SPECIAL_DESTINATION_PRICE_MODS[destinationOptionsGroup]
                : client.satelliteInfo
                  ? client.satelliteInfo.tip
                  : 0,
            tipType: this.doorMenOptions 
              ? this.doorMenOptions[this.selectedIndexDoorman].tipType
              : client.satelliteInfo ? client.satelliteInfo.tipType : '',
            tipClientId: this.doorMenOptions ? this.doorMenOptions[this.selectedIndexDoorman].clientId : client._id,
            referrerDriverDocumentId: client.satelliteInfo ? client.satelliteInfo.referrerDriverDocumentId : null,
            offerMinDistance: client.satelliteInfo ? client.satelliteInfo.offerMinDistance : null,
            offerMaxDistance: client.satelliteInfo ? client.satelliteInfo.offerMaxDistance : null,
          },
          pickUp: {
            marker: {
              lat: client.location.lat,
              lng: client.location.lng,
            },
            polygon: null,
            city: client.generalInfo.city,
            zone: client.generalInfo.zone,
            neighborhood: client.generalInfo.neighborhood,
            addressLine1: client.generalInfo.addressLine1,
            addressLine2: client.generalInfo.addressLine2,
            notes: client.generalInfo.notes
          },
          paymentType,
          requestedFeatures: featureOptionsGroup,
          dropOff: null,
          //dropOffSpecialType: destinationOptionsGroup,
          fareDiscount,
          fare,
          tip,
          request: {
            sourceChannel: 'OPERATOR',
            destChannel: 'DRIVER_APP',
          }
        })),
        tap(rqst => console.log('Enviando REQUEST ==> ', rqst)),
        mergeMap(ioeRequest => this.operatorWorkstationService.requestService$(ioeRequest)),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(
        (result: any) => {
          if (result.data && result.data.IOERequestService && result.data.IOERequestService.accepted) {
            this.showMessageSnackbar('SERVICES.REQUEST_SERVICE_SUCCESS');
          }
        },
        error => {
          this.showMessageSnackbar('SERVICES.ERROR_OPERATION');
          console.log('Error ==> ', error);
        }
      );
  }



  onDoormanChipselected(chipIndex: number){
    console.log('onDoormanChipselected', chipIndex);
    this.selectedIndexDoorman = chipIndex-1;
    this.clientDefaultTip = (this.doorMenOptions && this.selectedIndexDoorman >= this.doorMenOptions.length)
      ? 0
      : this.doorMenOptions[this.selectedIndexDoorman].tip;
  }



  //#region TOOLS - ERRORS HANDLERS - SNACKBAR

  graphQlAlarmsErrorHandler$(response) {
    return of(JSON.parse(JSON.stringify(response))).pipe(
      tap((resp: any) => {
        if (response && Array.isArray(response.errors)) {
          response.errors.forEach(error => {
            this.showMessageSnackbar('ERRORS.' + ((error.extensions||{}).code || 1) )
          });
        }
        return resp;
      })
    );
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

  //#region HOT-KEYS
  configureHotkeys() {

    this.hotkeys = [
      new Hotkey(['ctrl+shift+a'], (event: KeyboardEvent): boolean => {
        this.toggleFeatureOption("AC");
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+s'], (event: KeyboardEvent): boolean => {
        this.toggleFeatureOption("TRUNK");
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+d'], (event: KeyboardEvent): boolean => {
        this.toggleFeatureOption("ROOF_RACK");
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+f'], (event: KeyboardEvent): boolean => {
        this.toggleFeatureOption("PETS");
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+g'], (event: KeyboardEvent): boolean => {
        this.toggleFeatureOption("BIKE_RACK");
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+z'], (event: KeyboardEvent): boolean => {
        this.selectSpecialDestinationOption('DEFAULT');
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+x'], (event: KeyboardEvent): boolean => {
        this.selectSpecialDestinationOption('5000');
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+c'], (event: KeyboardEvent): boolean => {
        this.selectSpecialDestinationOption('10000');
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      // Quantity selection
      new Hotkey(['ctrl+shift+left'], (event: KeyboardEvent): boolean => {
        this.addQuantity(-1);
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+right'], (event: KeyboardEvent): boolean => {
        this.addQuantity(1);
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),      
      // doormen selection
      new Hotkey(['ctrl+shift+1'], (event: KeyboardEvent): boolean => {
        this.onDoormanChipselected(1);
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+2'], (event: KeyboardEvent): boolean => {
        this.onDoormanChipselected(2);
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+3'], (event: KeyboardEvent): boolean => {
        this.onDoormanChipselected(3);
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+4'], (event: KeyboardEvent): boolean => {
        this.onDoormanChipselected(4);
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+5'], (event: KeyboardEvent): boolean => {
        this.onDoormanChipselected(5);
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+6'], (event: KeyboardEvent): boolean => {
        this.onDoormanChipselected(6);
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+7'], (event: KeyboardEvent): boolean => {
        this.onDoormanChipselected(7);
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+8'], (event: KeyboardEvent): boolean => {
        this.onDoormanChipselected(8);
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+9'], (event: KeyboardEvent): boolean => {
        this.onDoormanChipselected(9);
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT'])
    ];
    this._hotkeysService.add(this.hotkeys);
  }

  toggleFeatureOption(feauture) {
    const currentSelection: String[] = this.form.getRawValue().featureOptionsGroup || [];
    const featIndex = currentSelection.indexOf(feauture);
    if (featIndex === -1) currentSelection.push(feauture); else currentSelection.splice(featIndex, 1);
    this.form.patchValue({ featureOptionsGroup: currentSelection });
  }

  addQuantity(quantityaddition) {
    let newQuantity = this.form.get('quantity').value + quantityaddition;
    newQuantity = (newQuantity === 6 && quantityaddition === 1)
      ? 1
      : (newQuantity === 0 && quantityaddition === -1) ? 5 : newQuantity

    
    this.form.patchValue({ quantity: newQuantity });
  }

  selectSpecialDestinationOption(specialDest) {
    this.form.patchValue({ destinationOptionsGroup: specialDest });
  }
  //#endregion

}
