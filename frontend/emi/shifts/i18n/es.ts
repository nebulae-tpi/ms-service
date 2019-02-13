export const locale = {
  lang: 'es',
  data: {
    SHIFT: {
      HEADER_TITLE: 'TURNOS',
      DETAIL_HEADER_NAME: 'Detalle del Turno',
      SHIFT_TABLE_LIST: {
        TIMESTAMP: 'Fecha',
        CLIENT_NAME: 'Nombre Cliente',
        DRIVER_NAME: 'Nombre Conductor',
        LICENSE_PLATE: 'Placa Vehículo',
        DRIVER_DOCUMENT: 'Cédula de Conductor',
        VEHICLE_MODEL: 'Modelo',
        LAST_COMMUNICATION: 'Última Conexión Establecida'
      },
      DRIVER_DETAIL: {
        ID: 'ID',
        FULL_NAME: 'Nombre',
        DOC_TYPE: 'Tipo de Documento',
        DOC_TYPES: {
          CC: 'Cédula de Ciudadanía'
        },
        LANGUAGES_TITLE: 'Idiomas',
        BLOCKS_TITLE: 'Bloqueos',
        LANGUAGES: {
          EN: 'Inglés'
        },
        DOCUMENT_ID: 'Documento',
        PHONE: 'Teléfono',
        USERNAME: 'Nombre de Usuario'
      },
      VEHICLE_DETAIL: {
        ID: 'ID',
        BRAND: 'Marca',
        MODEL: 'Modelo',
        LINE: 'Línea',
        BLOCKS_TITLE: 'Bloqueos',
        FEATURES_TITLE: 'Características',
        FEATURES: {
          AC: 'Aire Acondicionado',
          TRUNK: 'Baúl',
          ROOF_RACK: 'Parrilla de Techo',
          PETS: 'Permite Mascotas',
          BIKE_RACK: 'Portabicicletas'
        }
      },
      STATE_CHANGES: {
        TIMESTAMP: 'Hora',
        STATE: 'Estado',
        ONLINE: 'En línea',
        OFFLINE: 'Desconectado'
      },
      SHIFT_FILTERS: {
        INIT_TIMESTAMP: 'Fecha Inicial',
        END_TIMESTAMP: 'Fecha Final',
        VEHICLE_LICENSE_PLATE: 'Placa de Vehículo',
        DRIVER_NAME: 'Nombre Conductor',
        DRIVER_DOCUMENT_ID: 'Documento ID Conductor',
        DRIVER_FULLNAME: 'Nombre Conductor',
        LICENSE_PLATE: 'Placa Vehículo',
        PAYMENT_TYPE: 'Tipo Pago',
        STATES: 'Estados',
        SHOW_CLOSED: 'Mostrar Cerrados',
        FILTER_TITLE: 'Filtros',
        RESET_FILTER: 'Limpiar Filtros'
      },
      SHIFT_STATES: {
        AVAILABLE: 'Disponible',
        NOT_AVAILABLE: 'No Disponible',
        BUSY: 'Ocupado',
        BLOCKED: 'Bloqueado',
        CLOSED: 'Cerrado'
      },
      DETAILS: {
        GENERAL_INFO: 'Información General',
        TABS: {
          DRIVER_INFO: 'Información de Conductor',
          STATE_CHANGES: 'Cambios de Estado',
          VEHICLE_INFO: 'Información de Vehículo'
        },
        CLIENT: 'Cliente',
        DRIVER: 'Conductor',
        VEHICLE: 'Vehículo',
        DATE: 'Fecha',
        STATE: 'Estado',
        STATES: 'Estados del Servicio',
        CLIENT_FULLNAME: 'Nombre Cliente',
        CLIENT_USERNAME: 'Nombre de Usuario',
        CLIENT_TIP: 'Propina Cliente',
        CLIENT_TIP_TYPE: 'Tipo Propina',
        DRIVER_DOCUMENT_ID: 'Documento Identificación Conductor',
        DRIVER_FULLNAME: 'Nombre Conductor',
        VEHICLE_LICENSE_PLATE: 'Licencia',
        PAYMENT_TYPE: 'Tipo Pago',
        FARE: 'Tarifa',
        FARE_DISCOUNT: 'Descuento',
        SHIFT_PARAMS: 'Parámetros del Servicio',
        PICKED_UP: 'Lugar de Recogida',
        DROP_OFF: 'Lugar de Destino',
        CITY: 'Ciudad',
        ZONE: 'Zona',
        NEIGHBORHOOD: 'Barrio',
        ADDRESSLINE1: 'Dirección 1',
        ADDRESSLINE2: 'Dirección 2',
        NOTES: 'Notas',
        FEATURES: {
          AC: 'Aire Acondicionado',
          TRUNK: 'Baúl',
          ROOF_RACK: 'Parrilla de Techo',
          PETS: 'Permite Mascotas',
          BIKE_RACK: 'Portabicicletas'
        },
        TIP_TYPES: {
          'CASH': 'Efectivo',
          'VIRTUAL_WALLET': 'Billetera Virtual'
        }
      }
    },
    ERRORS: {
      1: 'Error interno de servidor',
      2: 'Permiso denegado.'
    }
  }
};
