////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  HostListener,
  Inject,
  NgZone
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

import { Subject, iif, from, of, forkJoin, Observable, range, combineLatest, fromEvent } from 'rxjs';

////////// ANGULAR MATERIAL //////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA
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
//////////  Angular Google Maps API //////////
import { MapsAPILoader } from '@agm/core';
import { environment } from '../../../../../../environments/environment';
import { ForceServiceDialogComponent } from '../force-service-dialog/force-service.component';

const SPECIAL_DESTINATION_PRICE_MODS = { '5000': 5000, '10000': 10000 };


@Component({
  // tslint:disable-next-line:component-selector
  selector: 'request-service-dialog',
  templateUrl: './request-service-dialog.component.html',
  styleUrls: ['./request-service-dialog.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class RequestServiceDialogComponent implements OnInit, OnDestroy, AfterViewInit {
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
  selectedBusinessId: any;
  addressLocation: any;

  // google autocomplete
  placesAutocomplete: any;
  // searchElementRef: ElementRef;
  @ViewChild('addressAutocomplete') addressAutocomplete: ElementRef;
  selectedGooglePlace = null;
  showPreciseLocation: Boolean;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
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
    private _hotkeysService: HotkeysService,
    private mapsAPILoader: MapsAPILoader,
    private ngZone: NgZone,
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }



  ngOnInit() {
    this.queryUserRols();
    this.buildRequesServiceForm();
    this.buildClientNameFilterCtrl();
    this.configureHotkeys();
    this.listenBusinessChanges();
  }

  listenBusinessChanges() {
    this.toolbarService.onSelectedBusiness$
      .pipe(
        tap(bu => {
          this.selectedBusinessId = bu ? bu.id : null;
          //this.showPreciseLocation = this.selectedBusinessId === "bf2807e4-e97f-43eb-b15d-09c2aff8b2ab";
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();
  }

  ngAfterViewInit(){
    this.buildPlacesAutoComplete();
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this._hotkeysService.remove(this.hotkeys);
  }



  buildPlacesAutoComplete() {
    if (this.addressAutocomplete) {
      this.mapsAPILoader.load().then(() => {
        this.placesAutocomplete = new google.maps.places.Autocomplete(
          this.addressAutocomplete.nativeElement,
          {
            componentRestrictions: { country: 'co' }
          }
        );

        if (this.data.business && this.data.business.attributes && this.data.business.attributes.length > 0 ){
          const buAttributes = this.data.business.attributes;
          const attrs = buAttributes.filter(e => e.key === 'latitude' || e.key === 'longitude');

          if (attrs.length === 2){
            const lat =  attrs.find(e => e.key === 'latitude').value;
            const lng =  attrs.find(e => e.key === 'longitude').value;

            const circle = new google.maps.Circle({
              center: new google.maps.LatLng(parseFloat(lat), parseFloat(lng)),
              radius: 20000 // meters
            });
            this.placesAutocomplete.setOptions({ bounds: circle.getBounds(), strictBounds: true });
          }

        }

        this.placesAutocomplete.addListener('place_changed', () => {
          this.ngZone.run(() => {
            // get the place result
            const place: google.maps.places.PlaceResult = this.placesAutocomplete.getPlace();            
            // verify result
            if (place.geometry === undefined || place.geometry === null) {
              return;
            }
            // this.addressAutocomplete.nativeElement.value.split(',').splice(0, 3).join(',')
            // console.log('place.formatted_address' , place.formatted_address)
            this.selectedGooglePlace = {
              address: this.addressAutocomplete.nativeElement.value.split(',').splice(0, 3).join(','),
              coords: {
                latitude: place.geometry.location.lat(),
                longitude: place.geometry.location.lng()
              }
            };
            this.addressLocation = this.selectedGooglePlace.address;

          });
        });
      });

      fromEvent(this.addressAutocomplete.nativeElement, 'keydown')
        .pipe(
          filter((e: any) => this.selectedGooglePlace && e.key === 'Backspace'),
          tap(e => this.clearGoogleLocation()),
          takeUntil(this.ngUnsubscribe)
        ).subscribe();

    }
  }

  clearGoogleLocation(){
    this.form.patchValue({clientGoogleAdress: null});
    this.selectedGooglePlace = null;
  }

  onBlurClientGoogleAdress(){
    setTimeout(() => {
      if(!this.selectedGooglePlace || this.selectedGooglePlace === null){
        this.clearGoogleLocation()
      }
  }, 500);
  }



  /**
   * Builds request service form
   */
  buildRequesServiceForm() {
    // Reactive Filter Form
    this.form = new FormGroup({
      client: new FormControl(undefined, [Validators.nullValidator]),
      clientGoogleAdress: new FormControl(null),
      clientAddress: new FormControl(null),
      clientNeighborhood: new FormControl(null),
      clientLocationRef: new FormControl(null),
      clientName: new FormControl(null),
      quantity: new FormControl(1, [Validators.min(1), Validators.max(5)]),
      featureOptionsGroup: new FormControl([]),
      destinationOptionsGroup: new FormControl('DEFAULT'),
      clientTip: new FormControl(0)
    },
      // [this.validateFormAcordingType.bind(this)]
    );
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
          this.selectedIndexDoorman = -1;
          this.clientDefaultTip = 0;
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
    this.doorMenOptions = (client.satelliteInfo && client.satelliteInfo.clientAgreements && client.satelliteInfo.clientAgreements.length > 0 )
      ? client.satelliteInfo.clientAgreements : undefined;
    this.form.patchValue({ client });
    if (client) {
      this.clientDefaultTip = !this.doorMenOptions ? client.satelliteInfo.tip : 0;
      if (this.doorMenOptions && this.doorMenOptions.length === 1 ){
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
    this.form.patchValue({  });
    let rawRequest = {
      ...this.form.getRawValue()
    };
    if (this.data.type === 1){
      rawRequest = {...rawRequest,
        client: {
          _id: null,
          generalInfo: {
            name: rawRequest.clientName.toUpperCase(),
            addressLine1: this.addressLocation,
            addressLine2: rawRequest.clientLocationRef,
            neighborhood: rawRequest.clientNeighborhood,
            unaccurateLocation: this.addressLocation !== this.selectedGooglePlace.address
          },
          location: {
            lat: this.selectedGooglePlace.coords.latitude,
            lng: this.selectedGooglePlace.coords.longitude
          }
        },
        fareDiscount: undefined,
        tip: rawRequest.clientTip
      };
    }
    this.requestService(rawRequest);
    this.form.patchValue({ client: null });
    this.selectedGooglePlace = null;
    this.dialogRef.close();
  }

  showConfirmationDialog$(dialogMessage, dialogTitle) {
    return this.dialog
      // Opens confirm dialog
      .open(ForceServiceDialogComponent, {
        data: {
          dialogMessage,
          dialogTitle
        }
      })
      .afterClosed()
      .pipe(
        filter(okButton => okButton),
      );
  }
  generateRequesData(client, destinationOptionsGroup, featureOptionsGroup, quantity, paymentType = 'CASH', tip, fare, fareDiscount, forced = false){
    return {
      client: {
        id: client._id,
        fullname: client.generalInfo.name,
        username: client.auth ? client.auth.username : null,
        tip : (destinationOptionsGroup && SPECIAL_DESTINATION_PRICE_MODS[destinationOptionsGroup])
        ? SPECIAL_DESTINATION_PRICE_MODS[destinationOptionsGroup]
          : this.doorMenOptions
          ? this.doorMenOptions[this.selectedIndexDoorman].tip
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
        unaccurateLocation: client.generalInfo.unaccurateLocation,
        polygon: null,
        city: client.generalInfo.city,
        zone: client.generalInfo.zone,
        neighborhood: client.generalInfo.neighborhood,
        addressLine1: client.generalInfo.addressLine1,
        addressLine2: client.generalInfo.addressLine2,
        notes: client.generalInfo.notes
      },
      forced,
      paymentType,
      requestedFeatures: featureOptionsGroup,
      dropOff: null,
      // dropOffSpecialType: destinationOptionsGroup,
      fareDiscount,
      fare,
      tip,
      request: {
        sourceChannel: 'OPERATOR',
        destChannel: 'DRIVER_APP',
      }
    }
  }
  /**
   * Send the request service command to the server
   */
  requestService({ client, destinationOptionsGroup, featureOptionsGroup, quantity, paymentType = 'CASH', tip, fare, fareDiscount }) {
    return range(1, quantity || 1)
      .pipe(
        filter(() => (this.data.type === 0 && client != null) || ( this.data.type === 1 && this.selectedGooglePlace)),
        map(requestNumber => (this.generateRequesData(client, destinationOptionsGroup, featureOptionsGroup, quantity, paymentType = 'CASH', tip, fare, fareDiscount))),
        tap(rqst => console.log('Enviando REQUEST ==> ', JSON.stringify(rqst))),
      )
      .subscribe(
        (result: any) => {
          console.log("RESULT ===> ", result)
          this.operatorWorkstationService.requestServiceSubject$.next(result)
        },
        error => {
        }
      );
  }



  onDoormanChipselected(chipIndex: number){
    console.log('onDoormanChipselected', chipIndex);
    this.selectedIndexDoorman = chipIndex - 1;
    this.clientDefaultTip = (this.doorMenOptions && this.selectedIndexDoorman >= this.doorMenOptions.length)
      ? 0
      : this.doorMenOptions[this.selectedIndexDoorman].tip;
  }

  // validateFormAcordingType(form: FormGroup){
  //   const rawValue = form.getRawValue();
  //   if (this.data.type === 1){
  //     // if (!rawValue.clientGoogleAdress){
  //     //   return { missingGoogleLocation: true };
  //     // }
  //     // if (!rawValue.clientGoogleAdress){
  //     //   return { missingGoogleLocation: true };
  //     // }
  //   }
  //   return null;
  // }



  //#region TOOLS - ERRORS HANDLERS - SNACKBAR

  graphQlAlarmsErrorHandler$(response) {
    return of(JSON.parse(JSON.stringify(response))).pipe(
      tap((resp: any) => {
        if (response && Array.isArray(response.errors)) {
          response.errors.forEach(error => {
            this.showMessageSnackbar('ERRORS.' + ((error.extensions || {}).code || 1) );
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
  showMessageSnackbar(messageKey, detailMessageKey?, duration= 2000) {
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
          duration
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
        this.toggleFeatureOption('AC');
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+s'], (event: KeyboardEvent): boolean => {
        this.toggleFeatureOption('TRUNK');
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+d'], (event: KeyboardEvent): boolean => {
        this.toggleFeatureOption('ROOF_RACK');
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+f'], (event: KeyboardEvent): boolean => {
        this.toggleFeatureOption('PETS');
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+shift+g'], (event: KeyboardEvent): boolean => {
        this.toggleFeatureOption('BIKE_RACK');
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
      }, ['INPUT', 'TEXTAREA', 'SELECT']),
      new Hotkey(['ctrl+l'], (event: KeyboardEvent): boolean => {
        this.clearGoogleLocation();
        return false;
      }, ['INPUT', 'TEXTAREA', 'SELECT'])
    ];
    this._hotkeysService.add(this.hotkeys);
  }

  toggleFeatureOption(feauture) {
    const currentSelection: String[] = this.form.getRawValue().featureOptionsGroup || [];
    const featIndex = currentSelection.indexOf(feauture);
    if (featIndex === -1) { currentSelection.push(feauture); } else { currentSelection.splice(featIndex, 1); }
    this.form.patchValue({ featureOptionsGroup: currentSelection });
  }

  addQuantity(quantityaddition) {
    let newQuantity = this.form.get('quantity').value + quantityaddition;
    newQuantity = (newQuantity === 6 && quantityaddition === 1)
      ? 1
      : (newQuantity === 0 && quantityaddition === -1) ? 5 : newQuantity;


    this.form.patchValue({ quantity: newQuantity });
  }

  selectSpecialDestinationOption(specialDest) {
    this.form.patchValue({ destinationOptionsGroup: specialDest });
  }
  //#endregion

}
