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

import { Subject, fromEvent, of, forkJoin, Observable, concat, combineLatest, range } from "rxjs";

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
export class SatelliteViewComponent implements OnInit, OnDestroy {
  //Subject to unsubscribe 
  private ngUnsubscribe = new Subject();

  private serviceMarkerUpdater = new Subject();

  @ViewChild('gmap') gmapElement: any;

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

    //////// FORMS //////////
  requestForm: FormGroup;

  constructor(    
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
    

  ngOnInit() {
    this.initMap(); // initialize the map element
    this.buildRequestTaxiForm(); 
    this.loadServiceClientSatellite();
    this.loadAliveServicesList();   
    this.initServiceUpdater();
    this.subscribeServiceServiceUpdated();
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
          if(!lastServiceData && service.closed){
            return;
          }

          // If the service does not exist on the array and it is not closed, 
          //we have to add this service to the map and the service array.
          if(!lastServiceData && !service.closed){
            this.serviceList.push(service);
            this.createServiceMarker(service);
          }else{
            if(lastServiceData){
              // If the service was closed , we have to remove the service from the table and the map
              if(service.closed){
                this.removeServiceFromArray(service._id);
                this.removeMarkerFromMap(marker);
              }else{        
                //Check if the icon should be updated
                if(marker && lastServiceData.state !== service.state){
                  const iconUrl = this.getServiceMarkerIcon(service);
                  marker.updateIcon(iconUrl);
                }

                //Check if the location should be updated
                if(marker && service.location && (!lastServiceData.location || lastServiceData.location !== service.location)){
                  marker.sendNewLocation(service.location);
                }

                if(!marker){
                  this.createServiceMarker(service);
                }

                //Update the service on the array
                this.updateServiceOnArray(service);
              }

            }
          }
        }
      }
    });
  }


  /**
   * Update the service info on the array
   * @param serviceId service id
   */
  updateServiceOnArray(service){
    const index = this.serviceList.findIndex(item => item._id === service._id);
    this.serviceList[index] = service;
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
   */
  removeMarkerFromMap(marker) {
    if(!marker){
      return;
    }

    marker.setMap(null);
    const index = this.markers.findIndex(item => item.id === marker.id);

    if(index > -1){
      this.markers.splice(index, 1);
    }    
  }


  /**
   * Indicates if the marker indicated exists in the array of markers
   * @param markerId marker id
   */
  getMarkerFromArray(markerId){    
    const markersFiltered = this.markers.find(marker => marker.id == markerId);
    console.log('getMarkerFromArray => ', this.markers, markerId);
    console.log('markersFiltered => ', markersFiltered);
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
      this.serviceList = services;

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
      filter(roles => roles.some(role => role === 'SATELLITE')),
      mergeMap(() => this.getServiceClientSatellite$()),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(client => {
      if(client){
        this.clientData = client
        console.log('loadServiceClientSatellite => ', this.clientData);

        if(!this.clientData.location || !this.clientData.location.lat || !this.clientData.location.lng){
          this.showSnackBar('SATELLITE.SERVICES.CLIENT_LOCATION_MISSING');
        }else{
          this.createPickUpMarker(client._id, this.clientData.location.lat, this.clientData.location.lng);     
        }        
      }else {
        console.log('Error => Not client data');
      }
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
        draggable: true
      }
    );
    this.clientMarker = pickUpMarker;
    this.clientMarker.updateIcon("./assets/satellite/icono-sucursal.svg");
    this.addMarkerToMap(pickUpMarker);
  }

  createServiceMarker(service){
    if(!service || !service.location){
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
        draggable: false
      }
    );

    const iconUrl = this.getServiceMarkerIcon(service);
    serviceMarker.updateIcon(iconUrl);

    this.markers.push(serviceMarker);
    this.addMarkerToMap(serviceMarker);
  }

  getServiceMarkerIcon(service){
    let iconUrl = null;
    switch(service.state){
      case 'ASSIGNED':
        iconUrl = './assets/satellite/marker_orange.png'
        break;
      case 'ARRIVED':
        iconUrl = './assets/satellite/marker_blue.png'
        break;
      case 'ON_BOARD':
        iconUrl = './assets/satellite/marker_gray.png'
        break;
      case 'CANCELLED_CLIENT':
        iconUrl = './assets/satellite/marker_red.png'
        break;
      case 'CANCELLED_DRIVER':
        iconUrl = './assets/satellite/marker_red.png'
        break;
      case 'DONE':
        iconUrl = './assets/satellite/marker_green.png'
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
    })
  }


  /**
   * Send a request service to the server
   */
  requestService(){
    const requestServiceForm = this.requestForm.getRawValue();

    return range(1, requestServiceForm.taxisNumber || 1)
    .pipe(
      map(requestNumber => {
        console.log('Client marker position => ', this.clientMarker.getPosition());
        const features = requestServiceForm.features.filter(feature => feature.active).map(feature => feature.name);

        return {
          client: {
            fullname: this.clientData.generalInfo.name,
            tip: 0,
            tipType: '' 
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
            addressLine1: this.clientData.generalInfo.address,
            addressLine2: '',
            notes: requestServiceForm.reference
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
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe(
      (result: any) => {
        if (result.data && result.data.ServiceCoreRequestService && result.data.ServiceCoreRequestService.accepted) {
          this.showSnackBar('SATELLITE.SERVICES.REQUEST_SERVICE_SUCCESS');
        }
      },
      error => {
        this.showSnackBar('SATELLITE.ERROR_OPERATION');
        console.log('Error ==> ', error);
      }
    );
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
    //this.selectedService = service;
    const marker = this.getMarkerFromArray(service._id)
    if(marker){
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
    if(this.serviceList && this.serviceList.length > 0){
      return this.serviceList.find(service => service._id == serviceId);
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
    console.log('buildServiceInfoWindowContent', service);

    
    const serviceTitle = this.translationLoader.getTranslate().instant('SATELLITE.SERVICE'); 
    const licensePlateTitle = this.translationLoader.getTranslate().instant('SATELLITE.SERVICES.LICENSE_PLATE');    
    const serviceReferenceTitle = this.translationLoader.getTranslate().instant('SATELLITE.SERVICES.REFERENCE');  
    
    const serviceInfoWindowContent = `<html>
      <body>
          <div id="serviceInfoWindow">
          <h2>${serviceTitle}</h2>
          <p> <strong>${licensePlateTitle}: </strong>${service.vehicle.licensePlate}</p>
          <p> <strong>${serviceReferenceTitle}: </strong>${service.pickUp.notes}</p>
        </div>
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
