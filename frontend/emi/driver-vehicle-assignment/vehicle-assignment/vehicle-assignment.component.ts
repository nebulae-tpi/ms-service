////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from '@angular/forms';

import { Router, ActivatedRoute } from '@angular/router';

////////// RXJS ///////////
import { map, mergeMap, tap, takeUntil, take, combineLatest, filter } from 'rxjs/operators';
import { Subject, of, forkJoin} from 'rxjs';

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

  assignmentForm = new FormGroup({
    licensePlate: new FormControl('')
  });

  driver: any;

  /////// TABLE /////////

  dataSource = new MatTableDataSource();

  @ViewChild(MatPaginator)
  paginator: MatPaginator;
  tableSize: number;
  tablePage = 0;
  tableCount = 10;

  // Columns to show in the table
  displayedColumns = [
    'licensePlate',
    'model',
    'fuelType',
    'brand',
    'active',
    'actions'
  ];

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
    this.stopWaitingOperation();
  }

  loaddriver(){
    this.route.params
    .pipe(
      map(params => params['id']),
      mergeMap(entityId => entityId !== 'new' ?
        forkJoin(
          this.vehicleAssignmentService.getServiceDriver$(entityId),
          this.vehicleAssignmentService.getDriverVehiclesAssigned$(entityId, { page: 0, count: 10, sort: 1 } )
        )
          .pipe(
            map(([res, vehicleList]) => ({
              driver: res.data.ServiceDriver,
              vehicleList: vehicleList.data.ServiceDriverVehicleList
            }))
          )
        : of(null)
      ),
      takeUntil(this.ngUnsubscribe)
    )
    .subscribe( ({ driver, vehicleList }) => {
      this.driver = driver;
      this.tableSize = this.driver ? this.driver.assignedVehicles.length: 0;
      if(this.driver){
        this.subscribeDriverVehicleAssigments();
      }      
      this.dataSource.data = vehicleList;
    }, e => console.log(e));
  }

  subscribeDriverVehicleAssigments(){
    this.vehicleAssignmentService.listenServiceDriverVehicleAssignedEvts$(this.driver._id)
    .pipe(
      map(subscription => subscription.data.ServiceDriverVehicleAssignedSubscription),
      takeUntil(this.ngUnsubscribe),
      tap(newVehicle => this.dataSource.data = [newVehicle, ...this.dataSource.data])
    )
    .subscribe((vehicle: any) => {
      console.log(vehicle);
    });
  }

  checkIfEntityHasBeenUpdated(newdriver){
    if (this.vehicleAssignmentService.lastOperation === 'CREATE'){

      // Fields that will be compared to check if the entity was created
      if (newdriver.generalInfo.name === this.vehicleAssignmentService.driver.generalInfo.name
        && newdriver.generalInfo.description === this.vehicleAssignmentService.driver.generalInfo.description){
        // Show message entity created and redirect to the main page
        this.showSnackBar('DRIVER.ENTITY_CREATED');
        this.router.navigate(['driver/']);
      }

    }else if (this.vehicleAssignmentService.lastOperation === 'UPDATE'){
      // Just comparing the ids is enough to recognise if it is the same entity
      if (newdriver._id === this.driver._id){
        // Show message entity updated and redirect to the main page
        this.showSnackBar('DRIVER.ENTITY_UPDATED');
        // this.router.navigate(['driver/']);
      }

    }else{
      if (this.driver != null && newdriver._id === this.driver._id){
        // Show message indicating that the entity has been updated
        this.showSnackBar('DRIVER.ENTITY_UPDATED');
      }
    }
  }

  addVehicleToDriver(){
    this.vehicleAssignmentService.assignVehicleToDriver$( this.driver._id, this.assignmentForm.getRawValue().licensePlate.toUpperCase())
    .pipe(
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      filter(r => !r.errors),
      takeUntil(this.ngUnsubscribe),
      tap(() => this.showMessageSnackbar(this.translationLoader.getTranslate().instant('DRIVER.VEHICLE_ASSIGNED')))
    )
    .subscribe();
  }

  removeVehicleFromDriver(vehicleRow: any){
    this.vehicleAssignmentService.unassignVehicleToDriver$(this.driver._id, vehicleRow.licensePlate )
    .pipe(
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      filter(r => !r.errors),
      takeUntil(this.ngUnsubscribe),
      tap(() => this.dataSource.data = this.dataSource.data.filter((e: any) => e.licensePlate !== vehicleRow.licensePlate) ),
      tap(() => this.showMessageSnackbar(this.translationLoader.getTranslate().instant('DRIVER.VEHICLE_UNASSIGNED')))
    )
    .subscribe();
  }



  graphQlAlarmsErrorHandler$(response) {
    return of(JSON.parse(JSON.stringify(response)))
      .pipe(
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

    this.translate.get(translationData)
      .subscribe(data => {
        this.snackBar.open(
          messageKey ? data[messageKey] : '',
          detailMessageKey ? data[detailMessageKey] : '',
          {
            duration: 4000
          }
        );
      });
  }


  stopWaitingOperation(){
    this.ngUnsubscribe.pipe(
      take(1),
      mergeMap(() => this.vehicleAssignmentService.resetOperation$())
    ).subscribe(val => {});
  }

  showSnackBar(message) {
    this.snackBar.open(this.translationLoader.getTranslate().instant(message),
      this.translationLoader.getTranslate().instant('DRIVER.CLOSE'), {
        duration: 4000
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}
