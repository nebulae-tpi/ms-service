import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import * as Rx from 'rxjs';
import { GatewayService } from '../../../api/gateway.service';

@Injectable()
export class DriverService {

  constructor(private gateway: GatewayService) {

  }

}
