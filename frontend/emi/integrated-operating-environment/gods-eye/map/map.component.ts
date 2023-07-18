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

import { environment } from '../../../../../../environments/environment';

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
} from 'rxjs/operators';

import { Subject, from, of, forkJoin, Observable, concat, timer } from 'rxjs';

////////// ANGULAR MATERIAL //////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar,
  MatDialog
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

//////////// Other Services ////////////
import { KeycloakService } from 'keycloak-angular';
import { GodsEyeService } from '../gods-eye.service';
import { ToolbarService } from '../../../../toolbar/toolbar.service';
import { SelectionModel } from '@angular/cdk/collections';

//////////// MAPS ////////////
//import {} from 'googlemaps';




@Component({
  // tslint:disable-next-line:component-selector
  selector: 'map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class MapComponent implements OnInit, OnDestroy {

  //map itseld
  map: google.maps.Map;
  bounds: google.maps.LatLngBounds;
  @ViewChild('gmap') gmapElement: any;
  mapTypes = [
    google.maps.MapTypeId.HYBRID,
    google.maps.MapTypeId.ROADMAP,
    google.maps.MapTypeId.SATELLITE,
    google.maps.MapTypeId.TERRAIN
  ];

  // Subjects to unsubscribe
  private ngUnsubscribe = new Subject();
  private ngUnsubscribeIOEServiceListener = new Subject();
  private ngUnsubscribeIOEShiftListener = new Subject();
  //map height
  mapHeight = 400;

  // markers
  pins = {};
  // summary stats
  shiftsSummary = { AVAILABLE: 0, NOT_AVAILABLE: 0, BUSY: 0, BLOCKED: 0, OFFLINE: 0 };
  // service stats
  servicesSummary = { REQUESTED: 0, ASSIGNED: 0, ARRIVED: 0, ON_BOARD: 0, DONE: 0, CANCELLED_CLIENT: 0, CANCELLED_OPERATOR: 0, CANCELLED_DRIVER: 0, CANCELLED_SYSTEM: 0 }
  // current selected service id
  private selectedServiceId = undefined;
  //current zoom
  zoom = 1.0;
  //flag indicating if this compoment is loading data from server
  loadingData = false;

  // current user roles
  userRoles = undefined;
  userDetails = undefined;
  // businessId = undefined;
  userId = undefined;
  seeAllOperation = false;
  // map of service vs bouncing shifts array
  bouncingShifts = {};
  channelFilter = ["OPERATOR", "CLIENT", "CHAT_SATELITE"];
  stateFilter = ["REQUESTED", "ASSIGNED", "ARRIVED", "ON_BOARD", "CANCELLED_CLIENT", "CANCELLED_OPERATOR", "CANCELLED_DRIVER", "CANCELLED_SYSTEM", "DONE"];

  @Input('selectedBusinessId') selectedBusinessId: any;


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
    private dialog: MatDialog
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }


  async ngOnInit() {
    await this.queryUserSpecs();
    this.initMap();
    this.listenLayoutChanges();
    this.listenToolbarCommands();
    this.listenBusinessChanges();
    //await this.resetData();
    this.subscribeIOEServicesListener();
    this.subscribeIOEShiftsListener();
    this.registerTimer();
  }


  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribeIOEServiceListener.next();
    this.ngUnsubscribeIOEShiftListener.next();
    this.ngUnsubscribe.complete();
    this.ngUnsubscribeIOEServiceListener.complete();
    this.ngUnsubscribeIOEShiftListener.complete();
  }


  /**
   * query current user roles
   */
  async queryUserSpecs() {
    this.userRoles = await this.keycloakService.getUserRoles(true);
    this.userDetails = await this.keycloakService.loadUserProfile();
    // this.businessId = this.userDetails.attributes.businessId[0];
    //console.log('###$$$$$ ', this.userDetails.attributes);
    this.userId = this.userDetails.attributes.userId ? this.userDetails.attributes.userId[0] : undefined;
  }

  //#region LISTENERS

  listenBusinessChanges() {
    this.toolbarService.onSelectedBusiness$
      .pipe(
        filter(bu => bu !== undefined && bu !== null),
        map(bu => {
          return {
            selectedBusinessId: bu.id,
            businessLocation: {
              latitude: '4.633400', // def value
              longitude: '-74.094829', // def value
              ...((bu.attributes || []).reduce((acc, obj) => { acc[obj.key] = obj.value; return acc; }, {}))
            }
          };
        }),
        tap(({ selectedBusinessId, businessLocation }) => {
          this.selectedBusinessId = selectedBusinessId;
          this.map.setCenter(new google.maps.LatLng(parseFloat(businessLocation.latitude), parseFloat(businessLocation.longitude)));
          this.map.setZoom(13);
          this.resetDataAndSubscriptions();
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();
  }

  /**
   * Listen layout (size and distribution) changes
   */
  listenLayoutChanges() {
    this.godsEyeService.layoutChanges$.pipe(
      filter(e => e && e.layout),
      map(({ layout }) => layout),
      debounceTime(250),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      (layout) => {
        this.mapHeight = layout.map.height;
      },
      (error) => console.error(`MapComponent.listenLayoutChanges: Error => ${error}`),
      () => {
        // console.log(`MapComponent.listenLayoutChanges: Completed`)
      },
    );
  }

  /**
   * Listen commands send by the command bar
   */
  listenToolbarCommands() {
    this.godsEyeService.toolbarCommands$.pipe(
      debounceTime(100),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      async ({ code, args }) => {
        switch (code) {
          case GodsEyeService.TOOLBAR_COMMAND_MAP_SEARCH_SHIFT:
            this.findPinByLicensePlate(args[0]);
            break;
          case GodsEyeService.TOOLBAR_COMMAND_MAP_REFRESH:
            //console.log('GodsEyeService.TOOLBAR_COMMAND_MAP_REFRESH:');
            this.resetDataAndSubscriptions();
            break;
          case GodsEyeService.TOOLBAR_COMMAND_MAP_APPLY_CHANNEL_FILTER:
            break;
          case GodsEyeService.TOOLBAR_COMMAND_MAP_APPLY_SERVICE_FILTER:
            break;
          case GodsEyeService.TOOLBAR_COMMAND_MAP_CHANGE_ZOOM:
            break;
        }
        // console.log({ code, args });
      },
      (error) => console.error(`MapComponent.listenToolbarCommands: Error => ${error}`),
      () => {
        console.log(`MapComponent.listenToolbarCommands: Completed`);
      },
    );
  }

  findPinByLicensePlate(licensePlate) {
    const pinList = Object.values(this.pins);
    if (pinList && pinList.length > 0) {
      const pinIdentified = pinList.find(pin => (((((pin as any) || {}).ref || {}).vehicle || {}).licensePlate === licensePlate))
      if (pinIdentified && this.map) {
        this.map.setCenter({
          lat: (pinIdentified as any).ref.location.lat,
          lng: (pinIdentified as any).ref.location.lng
        });
        this.map.setZoom(17);
      } else {
        this.showMessageSnackbar("TOOLBAR.SEARCH_NOT_FOUND")
      }

    }
  }

  /**
   * Listen to real-time service changes
   */
  subscribeIOEServicesListener() {
    if (!this.selectedBusinessId) {
      return;
    }
    this.godsEyeService.listenIOEService$(this.selectedBusinessId, null, this.stateFilter, this.channelFilter)
      .pipe(
        filter(() => this.resetSemaphore === 0),
        map(subscription => subscription.data.IOEService),
        takeUntil(this.ngUnsubscribe),
        takeUntil(this.ngUnsubscribeIOEServiceListener)
      )
      .subscribe(
        (service: any) => {
          service.type = 'SERVICE';
          this.applyHotUpdate(service);
          this.toggleServiceOfferBounce(service);
        },
        (error) => console.error(`MapComponent.subscribeIOEServicesListener: Error => ${JSON.stringify(error)}`),
        () => {
         // console.log(`MapComponent.subscribeIOEServicesListener: Completed`);
        },
      );
  }

  /**
   * Listen to real-time shift changes
   */
  subscribeIOEShiftsListener() {
    if (!this.selectedBusinessId) {
      return;
    }
    this.godsEyeService.listenIOEShift$(this.selectedBusinessId)
      .pipe(
        filter(() => this.resetSemaphore === 0),
        filter(v => v),
        map(subscription => subscription.data.IOEShift),
        takeUntil(this.ngUnsubscribe),
        takeUntil(this.ngUnsubscribeIOEShiftListener)
      )
      .subscribe(
        (shift: any) => {
          shift.type = 'SHIFT';
          this.applyHotUpdate(shift);
        },
        (error) => console.error(`MapComponent.subscribeIOEShiftsListener: Error => ${error}`),
        () => {
          //console.log(`MapComponent.subscribeIOEShiftsListener: Completed`);
        },
      );
  }

  /**
   * Register a second by second timer available for multiple maintenance tasks
   */
  registerTimer() {
    timer(5000, 1000)
      .pipe(
        mergeMap(i => forkJoin(

        )),
        takeUntil(this.ngUnsubscribe),
      )
      .subscribe(
        (_: any) => { },
        (error) => console.error(`MapComponent.registerTimer: Error => ${error}`),
        () => {
          //console.log(`MapComponent.registerTimer: Completed`);
        },
      );
  }
  //#endregion

  /**
   * Loads the entire data from DB
   */
  async resetData() {
    this.shiftsSummary = { AVAILABLE: 0, NOT_AVAILABLE: 0, BUSY: 0, BLOCKED: 0, OFFLINE: 0 };
    this.servicesSummary = { REQUESTED: 0, ASSIGNED: 0, ARRIVED: 0, ON_BOARD: 0, DONE: 0, CANCELLED_CLIENT: 0, CANCELLED_OPERATOR: 0, CANCELLED_DRIVER: 0, CANCELLED_SYSTEM: 0 };
    this.processStats(undefined, undefined);

    Object.keys(this.pins).forEach(k => this.removePin(this.pins[k]));
    const today = new Date();
    const explorePastMonth = today.getDate() <= 1;
    console.log(`Current Date: date=${today.getDate()}, hours=${today.getHours()}, explorePastMonth=${explorePastMonth}`);
    let totalRawData = this.selectedBusinessId ? await this.queryAllDataFromServer(0) : [];
    if (explorePastMonth) {
      const pastMotnTotalRawData = this.selectedBusinessId ? await this.queryAllDataFromServer(-1) : [];
      totalRawData = totalRawData.concat(pastMotnTotalRawData);
    }
    totalRawData.forEach(raw => {
      this.pins[raw.id] = raw.type === 'SERVICE' ? this.convertServiceToMapFormat(raw) : this.convertShiftToMapFormat(raw);
      this.pins[raw.id].marker.setMap(this.map)
      this.processStats(this.pins[raw.id], undefined, false);
      if (raw.type == 'SERVICE') {
        this.toggleServiceOfferBounce(raw);
      }
    });

    this.processStats(undefined, undefined);
  }

  resetSemaphore: number = 0;
  async resetDataAndSubscriptions() {
    if (this.resetSemaphore++ > 0) {
      return;
    }
    this.ngUnsubscribeIOEServiceListener.next();
    this.ngUnsubscribeIOEShiftListener.next();
    await this.resetData();
    this.subscribeIOEServicesListener();
    this.subscribeIOEShiftsListener();
    this.resetSemaphore = 0;
  }

  /**
   * Adds (or removes in case of closing services/shift) services/shifts
   * @param raw
   */
  async applyHotUpdate(raw) {
    const oldPin = this.pins[raw.id];
    if (raw.closed || raw.state === 'CLOSED') {
      if (oldPin) {
        this.removePin(oldPin);
        this.processStats(undefined, oldPin);
      }
    } else if (oldPin) {
      this.pins[raw.id] = raw.type === 'SERVICE' ? this.convertServiceToMapFormat(raw, oldPin) : this.convertShiftToMapFormat(raw, oldPin);
      this.processStats(this.pins[raw.id], oldPin);
    } else {
      this.pins[raw.id] = raw.type === 'SERVICE' ? this.convertServiceToMapFormat(raw) : this.convertShiftToMapFormat(raw);
      this.pins[raw.id].marker.setMap(this.map);
      this.processStats(this.pins[raw.id], oldPin);
    }
  }

  toggleServiceOfferBounce(service) {
    if (service.state == 'REQUESTED' && service.offer) {
      const serviceShifts: [string] = this.bouncingShifts[service.id] || [];
      service.offer.shifts
        .filter(sId => !serviceShifts.includes(sId))
        .map(sId => this.pins[sId])
        .filter(pin => pin)
        .forEach(pin => {
          let fillColor = '#FF8B00';
          let strokeColor = '#000000';
          let strokeWeight = 0.5;
          pin.isOffering = true;
          pin.marker.setIcon(
            {
              path: 'm 1 6 a 1 1 90 0 0 0 0 c 8 0 8 8 0 8 l -7 0 l -11 0 c -8 0 -8 -8 0 -8 l 18 0',
              fillOpacity: 1,
              fillColor,
              strokeOpacity: 1.0,
              strokeColor,
              strokeWeight,
              labelOrigin: new google.maps.Point(-7, 11),
              scale: 2 //pixels,        
            }
          );
          
          pin.marker.setLabel({
            text: ((pin.ref || {}).vehicle || {}).licensePlate,
            fontSize: "10px",
            color: "#FFFFFF",
          })
          //pin.marker.setAnimation(google.maps.Animation.BOUNCE)
          serviceShifts.push(pin.id);
          this.bouncingShifts[service.id] = serviceShifts;
        });
    } else if (this.bouncingShifts[service.id] !== undefined) {
      //console.log(`toggleServiceOfferBounce: ${service.state}: ${this.bouncingShifts[service.id]}`);
      this.bouncingShifts[service.id]
        .map(sId => this.pins[sId])
        .filter(pin => pin)
        .filter(pin => // do not stpo bouncing pins if they are bouncing in another service
          Object.keys(this.bouncingShifts)
            .filter(sId => sId !== service.id)
            .map(s => this.bouncingShifts[s])
            .filter(shifts => shifts.includes(pin.id))
            .length <= 0)
        .forEach(pin => {
          pin.isOffering = false;
          this.convertShiftToMapFormat(pin.ref, pin)
        });
      delete this.bouncingShifts[service.id];
    }
  }

  removePin(pin) {
    pin.marker.setMap(null);
    delete this.pins[pin.id];
  }

  /**
   * Recarlculate the data partial data (the visible part at the table)
   */
  processStats(newPin, oldPin, publish = true) {
    if ((!newPin && !oldPin) && publish) {
      // we only need to publish everything
      this.godsEyeService.publishStatsCommand({ code: GodsEyeService.STATS_COMMAND_UPDATE_SHIFTS, args: this.shiftsSummary });
      this.godsEyeService.publishStatsCommand({ code: GodsEyeService.STATS_COMMAND_UPDATE_SERVICES, args: this.servicesSummary });
    }

    if (oldPin && !oldPin.ref) {
      //console.log('NO REFFFF');
    }

    const shiftsUpdate = ((newPin && newPin.ref && newPin.ref.type === 'SHIFT') || (oldPin && oldPin.ref && oldPin.ref.type === 'SHIFT'));
    const serviceUpdate = ((newPin && newPin.ref && newPin.ref.type === 'SERVICE') || (oldPin && oldPin.ref && oldPin.ref.type === 'SERVICE'));

    if (shiftsUpdate) {
      const newPinState = (newPin && newPin.ref)
        ? newPin.ref.online
          ? newPin.ref.state
          : 'OFFLINE'
        : undefined;
      const oldPinState = (oldPin && oldPin.ref)
        ? oldPin.ref.online
          ? oldPin.ref.state
          : 'OFFLINE'
        : undefined;

      if (newPinState === oldPinState) {
        // do nothing
      } else {
        if (newPinState) {
          this.shiftsSummary[newPinState] += 1;
        }
        if (oldPinState) {
          this.shiftsSummary[oldPinState] -= 1;
        }
        if (publish) {
          //console.log('publishing: ', 'STATS_COMMAND_UPDATE_SHIFTS');
          this.godsEyeService.publishStatsCommand({ code: GodsEyeService.STATS_COMMAND_UPDATE_SHIFTS, args: this.shiftsSummary });
        }
      }
    }

    if (serviceUpdate) {
      const newPinState = (newPin && newPin.ref) ? newPin.ref.state : undefined;
      const oldPinState = (oldPin && oldPin.ref) ? oldPin.ref.state : undefined;

      if (newPinState === oldPinState) {
        // do nothing
      } else {
        if (newPinState) {
          this.servicesSummary[newPinState] += 1;
        }
        if (oldPinState) {
          this.servicesSummary[oldPinState] -= 1;
        }
        if (publish) {
          //console.log('publishing: ', 'STATS_COMMAND_UPDATE_SERVICES');
          this.godsEyeService.publishStatsCommand({ code: GodsEyeService.STATS_COMMAND_UPDATE_SERVICES, args: this.servicesSummary });
        }
      }
    }

  }


  /**
   * Queries bit by bit all the services from the server
   * @param monthsToAdd number of months to add to the query db. eg: 0=current month, 1=next month, -1=past month
   */
  async queryAllDataFromServer(monthsToAdd = 0) {
    const data = [];
    let moreDataAvailable = true;
    let page = 0;
    while (moreDataAvailable) {
      //console.log(`map.queryServices: monthsToAdd=${monthsToAdd}; nextPage=${page}`);
      const gqlResult = await this.godsEyeService.queryServices$([], this.channelFilter, this.seeAllOperation, this.selectedBusinessId, page++, 100, monthsToAdd, undefined).toPromise();
      if (gqlResult && gqlResult.data && gqlResult.data.IOEServices && gqlResult.data.IOEServices.length > 0) {
        data.push(...gqlResult.data.IOEServices.map(v => ({ ...v, type: 'SERVICE' })));
      } else {
        moreDataAvailable = false;
      }
    }
    //console.log(`map.queryServices:  monthsToAdd=${monthsToAdd}; totalCount=${data.length}`);


    moreDataAvailable = true;
    page = 0;
    while (moreDataAvailable) {
      //console.log(`map.queryShifts: monthsToAdd=${monthsToAdd}; nextPage=${page}`);
      const gqlResult = await this.godsEyeService.queryShifts$(['AVAILABLE', 'NOT_AVAILABLE', 'BUSY'], this.selectedBusinessId, page++, 100, monthsToAdd, undefined).toPromise();
      if (gqlResult && gqlResult.data && gqlResult.data.IOEShifts && gqlResult.data.IOEShifts.length > 0) {
        data.push(...gqlResult.data.IOEShifts.map(v => ({ ...v, type: 'SHIFT' })));
      } else {
        moreDataAvailable = false;
      }
    }
    //console.log(`map.queryAllDataFromServer:  monthsToAdd=${monthsToAdd}; totalCount=${data.length}`);


    return data;
  }


  /**
   * Converts the service to the datatable model
   * @param service
   */
  convertServiceToMapFormat(service, oldPin = undefined) {
    let location = service.pickUp.marker;
    let fillColor = '#FFB6C1';


    //console.log(service.request.sourceChannel,"{{{{}}}}");
    switch (service.state) {
      case 'REQUESTED': fillColor =
        service.request.sourceChannel === 'CLIENT'
          ? '#ff00ff' // mobile client app
          : ((service.client.tipType || 'CASH') === 'CASH')
            ? '#ff0000' // operator + cash
            : '#0033ff' // operator + wallet
        break;
      case 'ASSIGNED': fillColor = '#00ff00'; break;
      case 'ARRIVED': fillColor = '#0000FF'; location = service.location; break;
      case 'ON_BOARD': fillColor = '#000088'; location = service.location; break;
      case 'CANCELLED_SYSTEM': fillColor = '#ff0000'; break;
      case 'DONE': fillColor = '#00174f'; location = service.location; break;
    }

    //console.log(service.id, service.state, service.offer.params.maxDistance);


    const fillOpacity = service.state === 'REQUESTED'
      ? 0.07 // + (0.004 * ((Date.now() - service.timestamp) / 1000))
      : service.state === 'DONE' ? 0 : 1;
    const position = new google.maps.LatLng(location.lat, location.lng);

    const needsReplace = (oldPin && oldPin.ref.state === 'REQUESTED' && service.state !== 'REQUESTED');
    const radius = (service.offer && service.offer.params) ? service.offer.params.maxDistance : 1000;
    const internalradius = (service.offer && service.offer.params && service.offer.params.minDistance > 50) ? service.offer.params.minDistance : 50;


    let oldMap;
    if (needsReplace) {
      oldMap = oldPin.marker.getMap();
      oldPin.marker.setMap(null);
      delete oldPin.marker;
      //delete oldPin.ref;
    }
    let marker;
    if (oldPin && !needsReplace) {
      marker = oldPin.marker;
      if (service.state === 'REQUESTED') {
        marker.setPaths([
          this.getCirclePoints(position, radius, 180, true),
          this.getCirclePoints(position, internalradius, 6, false)
        ]);
      } else {
        marker.setPosition(position);
        marker.setIcon({
          //path: google.maps.SymbolPath.CIRCLE,
          path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
          fillOpacity,
          fillColor,
          strokeOpacity: 1.0,
          strokeColor: '#000000',
          strokeWeight: 1,
          scale: 4 //pixels,        
        });
      }
    } else {
      const tipStr = !service.client.tipType
        ? ''
        : `${this.translationLoader.getTranslate().instant(`GODSEYE.MAP.SERVICE.${service.client.tipType}`)}: $${service.client.tip}`;
      const infoWinowContent =
        `<div id="content">
      ${service.client.fullname} </br>
      ${tipStr}
      </div>`;


      if (service.state === 'REQUESTED') {

        const externalRad = this.getCirclePoints(position, radius, 180, true);
        const internalRad = this.getCirclePoints(position, internalradius, 6, false);
        const infowindow = new google.maps.InfoWindow({
          content: infoWinowContent,
          position: externalRad[0]
        });

        marker = new google.maps.Polygon({
          paths: [externalRad, internalRad],
          strokeColor: fillColor,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor,
          fillOpacity,
        });
        google.maps.event.addListener(marker,
          'click', () => infowindow.open(this.map));
      } else {
        marker = new google.maps.Marker({
          position,
          icon: {
            //path: google.maps.SymbolPath.CIRCLE,
            path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
            fillOpacity,
            fillColor,
            strokeOpacity: 1.0,
            strokeColor: '#000000',
            strokeWeight: 1,
            scale: 4 //pixels,        
          }
        });
        const infowindow = new google.maps.InfoWindow({ content: infoWinowContent });
        marker.addListener('click', function () {
          infowindow.open(this.map, marker);
        });
      }
    }

    if (oldMap) {
      marker.setMap(oldMap);
    }

    return {
      marker,
      ref: service,
      id: service.id
    };
  }
  /**
   * Converts the shift to the datatable model
   * @param shift
   */
  convertShiftToMapFormat(shift, oldPin = undefined) {

    //console.log(shift.state);

    let location = shift.location;
    if (!location) {
      location = { marker: { lat: 0, lng: 0 } };
    }
    let fillColor = '#000000';
    let strokeColor = '#000000';
    let strokeWeight = 0.5;
    let textColor = '#000000';
    if (shift.online) {
      switch (shift.state) {
        case 'AVAILABLE': fillColor = '#00ff00'; break;
        case 'NOT_AVAILABLE': fillColor = '#ff0000'; textColor = "#FFFFFF"; break;
        case 'BUSY': fillColor = '#0000FF'; textColor = "#FFFFFF"; break;
      }
    } else {
      fillColor = '#FFFFFF';
      strokeWeight = 2;
      switch (shift.state) {
        case 'AVAILABLE': strokeColor = '#00ff00'; break;
        case 'NOT_AVAILABLE': strokeColor = '#ff0000'; textColor = "#FFFFFF"; break;
        case 'BUSY': strokeColor = '#0000FF'; textColor = "#FFFFFF"; break;
      }
    }


    const position = new google.maps.LatLng(location.lat, location.lng);

    let marker;
    if (oldPin) {
      marker = oldPin.marker;
      marker.setPosition(position);
      //console.log(marker.getIcon());
      // marker.getIcon().fillColor = fillColor;
      // marker.getIcon().strokeColor = strokeColor;
      // marker.getIcon().strokeWeight = strokeWeight;
      if (oldPin.isOffering) { 
        fillColor = "#FF8B00";
        strokeColor = '#000000';
        textColor = '#FFFFFF';
      }
      marker.setIcon(
        {
          path: 'm 1 6 a 1 1 90 0 0 0 0 c 8 0 8 8 0 8 l -7 0 l -11 0 c -8 0 -8 -8 0 -8 l 18 0',
          fillOpacity: 1,
          fillColor,
          strokeOpacity: 1.0,
          strokeColor,
          strokeWeight,
          labelOrigin: new google.maps.Point(-7, 11),
          scale: 2 //pixels,        
        }
      );
      marker.setLabel({
        text: ((shift || {}).vehicle || {}).licensePlate,
        fontSize: "10px",
        color: fillColor.toUpperCase() === "#FFFFFF" ? "#000000" : fillColor === "#000000" ? "#FFFFFF" : textColor,
      })
      //console.log(fillColor);
    } else {
      //console.log("shift ===> ", shift)
      marker = new google.maps.Marker({
        position,
        label: {
          text: ((shift || {}).vehicle || {}).licensePlate,
          fontSize: "10px",
          color: fillColor.toUpperCase() === "#FFFFFF" ? "#000000" : fillColor === "#000000" ? "#FFFFFF" : textColor,
        },
        icon: {
          path: 'm 1 6 a 1 1 90 0 0 0 0 c 8 0 8 8 0 8 l -7 0 l -11 0 c -8 0 -8 -8 0 -8 l 18 0',
          fillOpacity: 1,
          fillColor,
          strokeOpacity: 1.0,
          strokeColor,
          strokeWeight,
          scale: 2, //pixels,        
          labelOrigin: new google.maps.Point(-7, 11)
        },
      });

      marker.addListener('click', function () {
        infowindow.open(this.map, marker);
      });
      var contentString = `<div id="content">
            ${shift.vehicle.licensePlate} - ${shift.driver.fullname} </br>
            ${this.translationLoader.getTranslate().instant(`GODSEYE.MAP.SHIFT.BALANCE`)} : $${(shift.driver.wallet || { pockets: { main: 0 } }).pockets.main}
            </div>`;
      var infowindow = new google.maps.InfoWindow({
        content: contentString
      });
    }

    return {
      marker,
      ref: shift,
      id: shift.id
    };
  }



  //#region TIME-RELATED DATE REFRESH
  refreshTimeRelatedPartialData() {

  }



  //#endregion


  //#region MAPS

  initMap() {
    const styledMapType = new google.maps.StyledMapType(
      [
        { elementType: 'geometry', stylers: [{ color: '#f2f2f2' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#523735' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f1e6' }] },
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [
            { visibility: "off" }
          ]
        },
        // {
        //   featureType: 'administrative',
        //   elementType: 'geometry.stroke',
        //   stylers: [{ color: '#c9b2a6' }, { "visibility": "off" }]
        // },
        // {
        //   featureType: 'administrative.land_parcel',
        //   elementType: 'geometry.stroke',
        //   stylers: [{ color: '#dcd2be' }, { "visibility": "off" }]
        // },
        // {
        //   featureType: 'administrative.land_parcel',
        //   elementType: 'labels.text.fill',
        //   stylers: [{ color: '#ae9e90' }, { "visibility": "off" }]
        // },
        // {
        //   featureType: 'landscape.natural',
        //   elementType: 'geometry',
        //   stylers: [{ color: '#dfd2ae' }]
        // },
        // {
        //   featureType: 'poi',
        //   elementType: 'geometry',
        //   stylers: [{ color: '#dfd2ae' }, { "visibility": "off" }]
        // },
        // {
        //   featureType: 'poi',
        //   elementType: 'labels.text.fill',
        //   stylers: [{ color: '#93817c' }, { "visibility": "off" }]
        // },
        // {
        //   featureType: 'poi.park',
        //   elementType: 'geometry.fill',
        //   stylers: [{ color: '#a5b076' }, { "visibility": "off" }]
        // },
        // {
        //   featureType: 'poi.park',
        //   elementType: 'labels.text.fill',
        //   stylers: [{ color: '#447530' }]
        // },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#f5f1e6' }]
        },
        {
          featureType: 'road.arterial',
          elementType: 'geometry',
          stylers: [{ color: '#fdfcf8' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry',
          stylers: [{ color: '#f8c967' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#e9bc62' }]
        },
        {
          featureType: 'road.highway.controlled_access',
          elementType: 'geometry',
          stylers: [{ color: '#e98d58' }]
        },
        {
          featureType: 'road.highway.controlled_access',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#db8555' }]
        },
        {
          featureType: 'road.local',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#806b63' }]
        },
        {
          featureType: 'transit.line',
          elementType: 'geometry',
          stylers: [{ color: '#dfd2ae' }]
        },
        {
          featureType: 'transit.line',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#8f7d77' }]
        },
        {
          featureType: 'transit.line',
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#ebe3cd' }]
        },
        {
          featureType: 'transit.station',
          elementType: 'geometry',
          stylers: [{ color: '#dfd2ae' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry.fill',
          stylers: [{ color: '#b9d3c2' }]
        },
        {
          featureType: 'water',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#92998d' }]
        }
      ],
      { name: 'Styled Map' });
    this.map = new google.maps.Map(this.gmapElement.nativeElement, {
      center: new google.maps.LatLng(4.633400, -74.094829),
      zoom: 13,
      streetViewControl: false,
      fullscreenControl: true,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
    });

    this.map.mapTypes.set('styled_map', styledMapType);
    this.map.setMapTypeId('styled_map');
  }

  currentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        if (this.map) {
          this.map.setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        }
      });
    } else {
      alert('Geolocation is not supported by this browser.');
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
        messageKey ? data[messageKey] : '',
        detailMessageKey ? data[detailMessageKey] : '',
        {
          duration: 2000
        }
      );
    });
  }

  getCirclePoints(center, radius, numPoints, clockwise) {
    var points = [];
    for (var i = 0; i < numPoints; ++i) {
      var angle = i * 360 / numPoints;
      if (!clockwise) {
        angle = 360 - angle;
      }

      // the maps API provides geometrical computations
      // just make sure you load the required library (libraries=geometry)
      var p = google.maps.geometry.spherical.computeOffset(center, radius, angle);
      points.push(p);
    }

    // 'close' the polygon
    points.push(points[0]);
    return points;
  }
  //#endregion
}
