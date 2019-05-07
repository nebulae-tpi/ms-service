import { Injectable } from '@angular/core';
import { GatewayService } from '../../../api/gateway.service';

@Injectable()
export class IntegratedOperatingEnvironmentService {

  
  constructor(private gateway: GatewayService) {
  }
  
}
