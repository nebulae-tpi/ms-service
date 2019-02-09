import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { SatelliteViewComponent } from './satellite-view/satellite-view.component';
import { SatelliteServiceListComponent } from './satellite-view/satellite-service-list/satellite-service-list.component';
import { SatelliteService } from './satellite.service';
import { ToolbarService } from '../../toolbar/toolbar.service';
import { DialogComponent } from './dialog/dialog.component';
import { CancelServiceDialogComponent } from './dialog/cancel-service-dialog/cancel-service-dialog.component';
import { SatelliteViewService } from './satellite-view/satellite-view.service';
import { SatelliteServiceListService } from './satellite-view/satellite-service-list/satellite-service-list.service';

const routes: Routes = [
  {
    path: '',
    component: SatelliteViewComponent,
  },
];


@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule
  ],
  declarations: [
    DialogComponent,
    CancelServiceDialogComponent,
    SatelliteViewComponent,
    SatelliteServiceListComponent
  ],
  entryComponents: [DialogComponent, CancelServiceDialogComponent],
  providers: [ SatelliteService, SatelliteViewService, SatelliteServiceListService, DatePipe]
})
export class SatelliteModule {}
