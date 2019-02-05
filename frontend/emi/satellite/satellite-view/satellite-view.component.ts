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

import { Subject, fromEvent, of, forkJoin, Observable, concat, combineLatest } from "rxjs";

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
import { MarkerRef, VehiclePoint, MARKER_REF_ORIGINAL_INFO_WINDOW_CONTENT } from './map-entities/markerRef';

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

  @ViewChild('gmap') gmapElement: any;

  map: MapRef;
  bounds: google.maps.LatLngBounds;
  markers: MarkerRef[] = [];
  selectedMarker: MarkerRef;


  features = ['AC', 'TRUNK', 'ROOF_RACK', 'PETS', 'BIKE_RACK' ];

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
    this.buildFilterForm(); 
  }

  initMap() {
    this.map = new MapRef(this.gmapElement.nativeElement, {
      center: new google.maps.LatLng(6.1701312, -75.6058417),
      zoom: 14,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
  }

    /**
   * Builds filter form
   */
  buildFilterForm() {
    // Reactive Filter Form
    this.requestForm = new FormGroup({
      taxisNumber: new FormControl(1),
      notes: new FormControl(''),
      features : new FormArray([])
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
  

  showSnackBar(message) {
    this.snackBar.open(this.translationLoader.getTranslate().instant(message),
      this.translationLoader.getTranslate().instant('SERVICE.CLOSE'), {
        duration: 4000
      });
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
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

}
