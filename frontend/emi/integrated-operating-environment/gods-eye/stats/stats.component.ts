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
import { GodsEyeService } from '../gods-eye.service';
import { ToolbarService } from "../../../../toolbar/toolbar.service";




@Component({
  // tslint:disable-next-line:component-selector
  selector: 'stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class StatsComponent implements OnInit, OnDestroy {
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
    private godsEyeService: GodsEyeService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }


  ngOnInit() {
    this.listenLayoutChanges();
  }



  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  listenLayoutChanges() {
    this.godsEyeService.layoutChanges$.pipe(
      filter(e => e && e.layout),
      map(({ layout }) => layout),
      debounceTime(120),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      (layout) => {
        if (layout.type === GodsEyeService.LAYOUT_HORIZONTAL_WITH_STATS) {
          this.cardHeight = 100;
          this.cardWidth = layout.stats.width;
          this.cardsContainerLayout = "column"          
          this.cardsContainerHeight = layout.stats.height;
        } else if (layout.type === GodsEyeService.LAYOUT_VERTICAL_WITH_STATS) {
          this.cardWidth = 130;
          this.cardHeight = layout.stats.height;          
          this.cardsContainerLayout = "row"
          this.cardsContainerHeight = layout.stats.height;
        }
      },
      (error) => console.error(`MapComponent.ngOnInit: Error => ${error}`),
      () => console.log(`MapComponent.ngOnInit: Completed`),
    );
  }


}
