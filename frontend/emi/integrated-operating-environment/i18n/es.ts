export const locale = {
  lang: 'es',
  data: {
    WORKSTATION: {
      BUSINESS_UNIT_REQUIRED: 'Unidad De Negocio Requerida *'
    },
    TOOLBAR: {
      REFRESH: 'REFRESCAR',
      SEARCH_TEXT: 'Buscar por placa/id',
      SEARCH: 'Buscar',
      SEARCH_INVALID_VALUE: 'Se debe ingresar un valor para realizar la busqueda',
      SEARCH_NOT_FOUND: 'No se ha encontrado un turno con la información ingresada',
      REQUEST: 'SOLICITAR',
      ACTIONS_LBL: 'ACCIONES',
      ACTIONS: {
        REQUEST: 'Solicitar',
        ASSIGN: 'Asignar',
        REFRESH: 'Refrescar',
        CANCEL: 'Cancelar',
      },
      VIEW: 'Ver',
      STATS: 'Estadísticas',
      VIEWS: {
        ALL_OPERATION: 'Toda la Operación'
      },
      FILTERS_LBL : 'Filtros',
      FILTERS: {
        REQUESTED: 'Solicitado',
        ASSIGNED: 'Asignado',
        ON_BOARD: 'A Bordo',
        ARRIVED: 'Ha llegado',
        DONE: 'Completado',
        CLOSED: 'Cerrado'
      },
      CHANNELS_LBL: 'Canales',
      SEARCH_BAR: 'Buscar por Placa/Cliente',
      CHANNELS: {
        OPERATORS: 'Operadores',
        CLIENTS: 'Clientes',
        CHAT_SATELITE: 'Chat Satelite',
        IVR: 'IVR',
        SATELLITES: 'Satélites',
        WHATSAPP: 'Whatsapp',
        FACEBOOK_MSG: 'Facebook Messenger'
      }
    },
    TABLE: {
      HEADERS: {
        STATE: 'Estado',
        CREATION_TIMESTAMP: 'Hora',
        CLIENT_NAME: 'Cliente',
        DRIVER_DOC_ID: 'Conductor',
        PICKUP_ADDR: 'Dir. Recogida',
        NEIGHBORHOOD: 'Barrio',
        VEHICLE_PLATE: 'Id Vehículo',
        ETA_TIME: 'ETA',
        STATE_TIME: 'T. Trans',
        DISTANCE: 'Dist'
      }
    },
    SERVICES: {
      DUPLICATE_SERVICE_MSG: 'Se ha duplicado exitosamente el servicio',
      REQUEST_SERVICE_SUCCESS: 'Servicio Solicitado Exitosamente',
      ERROR_OPERATION: 'Error de operación',
      STATES: {
        REQUESTED: 'Solicitado',
        ASSIGNED: 'Asignado',
        ON_BOARD: 'A Bordo',
        ARRIVED: 'Ha llegado',
        DONE: 'Completado',
        CLOSED: 'Cerrado',
        CANCELLED_OPERATOR: 'Can. Oper',
        CANCELLED_DRIVER: 'Can. Cond',
        CANCELLED_CLIENT: 'Can. Clien',
        CANCELLED_SYSTEM: 'Can. Sys',
      },
      REQUEST_DIALOG: {
        TITLE: 'Solicitud de Servicio',
        SATELLITE_CLIENT_PLACEHOLDER: 'Cliente',
        REQUEST_BTN_LBL: 'Solicitar',
        CLIENT_LIST_TITLE: 'Porteros',
        PRECISE_LOCATION: 'Ubicación Precisa',
        IOE_CLIENT_GOOGLE_ADRESS: 'Ubicación',
        IOE_CLIENT_ADDRESS: 'Dirección',
        IOE_CLIENT_LOCATION_REF: 'Lugar Referencia',
        IOE_CLIENT_NAME: 'Nombre de Cliente',
        IOE_CLIENT_TIP: 'Propina',
        IOE_ADDRESS: 'Dirección',
        IOE_NEIGHBORHOOD: 'Barrio'
      }
    },
    ERRORS: {
      1: 'Error interno del servidor',
      2: 'Permiso denegado',
      3: 'Unida de Negocio Requerida, por favor Selecciona una',
      4: 'El Servicio Ya Está Cancelado',
      23200: 'Datos insuficientes. Cliente, punto de recogida y pago son obligatorios',
      23201: 'Nombre del cliente inválido',
      23202: 'Tipo de propina para cliente inválida (Efectivo, Billetera virtual)',
      23203: 'Valor de propina para el cliente no válida',
      23204: 'Ubicación de recogida indefinida',
      23205: 'Dirección de recogida no especificada',
      23206: 'Tipo de pago inválido (Efectivo, tarjeta de crédito)',
      23207: 'Funciones solicitadas inválidas (Aire acondicionado, Baúl, Parlla de techo, Mascotas, portabicicletas)',
      23208: 'Ubicación de destino indefinida',
      23209: 'Valor de descuento de tarifa no válido',
      23210: 'Valor de tarifa no válido',
      23211: 'valor de propina no válido',
      23220: 'Datos insuficientes. ID, tipo de autor y razón son obligatorios',
      23221: 'Tipo de autor inválido',
      23222: 'Ttipo de razón inválida',
      23223: 'Servicio no encontrado',
      23224: 'Servicio se encuentra cerrado/terminado, no se puede modificar',
      23225: 'Datos insuficientes: se debe ingresar el id del servicio y un identificación de turno o un par conductor-vehículo',
      23226: 'Id Vehículo inválido',
      23227: 'Nombre de conductor inválido',
      23228: 'Turno no encontrado',
      23229: 'Turno se encuentra cerrado',
    },
    GODSEYE: {
      MAP:{
        SERVICE:{
          VIRTUAL_WALLET: 'Billetera',
          CASH: 'Efectivo'
        },
        SHIFT : {
          WALLET: 'Billetera',
          BALANCE: 'Saldo',
        }
      },
      STATS: {
        SERVICE: {
          REQUESTED: 'Solicitaod',
          ASSIGNED: 'Asignado',
          ARRIVED: 'Ha llegado',
          ON_BOARD: 'A bordo',
          DONE: 'Terminado',
          CANCELLED_CLIENT: 'C. Cliente',
          CANCELLED_OPERATOR: 'C. Operador',
          CANCELLED_DRIVER: 'C. Conductor',
          CANCELLED_SYSTEM: 'C. Sistema'
        },
        SHIFT: {
          AVAILABLE: 'Disponible',
          NOT_AVAILABLE: 'No Disponible',
          BUSY: 'Ocupado',
          BLOCKED: 'Bloqueado',
          OFFLINE: 'Fuera de linea'
        },
        SERVICES: 'Servicios',
        SHIFTS: 'Turnos',
      }
    }
  }
};
