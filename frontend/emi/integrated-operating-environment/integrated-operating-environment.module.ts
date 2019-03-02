import { NgModule } from '@angular/core';
import { MatDialogModule } from '@angular/material';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';
import { ToolbarService } from '../../toolbar/toolbar.service';
import { ToolbarComponent } from './operator-workstation/toolbar/toolbar.component';
import { HotkeyModule, HotkeysService } from 'angular2-hotkeys';

import { IntegratedOperatingEnvironmentService } from './integrated-operating-environment.service';
import { OperatorWorkstationService } from './operator-workstation/operator-workstation.service';
import { OperatorWorkstationComponent } from './operator-workstation/operator-workstation.component';
import { InboxComponent } from './operator-workstation/inbox/inbox.component';
import { DatatableComponent } from './operator-workstation/datatable/datatable.component';
import { RequestServiceDialogComponent } from './operator-workstation/request-service-dialog/request-service-dialog.component';


const routes: Routes = [
  {
    path: '',
    redirectTo: 'operator-workstation',
  },
  {
    path: 'operator-workstation',
    component: OperatorWorkstationComponent,
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule,
    HotkeyModule.forRoot(),
    MatDialogModule
  ],
  declarations: [
    OperatorWorkstationComponent,
    ToolbarComponent,
    InboxComponent,
    DatatableComponent,
    RequestServiceDialogComponent,
  ],
  entryComponents: [RequestServiceDialogComponent],
  providers: [OperatorWorkstationService, HotkeysService, DatePipe]
})

export class IntegratedOperatingEnvironmentModule { }