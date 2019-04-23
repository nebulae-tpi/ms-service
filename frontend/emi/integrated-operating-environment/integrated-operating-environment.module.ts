import { NgModule } from '@angular/core';
import { MatDialogModule } from '@angular/material';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';
import { ToolbarService } from '../../toolbar/toolbar.service';
import { HotkeyModule, HotkeysService } from 'angular2-hotkeys';

import { IntegratedOperatingEnvironmentService } from './integrated-operating-environment.service';

import { OperatorWorkstationService } from './operator-workstation/operator-workstation.service';
import { OperatorWorkstationComponent } from './operator-workstation/operator-workstation.component';
import { ToolbarComponent as WorkstationToolbarComponent } from './operator-workstation/toolbar/toolbar.component';
import { InboxComponent as WorkstationInboxComponent } from './operator-workstation/inbox/inbox.component';
import { DatatableComponent as WorkstationDatatableComponent } from './operator-workstation/datatable/datatable.component';
import { RequestServiceDialogComponent as WorkstationRequestServiceDialogComponent } from './operator-workstation/request-service-dialog/request-service-dialog.component';

import { GodsEyeService } from './gods-eye/gods-eye.service';
import { GodsEyeComponent } from './gods-eye/gods-eye.component';
import { ToolbarComponent as GodsEyeToolbarComponent } from './gods-eye/toolbar/toolbar.component';
import { StatsComponent as GodsEyeStatsComponent } from './gods-eye/stats/stats.component';
import { MapComponent as GodsEyeMapComponent } from './gods-eye/map/map.component';

import { AgmCoreModule, GoogleMapsAPIWrapper } from '@agm/core';
import { environment } from '../../../../environments/environment';



const routes: Routes = [
  {
    path: '',
    redirectTo: 'operator-workstation',
  },
  {
    path: 'operator-workstation',
    component: OperatorWorkstationComponent,
  },
  {
    path: 'gods-eye',
    component: GodsEyeComponent,
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule,
    HotkeyModule.forRoot(),
    MatDialogModule,
    AgmCoreModule.forRoot({
      apiKey: environment.google.maps.key,
      libraries: ['places']
    }),
  ],
  declarations: [
    OperatorWorkstationComponent,
    WorkstationToolbarComponent,
    WorkstationInboxComponent,
    WorkstationDatatableComponent,
    WorkstationRequestServiceDialogComponent,

    GodsEyeComponent,
    GodsEyeToolbarComponent,
    GodsEyeStatsComponent,
    GodsEyeMapComponent
  ],
  entryComponents: [WorkstationRequestServiceDialogComponent],
  providers: [OperatorWorkstationService, GodsEyeService, HotkeysService, DatePipe]
})

export class IntegratedOperatingEnvironmentModule { }
