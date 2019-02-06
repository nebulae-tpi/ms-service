////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy
} from '@angular/core';


import { ActivatedRoute } from '@angular/router';

////////// RXJS ///////////
import { map, mergeMap, tap, takeUntil, take } from 'rxjs/operators';
import { Subject, of} from 'rxjs';

//////////// ANGULAR MATERIAL ///////////
import {
  MatSnackBar
} from '@angular/material';

//////////// i18n ////////////
import { locale as english } from '../i18n/en';
import { locale as spanish } from '../i18n/es';
import { FuseTranslationLoaderService } from '../../../../core/services/translation-loader.service';

//////////// Other Services ////////////
import { ShiftDetailService } from './shift-detail.service';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'emi-shift-info',
  templateUrl: './shift-detail.component.html',
  styleUrls: ['./shift-detail.component.scss']
})
// tslint:disable-next-line:class-name
export class ShiftDetailComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();

  shift: any;

  // test

  SHIFT_TEST = {
    '_id': 'q1w2e3-r4t5y6-edfr567gt-yhuyj-734',
    'businessId': 'q1q1q1q-w2w2-e3e3-r4r4-t5y66656-545644',
    'timestamp': 1000000,
    'state': 'AVAILABLE',
    'stateChanges': [
      {
        'state': '',
        'timestamp': 123456,
      }
    ],
    'online': true,
    'onlineChanges': [{ 'online': true, 'timestamp': 23456 }],
    'lastReceivedComm': 1000000,
    'location': {
      'type': 'Point',
      'coordinates': [-73.9928, 40.7193]
    },
    'driver': {
      'id': 'e3r4t5-y6u7i8-q1w2e3-r4tt5y6-j6k7l8',
      'fullname': 'Juan Felipe Santa Ospina',
      'blocks': ['KEY', 'KEY'],
      'documentType': 'CC',
      'documentId': '1045059869',
      'pmr': false,
      'languages': ['EN'],
      'phone': '3125210012',
      'username': 'juan.santa',
    },
    'vehicle': {
      'id': 'w2e3-r4t5-y6u7-i8o9',
      'licensePlate': 'MNP137',
      'blocks': ['KEY', 'KEY'],
      'features': ['AC', 'TRUNK'],
      'brand': 'MAZDA',
      'line': 'Sport',
      'model': '2017',
    },
  };


  constructor(
    private translationLoader: FuseTranslationLoaderService,
    public snackBar: MatSnackBar,
    private shiftDetailService: ShiftDetailService,
    private route: ActivatedRoute
  ) {
      this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    this.loadShift();
    this.subscribeServiceUpdated();
  }

  loadShift(){
    this.route.params
    .pipe(
      map(params => params['id']),
      mergeMap(shiftId => shiftId !== 'new'
        ? this.shiftDetailService.getShiftDetails$(shiftId).
          pipe(map(res => res.data.ServiceService))
        : of(null)
      ),
      takeUntil(this.ngUnsubscribe),

      // REMOVE
      map(() => this.SHIFT_TEST),

      tap(shift => this.shift = shift )
    )
    .subscribe(() => {}, e => console.log(e));
  }

  subscribeServiceUpdated(){
    this.shiftDetailService.subscribeServiceServiceUpdatedSubscription$()
    .pipe(
      map(subscription => subscription.data.ServiceServiceUpdatedSubscription),
      takeUntil(this.ngUnsubscribe),
      tap(shift => this.shift = shift)
    )
    .subscribe(() => {}, e => console.log(e), () => {} );
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
