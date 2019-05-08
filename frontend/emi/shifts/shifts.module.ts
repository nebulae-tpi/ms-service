import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';
import { ShiftListService } from './shift-list/shift-list.service';
import { ShiftListComponent } from './shift-list/shift-list.component';
import { ShiftDetailService } from './shift-detail/shift-detail.service';
import { ShiftDetailComponent } from './shift-detail/shift-detail.component';
import { ShiftStateChangesComponent } from './shift-detail/state-changes/shift-state-changes.component';
import { ToolbarService } from '../../toolbar/toolbar.service';
import { DialogComponent } from './dialog/dialog.component';
import { ShiftDriverInfoComponent } from './shift-detail/driver-info/shift-driver-info.component';
import { ShiftVehicleInfoComponent } from './shift-detail/vehicle-info/shift-vehicle-info.component';

const routes: Routes = [
  {
    path: '',
    component: ShiftListComponent,
  },
  {
    path: ':id',
    component: ShiftDetailComponent,
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
    ShiftListComponent,
    ShiftDetailComponent,
    ShiftDriverInfoComponent,
    ShiftVehicleInfoComponent,
    ShiftStateChangesComponent
  ],
  entryComponents: [DialogComponent],
  providers: [ ShiftListService, ShiftDetailService, DatePipe]
})


export class ShiftsModule {}