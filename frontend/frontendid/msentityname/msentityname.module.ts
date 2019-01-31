import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { msentitypascalService } from './msentityname.service';
import { msentitypascalListService } from './msentityname-list/msentityname-list.service';
import { msentitypascalListComponent } from './msentityname-list/msentityname-list.component';
import { msentitypascalDetailService } from './msentityname-detail/msentityname-detail.service';
import { msentitypascalDetailComponent } from './msentityname-detail/msentityname-detail.component';
import { msentitypascalDetailGeneralInfoComponent } from './msentityname-detail/general-info/msentityname-general-info.component';
import { ToolbarService } from '../../toolbar/toolbar.service';
import { DialogComponent } from './dialog/dialog.component';

const routes: Routes = [
  {
    path: '',
    component: msentitypascalListComponent,
  },
  {
    path: ':id',
    component: msentitypascalDetailComponent,
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
    msentitypascalListComponent,
    msentitypascalDetailComponent,
    msentitypascalDetailGeneralInfoComponent
  ],
  entryComponents: [DialogComponent],
  providers: [ msentitypascalService, msentitypascalListService, msentitypascalDetailService, DatePipe]
})

export class msentitypascalModule {}
