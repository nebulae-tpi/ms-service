import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { DriverService } from './driver-vehicle-assignment.service';
import { DriverListService } from './driver-list/driver-list.service';
import { DriverListComponent } from './driver-list/driver-list.component';
import { VehicleAssignmentService } from './vehicle-assignment/vehicle-assignment.service';
// import { VehicleAssignmentComponent } from './vehicle-assignment/assigments/assignments.component';
import { VehicleAssignmentComponent } from './vehicle-assignment/vehicle-assignment.component';
import { ToolbarService } from '../../toolbar/toolbar.service';
import { DialogComponent } from './dialog/dialog.component';


const routes: Routes = [
  {
    path: '',
    component: DriverListComponent,
  },
  {
    path: ':id',
    component: VehicleAssignmentComponent,
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
    VehicleAssignmentComponent
  ],
  entryComponents: [DialogComponent],
  providers: [ DriverService, DriverListService, VehicleAssignmentService, DatePipe]
})

export class DriverVehicleAssignmentModule {}
