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

  pageType: string;

  service: any;

  constructor(
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private formBuilder: FormBuilder,
    public snackBar: MatSnackBar,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private ServiceDetailservice: ServiceDetailService,
    private route: ActivatedRoute
  ) {
      this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    this.loadservice();
    this.subscribeServiceUpdated();
    this.stopWaitingOperation();
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
      this.service = service;
      this.pageType = (service && service._id) ? 'edit' : 'new'
    }, e => console.log(e));
  }
  
  subscribeServiceUpdated(){
    this.ServiceDetailservice.subscribeServiceServiceUpdatedSubscription$()
    .pipe(
      map(subscription => subscription.data.ServiceServiceUpdatedSubscription),
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe((service: any) => {
      this.checkIfEntityHasBeenUpdated(service);
    })
  }

  checkIfEntityHasBeenUpdated(newservice){
    if(this.ServiceDetailservice.lastOperation == 'CREATE'){

      //Fields that will be compared to check if the entity was created
      if(newservice.generalInfo.name == this.ServiceDetailservice.service.generalInfo.name 
        && newservice.generalInfo.description == this.ServiceDetailservice.service.generalInfo.description){
        //Show message entity created and redirect to the main page
        this.showSnackBar('SERVICE.ENTITY_CREATED');
        this.router.navigate(['service/']);
      }

    }else if(this.ServiceDetailservice.lastOperation == 'UPDATE'){
      // Just comparing the ids is enough to recognise if it is the same entity
      if(newservice._id == this.service._id){
        //Show message entity updated and redirect to the main page
        this.showSnackBar('SERVICE.ENTITY_UPDATED');
        //this.router.navigate(['service/']);
      }

    }else{
      if(this.service != null && newservice._id == this.service._id){
        //Show message indicating that the entity has been updated
        this.showSnackBar('SERVICE.ENTITY_UPDATED');
      }
    }
  }

  stopWaitingOperation(){
    this.ngUnsubscribe.pipe(
      take(1),
      mergeMap(() => this.ServiceDetailservice.resetOperation$())
    ).subscribe(val => {
      //console.log('Reset operation');
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
