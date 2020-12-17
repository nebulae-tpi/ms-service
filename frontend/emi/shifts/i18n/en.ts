export const locale = {
  lang: 'en',
  data: {
    SHIFT: {
      CANCEL: 'Cancel',
      CLOSE_SHIFT: 'Close Shift',
      CLOSE_SHIFT_MESSAGE: 'Do you want to close the driver\'s shift?',
      SHIFT_CLOSED: 'The Shift Has Been Closed',
      HEADER_TITLE: 'SHIFTS',
      DETAIL_HEADER_NAME: 'Shift Detail',
      SHIFT_TABLE_LIST: {
        TIMESTAMP: 'Date',
        CLIENT_NAME: 'Client Name',
        DRIVER_NAME: 'Driver Name',
        DRIVER_USERNAME: 'Driver Username',
        LICENSE_PLATE: 'Vehicle id',
        DRIVER_DOCUMENT: 'Driver Document ID',
        SHIFT_STATE: 'State',
        LAST_COMMUNICATION: 'Last Communication Established',
        ACTIONS: 'Actions'
      },
      DRIVER_DETAIL: {
        ID: 'ID',
        FULL_NAME: 'Fullname',
        DOC_TYPE: 'Document Type',
        DOC_TYPES: {
          CC: 'Document ID',
          PASSPORT: 'Passtort'
        },
        LANGUAGES_TITLE: 'Languages',
        BLOCKS_TITLE: 'Blocks',
        BLOCKS: {
          BREACH_SERVICE: 'Breach Service',
          BREACH_AGREEMENT: 'Breach Business Agreement',
          DOORMAN_COMPLAINT: 'Doorman complaint'
        },
        LANGUAGES: {
          EN: 'English',
          english: 'English'
        },
        DOCUMENT_ID: 'Document',
        PHONE: 'Phone',
        USERNAME: 'User Name'
      },
      VEHICLE_DETAIL: {
        ID: 'ID',
        BRAND: 'Brand',
        LICENSE_PLATE: 'Vehicle id',
        MODEL: 'Model',
        LINE: 'Line',
        BLOCKS_TITLE: 'Blocks',
        BLOCKS: {
          PICO_Y_PLACA: 'License plate ending restriction'
        },
        FEATURES_TITLE: 'Features',
        FEATURES: {
          AC: 'Air Conditioning',
          TRUNK: 'Trunk',
          ROOF_RACK: 'Roof Rack',
          PETS: 'Pets',
          BIKE_RACK: 'Bike Rack'
        }
      },
      STATE_CHANGES: {
        TIMESTAMP: 'Time',
        STATE: 'State',
        ONLINE: 'Online',
        OFFLINE: 'Offline'
      },
      SHIFT_FILTERS: {
        INIT_TIMESTAMP: 'Initial Date',
        END_TIMESTAMP: 'Final Date',
        VEHICLE_LICENSE_PLATE: 'Vehicle Id',
        DRIVER_NAME: 'Driver Name',
        DRIVER_DOCUMENT_ID: 'Driver Document Id',
        DRIVER_FULLNAME: 'Driver Name',
        LICENSE_PLATE: 'Vehicle Id',
        PAYMENT_TYPE: 'Payment Type',
        STATES: 'Estados',
        SHOW_CLOSED: 'Show Closed',
        FILTER_TITLE: 'Filters',
        ONLINE_STATES: {
          true: 'Online',
          false: 'Online',
          null: 'Online/Offline'
        },
        RESET_FILTER: 'Clean Filters'
      },
      SHIFT_STATES: {
        AVAILABLE: 'Available',
        NOT_AVAILABLE: 'Not Available',
        BUSY: 'Busy',
        BLOCKED: 'Blocked',
        CLOSED: 'Closed'
      },
      DETAILS: {
        GENERAL_INFO: 'General Info',
        TABS: {
          DRIVER_INFO: 'Driver Info',
          STATE_CHANGES: 'State Changes',
          VEHICLE_INFO: 'Vehicle Info'
        },
        CLIENT: 'Client',
        DRIVER: 'Driver',
        VEHICLE: 'Vehicle',
        DATE: 'Date',
        STATE: 'State',
        STATES: 'Service State',
        CLIENT_FULLNAME: 'Client Name',
        CLIENT_USERNAME: 'Client Username',
        CLIENT_TIP: 'Client Tip',
        CLIENT_TIP_TYPE: 'Tip Type',
        DRIVER_DOCUMENT_ID: 'Driver Document Id',
        DRIVER_FULLNAME: 'Driver Name',
        VEHICLE_LICENSE_PLATE: 'Vehicle Id',
        PAYMENT_TYPE: 'Payment Type',
        FARE: 'Fare',
        FARE_DISCOUNT: 'Fare Discount',
        SHIFT_PARAMS: 'Service Params',
        PICKED_UP: 'Pick up Place',
        DROP_OFF: 'Drop off Place',
        CITY: 'City',
        ZONE: 'Zone',
        NEIGHBORHOOD: 'Neighborhood',
        ADDRESSLINE1: 'Address 1',
        ADDRESSLINE2: 'Address 2',
        NOTES: 'Notes',
        FEATURES: {
          AC: 'Air Conditioning',
          TRUNK: 'Trunk',
          ROOF_RACK: 'Roof Rack',
          PETS: 'Pets',
          BIKE_RACK: 'Bike Rack'
        },
        TIP_TYPES: {
          'CASH': 'Cash',
          'VIRTUAL_WALLET': 'Virtual wallet'
        }
      }
    },
    ERRORS: {
      1: 'Internal server error',
      2: 'Permission denied',
      23020: 'Shift do not exist',
      23021: 'There is still a service in progress',
      23022: 'Shift already closed'
    }
  }
};
