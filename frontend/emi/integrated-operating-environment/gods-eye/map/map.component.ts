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
// import { MapRef } from './entities/agmMapRef';
// import { MarkerRef, ClientPoint, MarkerRefOriginalInfoWindowContent } from './entities/markerRef';


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

  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();
  // Subject to unsubscrtibe
  private ngUnsubscribeIOEServiceListener = new Subject();
  //map height
  mapHeight = 400;

  // Partial data: this is what is displayed to the user
  partialData = [];
  // total data source
  totalData = [];
  // total RAW data source
  totalRawData = [];
  // current selected service id
  private selectedServiceId = undefined;
  //current zoom
  zoom = 1.0;
  //user selected service filter
  serviceStateFilters = [];
  //flag indicating if this compoment is loading data from server
  loadingData = false;

  // current user roles
  userRoles = undefined;
  userDetails = undefined;
  // businessId = undefined;
  userId = undefined;
  seeAllOperation = false;

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
    this.subscribeIOEServicesListener();
    await this.resetData();
    this.registerTimer();
  }


  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
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
        // console.log(`Layout = ${JSON.stringify(layout)}`);
        this.recalculatePartialData();
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
      debounceTime(10),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      async ({ code, args }) => {
        switch (code) {
          case GodsEyeService.TOOLBAR_COMMAND_MAP_REFRESH:
            this.resetData();
            break;
          case GodsEyeService.TOOLBAR_COMMAND_MAP_APPLY_CHANNEL_FILTER:
            break;
          case GodsEyeService.TOOLBAR_COMMAND_MAP_APPLY_SERVICE_FILTER:
            break;
          case GodsEyeService.TOOLBAR_COMMAND_MAP_CHANGE_ZOOM:
            if (this.zoom !== args.zoom) {
              await this.recalculatePartialData();
            }
            break;
          case GodsEyeService.TOOLBAR_COMMAND_BUSINESS_UNIT_CHANGED:
            // console.log('TOOLBAR_COMMAND_BUSINESS_UNIT_CHANGED', args);
            this.selectedBusinessId = args[0];
            this.resetData();
            this.resetDataAndSubscriptions();
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

  /**
   * Listen to real-time service changes
   */
  subscribeIOEServicesListener() {
    this.godsEyeService.listenIOEService$(this.selectedBusinessId, null)
      .pipe(
        map(subscription => subscription.data.IOEService),
        takeUntil(this.ngUnsubscribe),
        takeUntil(this.ngUnsubscribeIOEServiceListener)
      )
      .subscribe(
        (service: any) => {
          this.applyService(service);
        },
        (error) => console.error(`MapComponent.subscribeIOEServicesListener: Error => ${JSON.stringify(error)}`),
        () => {
          console.log(`MapComponent.subscribeIOEServicesListener: Completed`);
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
          this.refreshTimeRelatedPartialData()
        )),
        takeUntil(this.ngUnsubscribe),
      )
      .subscribe(
        (_: any) => { },
        (error) => console.error(`MapComponent.registerTimer: Error => ${JSON.stringify(error)}`),
        () => {
          console.log(`MapComponent.registerTimer: Completed`);
        },
      );
  }
  //#endregion

  /**
   * Loads the entire data from DB
   */
  async resetData() {
    this.totalRawData = this.selectedBusinessId ? await this.queryAllDataFromServer() : [];
    this.totalData = this.totalRawData.map(s => this.convertServiceToMapFormat(s));
    console.log('totalRawData.length ==> ', this.totalRawData.length);
    console.log('totalData.length ==> ', this.totalData.length);
    await this.recalculatePartialData();
  }

  resetDataAndSubscriptions() {
    this.ngUnsubscribeIOEServiceListener.next();
    this.resetData();
    if (this.selectedBusinessId) { this.subscribeIOEServicesListener(); }
  }

  /**
   * Adds (or removes in case of closing services) services
   * @param service
   */
  async applyService(service) {
    const oldDataIndex = this.totalRawData.findIndex(raw => raw.id === service.id);
    if (service.closed && oldDataIndex >= 0) {
      this.totalRawData.splice(oldDataIndex, 1);
    } else if (oldDataIndex >= 0) {
      this.totalRawData[oldDataIndex] = service;
    } else {
      this.totalRawData.unshift(service);
    }
    this.totalData = this.totalRawData.map(s => this.convertServiceToMapFormat(s));
    await this.recalculatePartialData();
  }

  /**
   * Recarlculate the data partial data (the visible part at the table)
   */
  async recalculatePartialData() {
    const filteredData = this.totalData.filter(s => this.serviceStateFilters.length === 0 ? true : this.serviceStateFilters.indexOf(s.state) !== -1);
    this.partialData.filter(d => d.marker).forEach(d => d.marker.setMap(null));
    this.partialData = filteredData;
    this.partialData.filter(d => d.marker).forEach(d => d.marker.setMap(this.map));
    console.log('partialData.length ==> ', this.partialData.length);
    //this.partialData.forEach(x => console.log(x.marker));
  }


  /**
   * Queries bit by bit all the services from the server
   */
  async queryAllDataFromServer() {
    const data = [];
    let moreDataAvailable = true;
    let page = 0;
    while (moreDataAvailable) {
      console.log(`map.queryAllDataFromServer: nextPage=${page}`);
      const gqlResult = await this.godsEyeService.queryServices$([], [], this.seeAllOperation, this.selectedBusinessId, page++, 10, undefined).toPromise();
      if (gqlResult && gqlResult.data && gqlResult.data.IOEServices && gqlResult.data.IOEServices.length > 0) {
        data.push(...gqlResult.data.IOEServices);
      } else {
        moreDataAvailable = false;
      }
    }
    console.log(`map.queryAllDataFromServer: totalCount=${data.length}`);
    return data;
  }


  /**
   * Converts the service to the datatabke model
   * @param service
   */
  convertServiceToMapFormat(service) {
    const location = service.location ? service.location : service.pickUp;
    let fillColor = '#FFB6C1';
    switch(service.state){
      case 'REQUESTED': fillColor = '#fff622'; break;
      case 'ASSIGNED': fillColor = '#00ff00'; break;
      case 'ARRIVED': fillColor = '#0000FF'; break;
      case 'ON_BOARD': fillColor = '#000088'; break;
      case 'CANCELLED_SYSTEM': fillColor = '#ff0000'; break;
    }
    const marker = new google.maps.Marker({
      position: new google.maps.LatLng(location.marker.lat, location.marker.lng),
      icon: {
        //path: google.maps.SymbolPath.CIRCLE,
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        fillOpacity: 1,
        fillColor,
        strokeOpacity: 1.0,
        strokeColor: '#000000',
        strokeWeight: 0.5, 
        scale: 4 //pixels,        
      }
    });

    return {
      marker,
      serviceRef: service
    };
  }



  //#region TIME-RELATED DATE REFRESH
  refreshTimeRelatedPartialData() {
    return from(this.partialData).pipe(
      tap(pd => {
        pd.state_time_span = this.calcServiceStateTimeSpan(pd.serviceRef);
        pd.eta = this.calcServiceEta(pd.serviceRef);
      })
    );
  }

  calcServiceStateTimeSpan(service) {
    const latestState = service.stateChanges ? service.stateChanges.filter(pds => pds.state === service.state).pop() : undefined;
    if (latestState) {
      const diff = Date.now() - latestState.timestamp;
      const minutes = Math.floor(diff / 60000);
      const seconds = ((diff % 60000) / 1000).toFixed(0);
      return `${minutes > 9 ? minutes : '0' + minutes}m${seconds.length > 1 ? seconds : '0' + seconds}s`;
    } else {
      return '---';
    }
  }

  calcServiceEta(service) {
    if (!service.pickUpETA) {
      return '---';
    }

    let diff = service.pickUpETA ? service.pickUpETA - Date.now() : 0;
    diff = (diff !== null && diff < 0) ? 0 : diff;

    const minutes = Math.floor(diff / 60000);
    const seconds = ((diff % 60000) / 1000).toFixed(0);
    return `${minutes > 9 ? minutes : '0' + minutes}m${seconds.length > 1 ? seconds : '0' + seconds}s`;
  }

  //#endregion

  initMap() {
    this.map = new google.maps.Map(this.gmapElement.nativeElement, {
      center: new google.maps.LatLng(6.164719, -75.601595),
      zoom: 15,
      streetViewControl: true,
      fullscreenControl: true,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
  }

  //#region MAPS



  //#endregion
}
