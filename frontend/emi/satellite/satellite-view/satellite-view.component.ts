import { AfterViewInit } from '@angular/core';
////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef
} from "@angular/core";

import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
  FormArray
} from "@angular/forms";
import { DatePipe } from '@angular/common';

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

import { Subject, fromEvent, of, forkJoin, Observable, concat, combineLatest, range, from, interval } from "rxjs";

////////// ANGULAR MATERIAL //////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog
} from "@angular/material";
import { fuseAnimations } from "../../../../core/animations";

//////////// i18n ////////////
import {
  TranslateService,
  LangChangeEvent,
  TranslationChangeEvent
} from "@ngx-translate/core";
import { locale as english } from "../i18n/en";
import { locale as spanish } from "../i18n/es";
import { FuseTranslationLoaderService } from "../../../../core/services/translation-loader.service";

////////// GOOGLE MAP ///////////

import { MapRef } from './map-entities/agmMapRef';
import { MarkerRef, MARKER_REF_ORIGINAL_INFO_WINDOW_CONTENT, Point } from './map-entities/markerRef';

///////// DATEPICKER //////////
import * as moment from "moment";

//////////// Other Services ////////////
import { KeycloakService } from "keycloak-angular";
import { SatelliteViewService } from './satellite-view.service';
import { ToolbarService } from "../../../toolbar/toolbar.service";

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'service',
  templateUrl: './satellite-view.component.html',
  styleUrls: ['./satellite-view.component.scss'],
  animations: fuseAnimations
})
export class SatelliteViewComponent implements OnInit, AfterViewInit, OnDestroy {
  //Subject to unsubscribe
  private ngUnsubscribe = new Subject();

  private serviceMarkerUpdater = new Subject();

  @ViewChild('gmap') gmapElement: any;

  satelliteClientQueryFiltered$: Observable<any[]>;
  clientSatelliteList = [];

  openedSideNav: boolean = true;
  map: MapRef;
  bounds: google.maps.LatLngBounds;
  markers: MarkerRef[] = [];
  selectedMarker: MarkerRef;
  features = ['AC', 'TRUNK', 'ROOF_RACK', 'PETS', 'BIKE_RACK' ];
  paymentTypes = ['CASH', 'CREDIT_CARD'];

  isOperator = false;
  isSatellite = false;

  clientMarker: MarkerRef = null;
  clientData = null;
  serviceList = [];
  selectedService = null;

  dateTest = null;

  //////// FORMS //////////
  requestForm: FormGroup;
  clientFilterCtrl: FormControl;
  requestButtonDisabled = false;

  constructor(
    private datePipe: DatePipe,
    private formBuilder: FormBuilder,
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private snackBar: MatSnackBar,
    private satelliteViewService: SatelliteViewService,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private keycloakService: KeycloakService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog
  ) {
      this.translationLoader.loadTranslations(english, spanish);
  }

  transformDate(date) {
    return this.datePipe.transform(date, 'dd/MM/y HH:mm:ss');
  }

  ngOnInit() {
    this.initMap(); // initialize the map element
    this.buildRequestTaxiForm();
    this.loadServiceClientSatellite();
    this.loadAliveServicesList();
    this.initServiceUpdater();
    this.subscribeServiceServiceUpdated();
    //this.testerLocation();
  }

  ngAfterViewInit(): void {
    // outputs `I am span`
    this.createQueryFilter();
}

  displayFn(satelliteClient) {
    return satelliteClient ? satelliteClient.generalInfo.name : '';
  }

  createQueryFilter(){
    this.clientFilterCtrl = new FormControl();
    this.satelliteClientQueryFiltered$ =
    this.clientFilterCtrl.valueChanges.pipe(
        startWith(undefined),
        debounceTime(500),
        distinctUntilChanged(),
        mergeMap((data: any) => {
          let clientText = null;
          if (typeof data === 'string'){
            clientText = data;
          }else if(data){
            clientText = data.generalInfo.name;
          }

          return this.getAllSatelliteClientsFiltered(clientText, 30);
        })
      );
  }

  getAllSatelliteClientsFiltered(filterText: String, limit: number): Observable<any[]> {
    return this.satelliteViewService.getSatelliteClientsByFilter(filterText, limit)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter(resp => !resp.errors),
        mergeMap(clientSatellites => {
          this.clientSatelliteList = clientSatellites;
          return from(clientSatellites.data.ServiceClientSatellites);
        }),
        toArray()
      );
  }

  initServiceUpdater(){
    this.serviceMarkerUpdater.pipe(
      takeUntil(this.ngUnsubscribe)
    ).subscribe((service: any) => {
      if(service){
        const marker = this.getMarkerFromArray(service._id);
        const lastServiceData = this.getServiceFromArray(service._id);

        // Check if the last service is older than the new one
        // If it is newer we have to update the info into the service list and the map
        if (!lastServiceData || lastServiceData.lastModificationTimestamp < service.lastModificationTimestamp) {

          // Ignore the closed services that there are not on the map neither the array
          if (!lastServiceData && service.closed){
            return;
          }

          // If the service does not exist on the array and it is not closed,
          // we have to add this service to the map and the service array.
          if (!lastServiceData && !service.closed){

            if (!(this.isSatellite && (service.state === 'ON_BOARD' || service.state === 'DONE'))){
              this.serviceList.push(service);
              this.serviceList.sort((service1,service2) => (service1.timestamp > service2.timestamp) ? -1 : ((service2.timestamp > service1.timestamp) ? 1 : 0));
              this.createServiceMarker(service);
            }
          }else{
            if (lastServiceData){
              // If the service was closed , we have to remove the service from the table and the map
              if (service.closed){
                this.removeServiceFromArray(service._id);
                this.removeMarkerFromMap(marker);
              }else{

                if(this.isSatellite){

                  if(service.state === 'ON_BOARD' || service.state === 'DONE'){
                    this.removeServiceFromArray(service._id);
                    this.removeMarkerFromMap(marker);
                    return;
                  }                  
                }

                //console.log('Check update icon => ', (marker && lastServiceData.state !== service.state));

                // Check if the icon should be updated
                if (marker && lastServiceData.state !== service.state){
                  const iconUrl = this.getServiceMarkerIcon(service);
                  marker.updateIcon(iconUrl);
                }

                //console.log('Check update location => ', marker && service.location && (!lastServiceData.location || lastServiceData.location !== service.location));

                // Check if the location should be updated
                if (marker && service.location && (!lastServiceData.location || lastServiceData.location !== service.location)){
                  //console.log('New location => ', service.location);
                  marker.sendNewLocation(service.location);
                }

                if (!marker){
                  this.createServiceMarker(service);
                }

                // Update the service on the array
                this.updateServiceOnArray(service);
              }

            }
          }
        }
      }
    });
  }

  getSatelliteClientFromArray(clientId){
    const clientSatellite = this.clientSatelliteList.find(item => item._id === clientId);
    return clientSatellite;
  }

  setSelectedClientSatellite(selectedSatelliteClient) {
    //console.log('selectedSatelliteClient => ', selectedSatelliteClient);
    if (selectedSatelliteClient){
      if (this.clientMarker){
        this.removeMarkerFromMap(this.clientMarker, false);
      }
      this.clientData = selectedSatelliteClient;

      if (!this.clientData.location || !this.clientData.location.lat || !this.clientData.location.lng){
        this.showSnackBar('SATELLITE.SERVICES.CLIENT_LOCATION_MISSING');
      } else {      
        this.createPickUpMarker(selectedSatelliteClient._id, this.clientData.location.lat, this.clientData.location.lng);
      }

      this.requestForm.patchValue({
        notes: this.clientData.generalInfo.notes
      });
    }
  }

  /**
   * Center map
   * @param location 
   */
  centerMap(location) {
    this.map.setCenter(location);
    this.map.setZoom(19);
  }

  /**
   * Update the service info on the array
   * @param serviceId service id
   */
  updateServiceOnArray(service){
    const index = this.serviceList.findIndex(item => item._id === service._id);
    // this.serviceList[index] = service;
    this.updateServiceItem(this.serviceList[index], service);
  }

  updateServiceItem(serviceFromArray, newServiceData){
    serviceFromArray.shiftId = newServiceData.shiftId;
    serviceFromArray.requestedFeatures = newServiceData.requestedFeatures;
    serviceFromArray.client = newServiceData.client;
    serviceFromArray.pickUp = newServiceData.pickUp;
    serviceFromArray.dropOff = newServiceData.dropOff;
    serviceFromArray.verificationCode = newServiceData.verificationCode;
    serviceFromArray.pickUpETA = newServiceData.pickUpETA;
    serviceFromArray.dropOffpETA = newServiceData.dropOffpETA;
    serviceFromArray.paymentType = newServiceData.paymentType;
    serviceFromArray.fareDiscount = newServiceData.fareDiscount;
    serviceFromArray.fare = newServiceData.fare;
    serviceFromArray.tip = newServiceData.tip;
    serviceFromArray.route = newServiceData.route;
    serviceFromArray.state = newServiceData.state;
    serviceFromArray.StateChanges = newServiceData.StateChanges;
    serviceFromArray.location = newServiceData.location;
    serviceFromArray.vehicle = newServiceData.vehicle;
    serviceFromArray.driver = newServiceData.driver;
    serviceFromArray.lastModificationTimestamp = newServiceData.lastModificationTimestamp;
  }

  /**
   * Removes a service from the array according to its index
   * @param serviceId service id
   */
  removeServiceFromArray(serviceId){
    const index = this.serviceList.findIndex(service => service._id === serviceId);
    if (index > -1) {
      this.serviceList.splice(index, 1);
    }
  }

  /**
   * Removes a marker from the marker array and the map
   * @param marker marker to remove
   * @param boolean indicates if the marker must be removed from the marker array
   */
  removeMarkerFromMap(marker, removeFromArray = true) {
    if(!marker){
      return;
    }

    marker.setMap(null);

    if(removeFromArray){
      const index = this.markers.findIndex(item => item.id === marker.id);

      if(index > -1){
        this.markers.splice(index, 1);
      }
    }
  }


  /**
   * Indicates if the marker indicated exists in the array of markers
   * @param markerId marker id
   */
  getMarkerFromArray(markerId){
    const markersFiltered = this.markers.find(marker => marker.id == markerId);
    // console.log('getMarkerFromArray => ', this.markers, markerId);
    // console.log('markersFiltered => ', markersFiltered);
    return markersFiltered;
  }


  initMap() {
    this.map = new MapRef(this.gmapElement.nativeElement, {
      center: new google.maps.LatLng(6.1701312, -75.6058417),
      zoom: 14,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
  }

  /**
   * Builds request taxi form
   */
  buildRequestTaxiForm() {
    // Reactive Filter Form
    this.requestForm = new FormGroup({
      taxisNumber: new FormControl(1),
      paymentType: new FormControl({value: 'CASH', disabled: true}, Validators.required),
      notes: new FormControl(''),
      features : new FormArray([]),
      tip: new FormControl(null, [Validators.max(100000), Validators.min(500)])
    });

    this.features.forEach(featureKey => {
      const featureControl = (this.requestForm.get('features') as FormArray).controls.find(control => control.get('name').value === featureKey);
      if (!featureControl) {
        (this.requestForm.get('features') as FormArray).push(
          new FormGroup({
            name: new FormControl(featureKey),
            active: new FormControl(false)
          })
        );
      }
    });
  }

  /**
   * Loads the services that are alive
   */
  loadAliveServicesList(){
    this.getServiceList$()
    .pipe(
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe(services => {
      if(!services){
        return;
      }

      this.serviceList = services.filter(service => this.isOperator 
        || this.isSatellite && service.state !== 'ON_BOARD' && service.state !== 'DONE');

      this.serviceList.sort((service1,service2) => (service1.timestamp > service2.timestamp) ? -1 : ((service2.timestamp > service1.timestamp) ? 1 : 0));


      if(this.serviceList && this.serviceList.length > 0){
        this.serviceList.forEach(service => {

          
          this.createServiceMarker(service);
        })
      }
      console.log('loadServiceSatelliteList  => ', this.serviceList);
    });
  }



  /**
   * Loads the client satellite data
   */
  loadServiceClientSatellite(){
    this.checkRoles$()
    .pipe(
      filter(roles => roles.some(role => role === 'SATELLITE') && !roles.some(role => role === 'OPERATOR')),
      mergeMap(() => this.getServiceClientSatellite$()),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(client => {
      if (!client){
        console.log('Error => Not client data');
      }
      this.setSelectedClientSatellite(client);
    });
  }

  createPickUpMarker(id, lat, lng){
    const pickUpMarker = new MarkerRef(
      id,
      new Point({coordinates: {lat: lat, lng: lng}}),
      {
        position: {
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        },
        map: this.map,
        clickable: false
      }
    );
    this.clientMarker = pickUpMarker;
    this.clientMarker.updateIcon('./assets/satellite/icono-sucursal.svg');
    this.addMarkerToMap(pickUpMarker);
    this.centerMap(pickUpMarker.getPosition());
  }

  createServiceMarker(service){
    if (!service || !service.location){
      return;
    }
    const serviceMarker = new MarkerRef(
      service._id,
      new Point({coordinates: {lat: service.location.lat, lng: service.location.lng}}),
      {
        position: {
          lat: parseFloat(service.location.lat),
          lng: parseFloat(service.location.lng)
        },
        map: this.map,
        draggable: false,
        clickable: true
      }
    );

    const iconUrl = this.getServiceMarkerIcon(service);
    serviceMarker.updateIcon(iconUrl);

    this.markers.push(serviceMarker);
    this.addMarkerToMap(serviceMarker);
  }

  getServiceMarkerIcon(service){
    let iconUrl = null;
    switch (service.state){
      case 'ASSIGNED':
        iconUrl = './assets/satellite/marker_orange.png';
        break;
      case 'ARRIVED':
        iconUrl = './assets/satellite/marker_blue.png';
        break;
      case 'ON_BOARD':
        iconUrl = './assets/satellite/marker_gray.png';
        break;
      case 'CANCELLED_CLIENT':
        iconUrl = './assets/satellite/marker_red.png';
        break;
      case 'CANCELLED_DRIVER':
        iconUrl = './assets/satellite/marker_red.png';
        break;
      case 'CANCELLED_OPERATOR':
        iconUrl = './assets/satellite/marker_red.png';
        break;
      case 'DONE':
        iconUrl = './assets/satellite/marker_green.png';
        break;
      default:
        iconUrl = '';
    }
    return iconUrl;
  }

  /**
   * Gets the service list
   */
  getServiceList$(){
    return this.satelliteViewService.getServiceList$()
    .pipe(
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      map(resp => resp.data.ServiceServicesSatellite)
    );
  }

  /**
   * Gets the service client data
   */
  getServiceClientSatellite$(){
    return this.satelliteViewService.getServiceClientSatellite$()
    .pipe(
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      map(resp => resp.data.ServiceClientSatellite)
    );
  }

  subscribeServiceServiceUpdated(){
    this.satelliteViewService.subscribeServiceServiceUpdatedSubscription$()
    .pipe(
      map(subscription => subscription.data.ServiceServiceUpdatedSubscription),
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe((service: any) => {
      console.log('subscribeServiceServiceUpdated =>', service);
      this.serviceMarkerUpdater.next(service);
    });
  }

  testerLocation() {
    interval(5000)
    .subscribe(() => {
      const testArray = ['ASSIGNED', 'ON_BOARD', 'CANCELLED_CLIENT', 'CANCELLED_DRIVER', 'CANCELLED_OPERATOR', 'DONE'];

      if (!this.serviceList || this.serviceList.length === 0){
        return;
      }

      const service = JSON.parse(JSON.stringify(this.serviceList[0]));

      service.location.lat = this.getRandomFloat(6.1601312, 6.1701312);
      service.location.lng = this.getRandomFloat(-75.6158417, -75.5958417);
      service.lastModificationTimestamp = new Date().getTime();
      service.state = testArray[this.getRandomInt(0, 5)];

      if (!this.dateTest){
        this.dateTest = new Date();
      }

      if (new Date().getTime() > (this.dateTest.getTime() + 1 * 60 * 1000)){
        service.closed = true;
        console.log('SERVICIO CERRADO ********************************');
      }

      this.serviceMarkerUpdater.next(service);
    });
  }

  getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


  /**
   * Send a request service to the server
   */
  requestService(){
    const requestServiceForm = this.requestForm.getRawValue();

    this.requestButtonDisabled = false;
    return of(requestServiceForm.taxisNumber || 1)
    .pipe(
      tap(taxisNumber => {
        this.requestButtonDisabled = true;
      }),
      mergeMap(taxisNumber => range(1, taxisNumber)),
      map(requestNumber => {
        const features = requestServiceForm.features.filter(feature => feature.active).map(feature => feature.name);

        return {
          client: {
            id: this.clientData._id,
            fullname: this.clientData.generalInfo.name,
            username: this.clientData.auth ? this.clientData.auth.username: null,
            tip: this.clientData.satelliteInfo ? this.clientData.satelliteInfo.tip: 0,
            tipType: this.clientData.satelliteInfo ? this.clientData.satelliteInfo.tipType: '',                        
            referrerDriverDocumentId: this.clientData.satelliteInfo ? this.clientData.satelliteInfo.referrerDriverDocumentId: null,
            offerMinDistance: this.clientData.satelliteInfo ? this.clientData.satelliteInfo.offerMinDistance: null,
            offerMaxDistance: this.clientData.satelliteInfo ? this.clientData.satelliteInfo.offerMaxDistance: null,
          },
          pickUp: {
            marker: {
              lat: this.clientMarker.getPosition().lat(),
              lng: this.clientMarker.getPosition().lng(),
              // lat: this.clientData.location.lat,clientMarker
              // lng: this.clientData.location.lng,
            },
            polygon: null,
            city: this.clientData.generalInfo.city,
            zone: this.clientData.generalInfo.zone,
            neighborhood: this.clientData.generalInfo.neighborhood,
            addressLine1: this.clientData.generalInfo.addressLine1,
            addressLine2: this.clientData.generalInfo.addressLine2,
            notes: requestServiceForm.notes
          },
          paymentType: requestServiceForm.paymentType, // ?
          requestedFeatures: features,
          dropOff: null,
          fareDiscount: null,
          fare: null,
          tip: requestServiceForm.tip,
        };
      }),
      mergeMap(serviceCoreRequest=> this.satelliteViewService.createServiceCoreRequestService$(serviceCoreRequest)),
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe(
      (result: any) => {
        if (result.data && result.data.ServiceCoreRequestService && result.data.ServiceCoreRequestService.accepted) {
          this.showSnackBar('SATELLITE.SERVICES.REQUEST_SERVICE_SUCCESS');
          this.buildRequestTaxiForm();
          this.clientFilterCtrl.reset();
          if(this.isOperator){
            this.clientData = null;
          }          
        }
      },
      error => {
        this.showSnackBar('SATELLITE.ERROR_OPERATION');
        console.log('Error ==> ', error);
        this.activeRequestButton();
      },
      () => {
        this.activeRequestButton();
      }
    );
  }

  /**
   * Activates the request button.
   */
  activeRequestButton(){
    this.requestButtonDisabled = false;
  }

  /**
   * Checks if the logged user has role OPERATOR
   */
  checkRoles$() {
    return of(this.keycloakService.getUserRoles(true))
    .pipe(
      tap(userRoles => {
        this.isOperator = userRoles.some(role => role === 'OPERATOR');
        this.isSatellite = userRoles.some(role => role === 'SATELLITE');
      })
    )
  }

  onSelectedService(service){
    // this.selectedService = service;
    const marker = this.getMarkerFromArray(service._id);
    if (marker){
      this.onMarkerClick(marker, null);
    }
  }


   /**
   * Adds a marker to the map and configure observables to listen to the events associated with the marker (Click, etc)
   * @param marker marker to be added
   */
  addMarkerToMap(marker: MarkerRef) {
    marker.inizialiteEvents();
    marker.clickEvent.subscribe(event => {
      this.onMarkerClick(marker, event);
    });
  }

    /**
   * Opens the infoWindow of the clicked marker and closes the other infoWindows in case that these were open.
   * @param marker clicked marker
   * @param event Event
   */
  onMarkerClick(marker: MarkerRef, event) {
    console.log('onMarkerClick ', marker);
    this.selectedService = this.getServiceFromArray(marker.id);
    this.selectedMarker = marker;
    this.markers.forEach(m => {
      m.infoWindow.close();
      m.setAnimation(null);
    });
    marker.setAnimation(google.maps.Animation.BOUNCE);
    marker.setAnimation(null);
    this.selectedService = this.getServiceFromArray(marker.id);
    marker.updateInfoWindowContent(this.buildServiceInfoWindowContent(this.selectedService));
    marker.infoWindow.open(this.map, marker);
  }

  /**
   * get services from cache
   */
  getServiceFromArray(serviceId){
    if (this.serviceList && this.serviceList.length > 0){
      return this.serviceList.find(service => service._id === serviceId);
    }
    return null;
  }

    /**
   * get services from cache
   */
  getServiceIndexFromArray(serviceId){
    if(this.serviceList && this.serviceList.length > 0){
      return this.serviceList.find(service => service._id == serviceId);
    }
    return null;
  }

  buildServiceInfoWindowContent(service){
    //console.log('buildServiceInfoWindowContent', service);
    if(!service){
      return;
    }


    const serviceTitle = this.translationLoader.getTranslate().instant('SATELLITE.SERVICE');
    const licensePlateTitle = this.translationLoader.getTranslate().instant('SATELLITE.SERVICES.LICENSE_PLATE');
    const serviceReferenceTitle = this.translationLoader.getTranslate().instant('SATELLITE.SERVICES.REFERENCE');
    const addressTitle = this.translationLoader.getTranslate().instant('SATELLITE.SERVICES.ADDRESS');
    const stateTitle = this.translationLoader.getTranslate().instant('SATELLITE.SERVICES.STATE');

    const serviceTimestamp = new Date(service.timestamp);
    const serviceState = this.translationLoader.getTranslate().instant('SATELLITE.SERVICES.STATES.'+ service.state);
    let serviceInfoWindowContent = `<html>
      <body>
          <div id="serviceInfoWindow">
          <p> ${this.transformDate(serviceTimestamp)}</p>
          <p> <strong>${stateTitle}: </strong>${serviceState}</p>
          <p> <strong>${licensePlateTitle}: </strong>${service.vehicle.licensePlate}</p>          
    `;
    
    if(service.pickUp.notes){
      serviceInfoWindowContent = serviceInfoWindowContent + 
      `<p> <strong>${serviceReferenceTitle}: </strong>${service.pickUp.notes}</p>`;
    }
    
    
    serviceInfoWindowContent = serviceInfoWindowContent + 
      ` <p> <strong>${addressTitle}: </strong>${service.pickUp.addressLine1} - ${service.pickUp.addressLine2}</p>`;

    serviceInfoWindowContent = serviceInfoWindowContent 
    + `</div>
    </body>
    </html>
  `;



    return serviceInfoWindowContent;
  }


  showSnackBar(message) {
    this.snackBar.open(this.translationLoader.getTranslate().instant(message),
      this.translationLoader.getTranslate().instant('SATELLITE.CLOSE'), {duration: 5000}
    );
  }

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

  ngOnDestroy() {
    if(this.markers){
      this.markers.forEach(marker => {
        marker.destroy();
      })
    }
    this.serviceMarkerUpdater.complete();
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}
