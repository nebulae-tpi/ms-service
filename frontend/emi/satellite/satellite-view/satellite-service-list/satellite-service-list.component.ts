import { EventEmitter } from '@angular/core';

////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostBinding, 
  Renderer2,
  Input,
  Output
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
import { fuseAnimations } from "../../../../../core/animations";
import { style, animate, AnimationBuilder, AnimationPlayer } from '@angular/animations';

//////////// i18n ////////////
import {
  TranslateService,
  LangChangeEvent,
  TranslationChangeEvent
} from "@ngx-translate/core";
import { locale as english } from "../../i18n/en";
import { locale as spanish } from "../../i18n/es";

///////// DATEPICKER //////////
import * as moment from "moment";

//////////// Other Services ////////////
import { KeycloakService } from "keycloak-angular";
import { SatelliteServiceListService } from './satellite-service-list.service';
import { ToolbarService } from "../../../../toolbar/toolbar.service";

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'satellite-service-list',
  templateUrl: './satellite-service-list.component.html',
  styleUrls: ['./satellite-service-list.component.scss'],
  animations: fuseAnimations
})
export class SatelliteServiceListComponent implements OnInit, OnDestroy {
  //Subject to unsubscribe 
  private ngUnsubscribe = new Subject();

  @Input('serviceList') serviceList: any = [];

  @Output() selectedServiceChange = new EventEmitter();

  @ViewChild('openButton') openButton;
  @ViewChild('panel') panel;
  @ViewChild('overlay') overlay: ElementRef;

  @HostBinding('class.bar-closed') barClosed: boolean = true;

  dateNow = Date.now();
  items = [1, 2, 3, 4, 5, 6, 7, 8];

  public player: AnimationPlayer;

  constructor(    
    private formBuilder: FormBuilder,
    private translate: TranslateService,
    private snackBar: MatSnackBar,
    private satelliteServiceListService: SatelliteServiceListService,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private keycloakService: KeycloakService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog,
    private animationBuilder: AnimationBuilder,
    private renderer: Renderer2
  ) {
  }
    

  ngOnInit()
  {
      this.renderer.listen(this.overlay.nativeElement, 'click', () => {
          this.closeBar();
      });
  }

  closeBar()
  {
    if(!this.barClosed){
      console.log('closeBar ');
      this.player =
          this.animationBuilder
              .build([
                  style({transform: 'translate3d(0,0,0)'}),
                  animate('400ms ease', style({transform: 'translate3d(100%,0,0)'}))
              ]).create(this.panel.nativeElement);

      this.player.play();

      this.player.onDone(() => {
          this.barClosed = true;
      });
    }
  }
  
  openBar()
  {
    if(this.barClosed){    
      console.log('openBar ');
      this.barClosed = false;

      this.player =
          this.animationBuilder
              .build([
                  style({transform: 'translate3d(100%,0,0)'}),
                  animate('400ms ease', style({transform: 'translate3d(0,0,0)'}))
              ]).create(this.panel.nativeElement);

      this.player.play();
    }
  }

  /**
   * Set the selected service
   * @param service 
   */
  selectService(service){
    console.log('Selected service => ', service);
    this.selectedServiceChange.emit(service);
  }

  showSnackBar(message) {
    // this.snackBar.open(this.translationLoader.getTranslate().instant(message),
    //   this.translationLoader.getTranslate().instant('SERVICE.CLOSE'), {
    //     duration: 4000
    //   });
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
