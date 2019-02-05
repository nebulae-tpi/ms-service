import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { ServiceService } from './service.service';

import { ServiceListService } from './service-list/service-list.service';
import { ServiceListComponent } from './service-list/service-list.component';
import { ServiceDetailService } from './service-detail/service-detail.service';
import { ServiceDetailComponent } from './service-detail/service-detail.component';
import { ServiceDetailGeneralInfoComponent } from './service-detail/general-info/service-general-info.component';
import { ToolbarService } from '../../toolbar/toolbar.service';
import { DialogComponent } from './dialog/dialog.component';
import { ServiceStateChangesComponent } from './service-detail/state-changes/service-state-changes.component';
import { ServiceRouteTrackingComponent } from './service-detail/route-tracking/service-route-tracking.component';

const routes: Routes = [
  {
    path: '',
    component: ServiceListComponent,
  },
  {
    path: ':id',
    component: ServiceDetailComponent,
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
    ServiceListComponent,
    ServiceDetailComponent,
    ServiceStateChangesComponent,
    ServiceRouteTrackingComponent,
    ServiceDetailGeneralInfoComponent
  ],
  entryComponents: [DialogComponent],
  providers: [ ServiceService, ServiceListService, ServiceDetailService, DatePipe]
})

export class ServiceModule {}
