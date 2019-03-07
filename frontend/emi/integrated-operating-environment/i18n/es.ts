export const locale = {
  lang: 'es',
  data: {
    WORKSTATION: {
      BUSINESS_UNIT_REQUIRED: 'Unidad De Negocio Requerida *'
    },
    TOOLBAR: {
      REFRESH: 'REFRESCAR',
      REQUEST: 'SOLICITAR',
      ACTIONS_LBL: 'ACCIONES',
      ACTIONS: {
        REQUEST: 'Solicitar',
        ASSIGN: 'Asignar',
        REFRESH: 'Refrescar',
        CANCEL: 'Cancelar',
      },
      VIEW: 'Ver',
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
      CHANNELS: {
        OPERATORS: 'Operadores',
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
        PICKUP_ADDR: 'Dir. Recogida',
        NEIGHBORHOOD: 'Barrio',
        VEHICLE_PLATE: 'Placa',
        ETA_TIME: 'ETA',
        STATE_TIME: 'T. Trans',
        DISTANCE: 'Dist'
      }
    },
    SERVICES: {
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
        REQUEST_BTN_LBL: 'Solicitar'
      }
    },
    ERRORS: {
      1: 'Error interno del servidor',
      2: 'Permiso denegado',
      3: 'Unida de Negocio Requerida, por favor Selecciona una',
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
      23226: 'Placa inválida',
      23227: 'Nombre de conductor inválido',
      23228: 'Turno no encontrado',
      23229: 'Turno se encuentra cerrado',
    }
  }
};
