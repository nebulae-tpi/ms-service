////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from '@angular/forms';

import { Router, ActivatedRoute } from '@angular/router';

////////// RXJS ///////////
import { map, mergeMap, tap, takeUntil, take } from 'rxjs/operators';
import { Subject, of} from 'rxjs';

//////////// ANGULAR MATERIAL ///////////
import {
  MatPaginator,
  MatSort,
  MatTableDataSource,
  MatSnackBar
} from '@angular/material';

//////////// i18n ////////////
import {
  TranslateService
} from '@ngx-translate/core';
import { locale as english } from '../i18n/en';
import { locale as spanish } from '../i18n/es';
import { FuseTranslationLoaderService } from '../../../../core/services/translation-loader.service';
import { ToolbarService } from '../../../toolbar/toolbar.service';

//////////// Other Services ////////////
import { KeycloakService } from 'keycloak-angular';
import { ServiceDetailService } from './service-detail.service';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'service',
  templateUrl: './service-detail.component.html',
  styleUrls: ['./service-detail.component.scss']
})
// tslint:disable-next-line:class-name
export class ServiceDetailComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();

  service: any;

  constructor(
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private formBuilder: FormBuilder,
    public snackBar: MatSnackBar,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private ServiceDetailservice: ServiceDetailService,
    private route: ActivatedRoute,
    private toolbarService: ToolbarService
  ) {
      this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    this.toolbarService.onSelectedBusiness$
    .pipe(
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe(buSelected => {
      if(this.service){
        this.setCustomFare(buSelected);
      }
    }, err => console.log(err), () => {});
    this.loadservice();
    this.subscribeServiceUpdated();
  }

  loadservice(){
    this.route.params
    .pipe(
      map(params => params['id']),
      mergeMap(entityId => entityId !== 'new' ?
        this.ServiceDetailservice.getServiceService$(entityId).pipe(
          map(res => res.data.ServiceService)
        ) : of(null)
      ),
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe((service: any) => {
      this.service = {...service};
      if(this.toolbarService.onSelectedBusiness$.getValue()){
        this.setCustomFare(this.toolbarService.onSelectedBusiness$.getValue());
      }
      
      
    }, e => console.log(e));
  }
  
  setCustomFare(business){
    let customFare = undefined;
      const attrs = business.attributes;
      const fareMeters = attrs["FARE_METERS"] ? Number(attrs["FARE_METERS"]) : 100;;
      const FareValue = attrs["FARE_VALUE"] ? Number(attrs["FARE_VALUE"]) : 105;
      const taximeterStartValue = attrs["TAXIMETER_START_VALUE"] ? Number(attrs["TAXIMETER_START_VALUE"]) : 105;
      const taximeterSecondsThreshold = attrs["TAXIMETER_SECONDS_THRESHOLD"] ? Number(attrs["TAXIMETER_SECONDS_THRESHOLD"]) : 1;
      const taximeterSecondsValue = attrs["TAXIMETER_SECONDS_VALUE"] ? Number(attrs["TAXIMETER_SECONDS_VALUE"]) : 1.75;
      const minimumFare = attrs["TAXIMETER_MIMIMUN_FARE"] ? Number(attrs["TAXIMETER_MIMIMUN_FARE"]) : 5000;
      if(this.service.taximeterFare){
        customFare = this.service.taximeterFare;
      }else {
        if(this.service.taximeterTime){
          const tempSeconds = (this.service.taximeterTime/1000)/taximeterSecondsThreshold;
          customFare = tempSeconds * taximeterSecondsValue;
        }
        if(this.service.onBoardTraveledDistance){
          const taximeterPoints = this.service.onBoardTraveledDistance/fareMeters;
          customFare = customFare + taximeterStartValue+(taximeterPoints*FareValue)
        }
      }
      
      console.log("CUSTOM FARE ===> ", customFare)
      if(customFare){
        this.service.fare = customFare > minimumFare ? Math.round(customFare) : minimumFare;
      }
  }
  subscribeServiceUpdated(){
    this.ServiceDetailservice.subscribeServiceServiceUpdatedSubscription$()
    .pipe(
      map(subscription => subscription.data.ServiceServiceUpdatedSubscription),
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe((service: any) => {
      if(service != null && this.service != null && service._id === this.service._id){
        this.service = service;
      }      
    })
  }

  showSnackBar(message) {
    this.snackBar.open(this.translationLoader.getTranslate().instant(message),
      this.translationLoader.getTranslate().instant('SERVICE.CLOSE'), {
        duration: 2000
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}
