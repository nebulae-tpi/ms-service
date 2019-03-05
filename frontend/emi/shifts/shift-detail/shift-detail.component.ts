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
    // this.subscribeServiceUpdated();
  }

  loadShift(){
    this.route.params
    .pipe(
      map(params => params['id']),
      mergeMap(shiftId => shiftId !== 'new'
        ? this.shiftDetailService.getShiftDetails$(shiftId).
          pipe(map(res => res.data.ServiceShift))
        : of(null)
      ),
      takeUntil(this.ngUnsubscribe),
      tap(shift => this.shift = shift )
    )
    .subscribe(() => {}, e => console.log(e));
  }

  // subscribeServiceUpdated(){
  //   this.shiftDetailService.subscribeServiceServiceUpdatedSubscription$()
  //   .pipe(
  //     map(subscription => subscription.data.ServiceServiceUpdatedSubscription),
  //     takeUntil(this.ngUnsubscribe),
  //     tap(shift => this.shift = shift)
  //   )
  //   .subscribe(() => {}, e => console.log(e), () => {} );
  // }

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
