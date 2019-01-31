import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { DriverService } from './driver.service';
import { DriverListService } from './driver-list/driver-list.service';
import { DriverListComponent } from './driver-list/driver-list.component';
import { DriverDetailService } from './driver-detail/driver-detail.service';
import { DriverDetailComponent } from './driver-detail/driver-detail.component';
import { DriverDetailGeneralInfoComponent } from './driver-detail/general-info/driver-general-info.component';
import { ToolbarService } from '../../toolbar/toolbar.service';
import { DialogComponent } from './dialog/dialog.component';

const routes: Routes = [
  {
    path: '',
    component: DriverListComponent,
  },
  {
    path: ':id',
    component: DriverDetailComponent,
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule
  ],
  declarations: [
    DialogComponent,
    DriverListComponent,
    DriverDetailComponent,
    DriverDetailGeneralInfoComponent
  ],
  entryComponents: [DialogComponent],
  providers: [ DriverService, DriverListService, DriverDetailService, DatePipe]
})

export class DriverModule {}
