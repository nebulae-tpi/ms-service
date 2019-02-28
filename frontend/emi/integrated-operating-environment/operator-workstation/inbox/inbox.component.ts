////////// ANGULAR //////////
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener
} from "@angular/core";

import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
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

//////////// i18n ////////////
import {
  TranslateService,
  LangChangeEvent,
  TranslationChangeEvent
} from "@ngx-translate/core";
import { locale as english } from "../../i18n/en";
import { locale as spanish } from "../../i18n/es";
import { FuseTranslationLoaderService } from "../../../../../core/services/translation-loader.service";


import * as moment from "moment";

//////////// Other Services ////////////
import { KeycloakService } from "keycloak-angular";
import { OperatorWorkstationService } from '../operator-workstation.service';
import { ToolbarService } from "../../../../toolbar/toolbar.service";




@Component({
  // tslint:disable-next-line:component-selector
  selector: 'inbox',
  templateUrl: './inbox.component.html',
  styleUrls: ['./inbox.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class InboxComponent implements OnInit, OnDestroy {
  //Subject to unsubscribe 
  private ngUnsubscribe = new Subject();

  cardWidth: number = 10;
  cardHeight: number = 10;
  cardsContainerLayout: string = "row"
  cardsContainerHeight: number;
  cards = [];


  constructor(
    private formBuilder: FormBuilder,
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private snackBar: MatSnackBar,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private keycloakService: KeycloakService,
    private operatorWorkstationService: OperatorWorkstationService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    console.log('HELLO from INBOX');
    this.listenLayoutChanges();

    this.cards = [
      {icon: "directions_car", shortcutCode: "#03", text: "JULIO RIVES, ITAGUI"},
      {icon: "call", shortcutCode: "#12", text: "Leon Garcia +57301533132"},
      {icon: "call", shortcutCode: "#13", text: "Sebastian Molano +57301533132"},
      {icon: "directions_car", shortcutCode: "#14", text: "VIVA ENVIGADO, ENVIGADO"},
      {icon: "directions_car", shortcutCode: "#15", text: "AVIVA, BELEN"}
    ];
  }



  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  listenLayoutChanges() {
    this.operatorWorkstationService.layoutChanges$.pipe(
      filter(e => e && e.layout),
      map(({ layout }) => layout),
      debounceTime(120),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      (layout) => {
        if (layout.type === OperatorWorkstationService.LAYOUT_HORIZONTAL_WITH_INBOX) {
          this.cardHeight = 100;
          this.cardWidth = layout.inbox.width;
          this.cardsContainerLayout = "column"          
          this.cardsContainerHeight = layout.inbox.height;
        } else if (layout.type === OperatorWorkstationService.LAYOUT_VERTICAL_WITH_INBOX) {
          this.cardWidth = 130;
          this.cardHeight = layout.inbox.height;          
          this.cardsContainerLayout = "row"
          this.cardsContainerHeight = layout.inbox.height;
        }
      },
      (error) => console.error(`DatatableComponent.ngOnInit: Error => ${error}`),
      () => console.log(`DatatableComponent.ngOnInit: Completed`),
    );
  }


}
