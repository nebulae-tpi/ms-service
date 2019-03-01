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
import { SelectionModel } from "@angular/cdk/collections";

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
  private loadingData = false;
  //factor to calucllates how many rows per display
  private paginationFactor = 1;
  private page = 0;
  private pageCount = 0;
  //current table max height
  tableHeight: number = 400;

  displayedColumns: string[] = ['selected', 'state', 'creation_timestamp', 'client_name', 'pickup_addr', 'pickup_neig', 'vehicle_plate', 'eta', 'state_time_span', 'distance'];
  dataSource = [];
  selection = new SelectionModel(false, []);




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
        this.pageCount = parseInt(`${(this.tableHeight / 30) * this.paginationFactor}`)
        console.log(`Layout = ${JSON.stringify(layout)}`);
        console.log(`pageCount = ${this.pageCount}`); 
      },
      (error) => console.error(`DatatableComponent.listenLayoutChanges: Error => ${error}`),
      () => console.log(`DatatableComponent.listenLayoutChanges: Completed`),
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
            this.cancelSelectedTrip();
            break;
          case OperatorWorkstationService.TOOLBAR_COMMAND_SERVICE_ASSIGN:
            break;
        }
        console.log({ code, args });
      },
      (error) => console.error(`DatatableComponent.listenToolbarCommands: Error => ${error}`),
      () => console.log(`DatatableComponent.listenToolbarCommands: Completed`),
    );
  }


  loadTable() {
    if (this.loadingData) {
      console.log('ignoring table data refresh, already loading');
      return;
    }

    this.loadingData = true;

    this.operatorWorkstationService.queryServices$([], [], true, this.page, this.pageCount, undefined).subscribe(
      (results) => {
        //console.log(`results = ${JSON.stringify(results)}`);
        const rawData = (results && results.data && results.data.IOEServices) ? results.data.IOEServices : [];
        this.dataSource = rawData.map(s => this.convertServiceToTableFormat(s));
        console.log(`results = ${this.dataSource.length}`);
      },
      (error) => {
        console.error(`DatatableComponent.loadTable: Error => ${error}`);
        this.loadingData = false;
      },
      () => {
        console.log(`DatatableComponent.loadTable: Completed`)
        this.loadingData = false;
      },
    );
  }



  convertServiceToTableFormat({ id, state, timestamp, client, pickUp, pickUpETA, vehicle, driver }) {
    return {
      selected: '',
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

  cancelSelectedTrip() {
    const selectedRow = this.getSelectedRow();
    console.log(selectedRow);
    if (selectedRow) {
      this.operatorWorkstationService.cancelService$({ id: selectedRow.id, reason: 'OTHER', notes: '', authorType: 'OPERATOR' }).subscribe(
        (results) => {          
          console.log(`DatatableComponent.cancelService = ${results}`);
        },
        (error) => {
          console.error(`DatatableComponent.cancelService: Error => ${error}`);
          this.loadingData = false;
        },
        () => {
          console.log(`DatatableComponent.cancelService: Completed`)
          this.loadingData = false;
        },
      );
    }

  }

  //#region SELECTION
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowUp':
        this.selectPrevRow();
        break;
      case 'ArrowDown':
        this.selectNextRow();
        break;
    }
  }

  selectNextRow() {
    if (this.dataSource.length === 0) {
      return;
    }
    const currenSelectedIndex = this.dataSource.findIndex(s => s.selected === '>');
    if (currenSelectedIndex === -1) {
      this.dataSource[0].selected = '>';
    } else {
      if (currenSelectedIndex >= this.dataSource.length - 1) {
        this.dataSource[this.dataSource.length - 1].selected = '>';
      } else {
        this.dataSource[currenSelectedIndex].selected = '';
        this.dataSource[currenSelectedIndex + 1].selected = '>';
      }
    }

  }
  selectPrevRow() {
    if (this.dataSource.length === 0) {
      return;
    }
    const currenSelectedIndex = this.dataSource.findIndex(s => s.selected === '>');
    if (currenSelectedIndex <= 0) {
      this.dataSource[0].selected = '>';
    } else {
      this.dataSource[currenSelectedIndex].selected = '';
      this.dataSource[currenSelectedIndex - 1].selected = '>';
    }
  }
  getSelectedRow() {
    const currenSelectedIndex = this.dataSource.findIndex(s => s.selected === '>');
    return currenSelectedIndex === -1 ? undefined : this.dataSource[currenSelectedIndex];
  }
  //#endregion


}
