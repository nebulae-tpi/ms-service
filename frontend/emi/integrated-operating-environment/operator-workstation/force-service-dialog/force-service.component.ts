import { Component, OnInit, Inject} from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

export interface DialogData {
  dialogTitle: string;
  dialogMessage: string;
}

@Component({
  selector: 'force-service-dialog',
  templateUrl: './force-service.component.html',
  styleUrls: ['./force-service.component.scss']
})
export class ForceServiceDialogComponent implements OnInit {

  constructor(private dialogRef: MatDialogRef<ForceServiceDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: DialogData) {

  }

  ngOnInit() {

  }

  pushButton(okButton: Boolean) {
    this.dialogRef.close(okButton);
  }

}
