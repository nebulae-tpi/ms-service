export const locale = {
  lang: 'es',
  data: {
    'SERVICE': {
      HEADER_TITLE: 'SERVICIOS',
      DETAIL_HEADER_NAME: 'Detalle del servicio',
      SERVICE_TABLE_LIST:{
        'TIMESTAMP': 'Fecha',
        'CLIENT_NAME': 'Nombre cliente',
        'DRIVER_NAME': 'Nombre conductor',
        'LICENSE_PLATE': 'Placa vehículo',
        'PAYMENT_TYPE': 'Tipo pago',
        'STATE': 'Estado',
      },
      SERVICE_FILTERS:{
        'INIT_TIMESTAMP': 'Fecha inicial',
        'END_TIMESTAMP': 'Fecha final',
        'CLIENT_USERNAME': 'Nombre de usuario cliente',
        'CLIENT_FULLNAME': 'Nombre cliente',
        'DRIVER_NAME': 'Nombre conductor',
        'DRIVER_DOCUMENT_ID': 'Documento ID conductor',
        'DRIVER_FULLNAME': 'Nombre conductor',
        'LICENSE_PLATE': 'Placa vehículo',
        'PAYMENT_TYPE': 'Tipo pago',
        'STATE': 'Estado',
        'FILTER_TITLE': 'Filtros',
        'RESET_FILTER': 'Limpiar filtros'
      },
      SERVICE_STATES: {
        'REQUESTED': 'Solicitado',
        'ASSIGNED': 'Asignado',        
        'ARRIVED': 'LLegó',
        'ON_BOARD': 'A bordo',
        'DONE': 'Finalizado',
        'CANCELLED_DRIVER': 'Cancelado por conductor',
        'CANCELLED_CLIENT': 'Cancelado por cliente',
      },
      SERVICE_PAYMENT_TYPE: {
        'CASH': 'Efectivo',
        'CREDIT_CARD': 'Credit card'
      },
      DETAILS: {
        'GENERAL_INFO': 'Información general',
        TABS: {
          GENERAL_INFO: 'Información general',
          STATE_CHANGES: 'Cambios de estado',
          ROUTE_TRACKING: 'Seguimiento de ruta'
        },
        'CLIENT': 'Cliente',
        'DRIVER': 'Conductor',
        'VEHICLE': 'Vehículo',
        'DATE': 'Fecha',
        'STATE': 'Estado',
        'STATES': 'Estados del servicio',
        'CLIENT_FULLNAME': 'Nombre cliente',
        'CLIENT_USERNAME': 'Nombre de usuario',
        'CLIENT_TIP': 'Propina cliente',
        'CLIENT_TIP_TYPE': 'Tipo propina',
        'DRIVER_DOCUMENT_ID': 'Documento identificación conductor',
        'DRIVER_FULLNAME': 'Nombre conductor',
        'VEHICLE_LICENSE_PLATE': 'Licencia',
        'PAYMENT_TYPE': 'Tipo pago',
        'FARE': 'Tarifa',
        'FARE_DISCOUNT': 'Descuento',
        'SERVICE_PARAMS': 'Parámetros del servicio',
        'PICKED_UP':  'Lugar de recogida',
        'DROP_OFF':  'Lugar de destino',
        'CITY':  'Ciudad',
        'ZONE':  'Zona',
        'NEIGHBORHOOD':  'Barrio',
        'ADDRESSLINE1':  'Dirección 1',
        'ADDRESSLINE2':  'Dirección 2',
        'NOTES':  'Notas',
        'FEATURES': {
          'AC': 'Aire acondicionado',
        },
        'TIP_TYPES': {
          'ON_SITE': 'Propina en sitio'
        }
      }
    },
    ERRORS: {
      1: 'Error interno de servidor',
      2: 'Permiso denegado.',
    }
  }
};
