export const locale = {
  lang: 'en',
  data: {
    WORKSTATION: {
      BUSINESS_UNIT_REQUIRED: 'Business Unit Required'
    },
    TOOLBAR: {
      REFRESH: 'REFRESH',
      SEARCH_TEXT: 'Search by plate/id',
      SEARCH: 'Search',
      SEARCH_INVALID_VALUE: 'A value must be entered to perform the search',
      SEARCH_NOT_FOUND: 'A shift has not been found with the information entered',
      REQUEST: 'REQUEST',
      ACTIONS_LBL: 'ACTIONS',
      ACTIONS: {
        REQUEST: 'Request',
        ASSIGN: 'Assign',
        REFRESH: 'Refresh',
        CANCEL: 'Cancel',
      },
      VIEW: 'View',
      STATS: 'Stats',
      VIEWS: {
        ALL_OPERATION: 'All Operation'
      },
      FILTERS_LBL: 'Filters',
      FILTERS: {
        REQUESTED: 'Requested',
        ASSIGNED: 'Assigned',
        ON_BOARD: 'On Board',
        ARRIVED: 'Arrived',
        DONE: 'Done',
        CLOSED: 'Closed'
      },
      CHANNELS_LBL: 'Channels',
      SEARCH_BAR: 'Search by Plate/Client',
      CHANNELS: {
        OPERATORS: 'Operators',
        CHAT_SATELITE: 'Chat Satellite',
        CLIENTS: 'Clients',
        IVR: 'IVR',
        SATELLITES: 'Satellites',
        WHATSAPP: 'Whatsapp',
        FACEBOOK_MSG: 'Facebook Messenger'
      }
    },
    TABLE: {
      HEADERS: {
        STATE: 'State',
        CREATION_TIMESTAMP: 'Time',
        CLIENT_NAME: 'Cliet',
        DRIVER_DOC_ID: 'Driver',
        PICKUP_ADDR: 'Pickup Addr',
        NEIGHBORHOOD: 'neighborhood',
        VEHICLE_PLATE: 'Vehicle',
        ETA_TIME: 'ETA',
        STATE_TIME: 't. elap',
        DISTANCE: 'Dist'
      }
    },
    SERVICES: {
      DUPLICATE_SERVICE_MSG: 'The service has been duplicated succesfully',
      REQUEST_SERVICE_SUCCESS: 'Successful Request',
      ERROR_OPERATION: 'Error operation',
      STATES: {
        REQUESTED: 'Requested',
        ASSIGNED: 'Assigned',
        ON_BOARD: 'On Board',
        ARRIVED: 'Arrived',
        DONE: 'Done',
        CLOSED: 'Closed',
        CANCELLED_OPERATOR: 'Can. Oper',
        CANCELLED_DRIVER: 'Can. Driver',
        CANCELLED_CLIENT: 'Can. Client',
        CANCELLED_SYSTEM: 'Can. Sys',
      },
      REQUEST_DIALOG: {
        TITLE: 'Request a Service',
        SATELLITE_CLIENT_PLACEHOLDER: 'Client',
        REQUEST_BTN_LBL: 'Request',
        CLIENT_LIST_TITLE: 'Doormen',
        PRECISE_LOCATION: 'Precise Location',
        IOE_CLIENT_GOOGLE_ADRESS: 'Location',
        IOE_CLIENT_ADDRESS: 'Adress',
        IOE_CLIENT_LOCATION_REF: 'Location Reference',
        IOE_CLIENT_NAME: 'Client Name',
        IOE_CLIENT_TIP: 'Client Tip',
        IOE_ADDRESS: 'Address',
        IOE_NEIGHBORHOOD: 'Neighborhood'
      }
    },
    ERRORS: {
      1: 'Internal server error',
      2: 'Permission denied',
      3: 'Business Unit Required, Please Select One',
      4: 'Service Already Cancelled',
      23200: 'Insufficient data. Client, collection point and payment are required',
      23201: 'Invalid customer name',
      23202: 'Tip type for invalid customer (Cash, Virtual wallet)',
      23203: 'Tip value for invalid customer',
      23204: 'Location of undefined collection',
      23205: 'Unspecified collection address',
      23206: 'Invalid payment type (Cash, credit card)',
      23207: 'Invalid requested functions (Air conditioning, trunk, roof identifier, pets, bike racks)',
      23208: 'Destination location undefined',
      23209: 'Invalid rate discount value',
      23210: 'Invalid fare value',
      23211: 'invalid tip value',
      23220: 'Insufficient data. ID, author type and reason are required ',
      23221: 'Invalid author type',
      23222: 'Type of invalid reason',
      23223: 'Service not found',
      23224: 'Service is closed / terminated, can not be modified',
      23225: 'Insufficient data: you must enter the service id and a shift identification or a driver-vehicle pair',
      23226: 'Invalid vehicle id',
      23227: 'Invalid driver name',
      23228: 'Turn not found',
      23229: 'Shift is closed',
    },
    GODSEYE: {
      MAP:{
        SERVICE:{
          VIRTUAL_WALLET: 'Wallet',
          CASH: 'Cash'
        },
        SHIFT : {
          WALLET: 'Wallet',
          BALANCE: 'Balance',
        }
      },
      STATS: {
        SERVICE: {
          REQUESTED: 'Requested',
          ASSIGNED: 'Assigned',
          ARRIVED: 'Arrived',
          ON_BOARD: 'On Board',
          DONE: 'Done',
          CANCELLED_CLIENT: 'C. Client',
          CANCELLED_OPERATOR: 'C. Operator',
          CANCELLED_DRIVER: 'C. Driver',
          CANCELLED_SYSTEM: 'C. System'
        },
        SHIFT: {
          AVAILABLE: 'Available',
          NOT_AVAILABLE: 'Not Available',
          BUSY: 'Busy',
          BLOCKED: 'Blocked',
          OFFLINE: 'Offline'
        },
        SERVICES: 'Services',
        SHIFTS: 'Shifts',
      }
    }
  }
};
