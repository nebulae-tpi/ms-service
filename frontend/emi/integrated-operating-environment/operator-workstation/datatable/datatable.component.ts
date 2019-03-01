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
  selector: 'datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss'],
  animations: fuseAnimations,
  providers: []
})
export class DatatableComponent implements OnInit, OnDestroy {
  //Subject to unsubscribe 
  private ngUnsubscribe = new Subject();


  //current table max height
  tableHeight: number = 400;

  displayedColumns: string[] = [ 'state', 'creation_timestamp', 'client_name', 'pickup_addr', 'pickup_neig', 'vehicle_plate', 'eta', 'state_time_span', 'distance'];
  dataSource = [];



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
    console.log('HELLO from datatable');
    this.listenLayoutChanges();
    this.listenToolbarCommands();
    this.loadTable();
  }


  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }


  listenLayoutChanges() {
    this.operatorWorkstationService.layoutChanges$.pipe(
      filter(e => e && e.layout),
      map(({ layout }) => layout),
      debounceTime(250),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      (layout) => {
        this.tableHeight = layout.datatable.height;
        console.log(`Layout = ${JSON.stringify(layout)}`);
      },
      (error) => console.error(`DatatableComponent.ngOnInit: Error => ${error}`),
      () => console.log(`DatatableComponent.ngOnInit: Completed`),
    );
  }

  listenToolbarCommands() {
    this.operatorWorkstationService.toolbarCommands$.pipe(
      //filter(e => e),
      debounceTime(250),
      takeUntil(this.ngUnsubscribe)
    ).subscribe(
      ({ code, args }) => {
        switch (code) {
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_REFRESH:
            this.loadTable();
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_APPLY_CHANNEL_FILTER:
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_APPLY_SERVICE_FILTER:
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_CHANGE_PAGE:
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_DATATABLE_CHANGE_PAGE_COUNT:
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_SERVICE_CANCEL:
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_SERVICE_ASSIGN:
            break;
        }
        console.log({ code, args });
      },
      (error) => console.error(`DatatableComponent.ngOnInit: Error => ${error}`),
      () => console.log(`DatatableComponent.ngOnInit: Completed`),
    );
  }


  loadTable() {
    this.operatorWorkstationService.queryServices$([], [], true, 0, 10, undefined).subscribe(
      (results) => {
        console.log(`results = ${JSON.stringify(results)}`);
        const rawData = (results && results.data && results.data.IOEServices) ? results.data.IOEServices : [];
        this.dataSource = rawData.map(s => this.convertServiceToTableFormat(s));
        console.log(`results = ${JSON.stringify(this.dataSource)}`);
      },
      (error) => console.error(`DatatableComponent.loadTable: Error => ${error}`),
      () => console.log(`DatatableComponent.loadTable: Completed`),
    );
  }

  convertServiceToTableFormat({ id, state, timestamp, client, pickUp, pickUpETA, vehicle, driver }) {
    return {
      id,
      state,
      'creation_timestamp': timestamp,
      'client_name': client.fullname,
      'pickup_addr': pickUp.addressLine1,
      'pickup_neig': pickUp.neighborhood,
      'vehicle_plate': vehicle.licensePlate,
      'eta': pickUpETA,
      'state_time_span': '00:00:00',
      'distance': 2.34
    };
  }


}
