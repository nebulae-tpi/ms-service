////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  Input
} from '@angular/core';

import {
  FormGroup,
  FormControl,
  FormArray
} from '@angular/forms';

////////// RXJS ///////////
import { filter, tap } from 'rxjs/operators';
import { Subject, of} from 'rxjs';
//////////// ANGULAR MATERIAL ///////////
import { MatSnackBar, MatDialog } from '@angular/material';

//////////// i18n ////////////
import { TranslateService } from '@ngx-translate/core';
import { locale as english } from '../../i18n/en';
import { locale as spanish } from '../../i18n/es';
import { FuseTranslationLoaderService } from '../../../../../core/services/translation-loader.service';

//////////// Others ////////////
import { DialogComponent } from '../../dialog/dialog.component';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'shift-vehicle-info',
  templateUrl: './shift-vehicle-info.component.html',
  styleUrls: ['./shift-vehicle-info.component.scss']
})
// tslint:disable-next-line:class-name
export class ShiftVehicleInfoComponent implements OnInit, OnDestroy {
  // Subject to unsubscribe
  private ngUnsubscribe = new Subject();

  @Input('shift') shift: any;

  shiftVehicleInfoForm: any;

  constructor(
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    public snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
      this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    this.shiftVehicleInfoForm = new FormGroup({
      id: new FormControl(this.shift ? (this.shift.vehicle || {}).id : ''),
      brand: new FormControl(this.shift ? (this.shift.vehicle || {}).brand : ''),
      licensePlate: new FormControl(this.shift ? (this.shift.vehicle || {}).licensePlate : ''),
      model: new FormControl(this.shift ? (this.shift.vehicle || {}).model : ''),
      line: new FormControl(this.shift ? (this.shift.vehicle || {}).line : ''),
      blocks: new FormArray([]),
      features: new FormArray([])
    });
  }

  showConfirmationDialog$(dialogMessage, dialogTitle) {
    return this.dialog
      // Opens confirm dialog
      .open(DialogComponent, {
        data: {
          dialogMessage,
          dialogTitle
        }
      })
      .afterClosed()
      .pipe(
        filter(okButton => okButton),
      );
  }

  showSnackBar(message) {
    this.snackBar.open(this.translationLoader.getTranslate().instant(message),
      this.translationLoader.getTranslate().instant('SERVICE.CLOSE'), {
        duration: 6000
      });
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
