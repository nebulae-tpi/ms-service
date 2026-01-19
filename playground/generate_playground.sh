#!/bin/bash

# FrontEnd - EMI composition
nebulae compose-ui development --shell-type=FUSE2_ANGULAR --shell-repo=https://github.com/nebulae-tpi/emi --frontend-id=emi --output-dir=emi  --setup-file=../etc/mfe-setup.json
nebulae compose-ui development --shell-type=FUSE2_ANGULAR --shell-repo=git@github.com:nebulae-tpi/emi.git --frontend-id=emi --output-dir=emi  --setup-file=../etc/mfe-setup.json


# API - EMI-GateWay composition
nebulae compose-api development --api-type=NEBULAE_GATEWAY --api-repo=https://github.com/nebulae-tpi/emi-gateway --api-id=emi-gateway --output-dir=emi-gateway  --setup-file=../etc/mapi-setup.json
nebulae compose-api development --api-type=NEBULAE_GATEWAY --api-repo=git@github.com:nebulae-tpi/emi-gateway.git --api-id=emi-gateway --output-dir=emi-gateway  --setup-file=../etc/mapi-setup.json


# API - Driver-GateWay composition
nebulae compose-api development --api-type=NEBULAE_GATEWAY --api-repo=https://github.com/nebulae-tpi/driver-gateway --api-id=driver-gateway --output-dir=driver-gateway  --setup-file=../etc/mapi-driver-setup.json

# API - Client-GateWay composition
nebulae compose-api development --api-type=NEBULAE_GATEWAY --api-repo=https://github.com/nebulae-tpi/client-gateway --api-id=client-gateway --output-dir=client-gateway  --setup-file=../etc/mapi-client-setup.json

#   STACK COMPOSITION: BUSINESS_MGR + USER_MGR + DRIVER + VEHICLE + SERVICE
nebulae compose-ui development --shell-type=FUSE2_ANGULAR --shell-repo=https://github.com/nebulae-tpi/emi --frontend-id=emi --output-dir=emi  --setup-file="../etc/mfe-setup.json,../../ms-business-management/etc/mfe-setup.json,../../ms-user-management/etc/mfe-setup.json,../../ms-vehicle/etc/mfe-setup.json,../../ms-driver/etc/mfe-setup.json"
nebulae compose-api development --api-type=NEBULAE_GATEWAY --api-repo=https://github.com/nebulae-tpi/emi-gateway --api-id=emi-gateway --output-dir=emi-gateway  --setup-file="../etc/mapi-setup.json,../../ms-business-management/etc/mapi-setup.json,../../ms-user-management/etc/emi-mapi-setup.json,../../ms-vehicle/etc/mapi-setup.json,../../ms-driver/etc/mapi-setup.json"

# Open Terminal with all backends
open -a Terminal /Users/sebastianmolano/NebulaE/Projects/TPI/ms-service/deployment/compose;
open -a Terminal /Users/sebastianmolano/NebulaE/Projects/TPI/ms-service/playground/emi;
open -a Terminal /Users/sebastianmolano/NebulaE/Projects/TPI/ms-service/playground/driver-gateway;
open -a Terminal /Users/sebastianmolano/NebulaE/Projects/TPI/ms-service/playground/emi-gateway;


open -a Terminal /Users/sebastianmolano/NebulaE/Projects/TPI/ms-business-management/backend/business-management;
open -a Terminal /Users/sebastianmolano/NebulaE/Projects/TPI/ms-user-management/backend/user-management;
open -a Terminal /Users/sebastianmolano/NebulaE/Projects/TPI/ms-driver/backend/driver;
open -a Terminal /Users/sebastianmolano/NebulaE/Projects/TPI/ms-vehicle/backend/vehicle;

open -a Terminal sebastianmolano$ /Users/sebastianmolano/NebulaE/Projects/TPI/ms-service/backend/driver-app-link
open -a Terminal sebastianmolano$ /Users/sebastianmolano/NebulaE/Projects/TPI/ms-service/backend/service/
open -a Terminal sebastianmolano$ /Users/sebastianmolano/NebulaE/Projects/TPI/ms-service/backend/service-core
open -a Terminal sebastianmolano$ /Users/sebastianmolano/NebulaE/Projects/TPI/ms-service/backend/integrated-operating-environment