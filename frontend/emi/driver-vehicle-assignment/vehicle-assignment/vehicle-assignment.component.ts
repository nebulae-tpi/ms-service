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
import { VehicleAssignmentService } from './vehicle-assignment.service';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'driver',
  templateUrl: './vehicle-assignment.component.html',
  styleUrls: ['./vehicle-assignment.component.scss']
})
// tslint:disable-next-line:class-name
export class VehicleAssignmentComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();

  pageType: string;

  driver: any;

  constructor(
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private formBuilder: FormBuilder,
    public snackBar: MatSnackBar,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private vehicleAssignmentService: VehicleAssignmentService,
    private route: ActivatedRoute
  ) {
      this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    this.loaddriver();
    this.subscribeDriverUpdated();
    this.stopWaitingOperation();
  }

  loaddriver(){
    this.route.params
    .pipe(
      map(params => params['id']),
      mergeMap(entityId => entityId !== 'new' ?
        this.vehicleAssignmentService.getServiceDriver$(entityId).pipe(
          map(res => res.data.ServiceDriver)
        ) : of(null)
      ),
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe((driver: any) => {
      this.driver = driver;
      this.pageType = (driver && driver._id) ? 'edit' : 'new'
    }, e => console.log(e));
  }
  
  subscribeDriverUpdated(){
    this.vehicleAssignmentService.subscribeServiceDriverUpdatedSubscription$()
    .pipe(
      map(subscription => subscription.data.ServiceDriverUpdatedSubscription),
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe((driver: any) => {
      this.checkIfEntityHasBeenUpdated(driver);
    })
  }

  checkIfEntityHasBeenUpdated(newdriver){
    if(this.vehicleAssignmentService.lastOperation === 'CREATE'){

      //Fields that will be compared to check if the entity was created
      if(newdriver.generalInfo.name === this.vehicleAssignmentService.driver.generalInfo.name 
        && newdriver.generalInfo.description === this.vehicleAssignmentService.driver.generalInfo.description){
        //Show message entity created and redirect to the main page
        this.showSnackBar('SERVICE.ENTITY_CREATED');
        this.router.navigate(['driver/']);
      }

    }else if(this.vehicleAssignmentService.lastOperation == 'UPDATE'){
      // Just comparing the ids is enough to recognise if it is the same entity
      if(newdriver._id == this.driver._id){
        //Show message entity updated and redirect to the main page
        this.showSnackBar('SERVICE.ENTITY_UPDATED');
        //this.router.navigate(['driver/']);
      }

    }else{
      if(this.driver != null && newdriver._id == this.driver._id){
        //Show message indicating that the entity has been updated
        this.showSnackBar('SERVICE.ENTITY_UPDATED');
      }
    }
  }

  stopWaitingOperation(){
    this.ngUnsubscribe.pipe(
      take(1),
      mergeMap(() => this.vehicleAssignmentService.resetOperation$())
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
