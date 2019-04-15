import { OnDestroy } from '@angular/core';
////////// ANGULAR /////////////
import { Component, OnInit, Inject} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
  FormArray
} from "@angular/forms";

////////// RXJS /////////
import { map, mergeMap, takeUntil, tap } from 'rxjs/operators';
import { of, Subject } from 'rxjs';

////////// ANGULAR MATERIAL //////////
import { MatDialog, MatSnackBar, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

///////// I18N //////////
import { TranslateService } from '@ngx-translate/core';
import { FuseTranslationLoaderService } from "../../../../../core/services/translation-loader.service";
import { locale as english } from "../../i18n/en";
import { locale as spanish } from "../../i18n/es";

///////// SERVICES ////////
import { SatelliteServiceListService } from '../../satellite-view/satellite-service-list/satellite-service-list.service';

export interface DialogData {
  serviceId: string;
  authorType: string;
}

@Component({
  selector: 'app-cancel-service-dialog.component',
  templateUrl: './cancel-service-dialog.component.html',
  styleUrls: ['./cancel-service-dialog.component.scss']
})
export class CancelServiceDialogComponent implements OnInit, OnDestroy {

  //Subject to unsubscribe 
  private ngUnsubscribe = new Subject();

  // FORMS
  cancelServiceForm: FormGroup;

  // Service cancellation options
  CANCELLATION_BY_OPERATOR_REASONS = ['IT_TAKES_TOO_MUCH_TIME', 'DOESNT_REQUIRED', 'OTHER'];
  CANCELLATION_BY_CLIENT_REASONS = ['PLATE_DOESNT_MATCH', 'IS_NOT_THE_DRIVER', 'IT_TAKES_TOO_MUCH_TIME', 'DOESNT_REQUIRED'];

  cancelOptions = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData, 
    private dialogRef: MatDialogRef<CancelServiceDialogComponent>,
    private translate: TranslateService,
    private snackBar: MatSnackBar,
    private satelliteServiceListService: SatelliteServiceListService,
    private translationLoader: FuseTranslationLoaderService
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }

  ngOnInit() {
    this.buildCancelServiceForm();
    this.cancelOptions =  (this.data.authorType == 'OPERATOR') ? this.CANCELLATION_BY_OPERATOR_REASONS : this.CANCELLATION_BY_CLIENT_REASONS;
  }

    /**
   * Builds request taxi form
   */
  buildCancelServiceForm() {
    // Reactive Filter Form
    this.cancelServiceForm = new FormGroup({
      reason: new FormControl(null, [Validators.required]),
      notes: new FormControl(null)
    });
  }

  /**
   * cancel a service
   * @param service 
   */
  cancelService(){
    return of('')
    .pipe(
      map(() => {
        return {
          id: this.data.serviceId, 
          reason: this.cancelServiceForm.getRawValue().reason, 
          authorType: this.data.authorType, 
          notes: this.cancelServiceForm.getRawValue().notes
        };
      }),
      mergeMap(serviceCoreCancelService => this.satelliteServiceListService.cancelServiceCoreCancelService$(serviceCoreCancelService)),
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      map(resp => resp.data.ServiceCoreCancelService),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      (result: any) => {
        if (result && result.accepted) {
          this.showSnackBar('SATELLITE.SERVICES.CANCEL_SERVICE_SUCCESS');
          this.closeDialog(true);
        }
        // else{
        //   this.showSnackBar('SATELLITE.SERVICES.ERROR_OPERATION');
        // }
      },
      error => {
        this.showSnackBar('SATELLITE.ERROR_OPERATION');
        console.log('Error ==> ', error);
      }
    );    
  }

  closeDialog(operation) {
    this.dialogRef.close(operation);
  }

  showSnackBar(message) {
    this.snackBar.open(this.translationLoader.getTranslate().instant(message),
      this.translationLoader.getTranslate().instant('SATELLITE.CLOSE'), {
         duration: 4000
    });
  }

  graphQlAlarmsErrorHandler$(response) {
    return of(JSON.parse(JSON.stringify(response))).pipe(
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

    console.log('translationData => ', this.translationLoader.getTranslate().instant(messageKey), detailMessageKey);
    this.translate.get(translationData).subscribe(data => {
      
      this.snackBar.open(
        messageKey ? this.translationLoader.getTranslate().instant(messageKey) : "",
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
