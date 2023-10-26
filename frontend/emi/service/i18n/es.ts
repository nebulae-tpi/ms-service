export const locale = {
  lang: 'es',
  data: {
    'SERVICE': {
      HEADER_TITLE: 'SERVICIOS',
      DETAIL_HEADER_NAME: 'Detalle del servicio',
      SERVICE_TABLE_LIST:{
        'TIMESTAMP': 'Fecha',
        'CLIENT_NAME': 'Nombre Cliente',
        'DRIVER_NAME': 'Nombre Conductor',
        'LICENSE_PLATE': 'Id Vehículo',
        'PAYMENT_TYPE': 'Tipo Pago',
        'STATE': 'Estado',
      },
      SERVICE_FILTERS:{
        CHANNEL: "Canal",
        CHANNEL_OPERATOR: 'Operador',
        CHANNEL_CLIENT: 'Satelite',
        CHANNEL_APP_CLIENT: 'App. Cliente',
        CHANNEL_CHAT_SATELITE: 'Chat Bot',
        'INIT_TIMESTAMP': 'Fecha Inicial',
        'END_TIMESTAMP': 'Fecha Final',
        'CLIENT_USERNAME': 'Nombre de Usuario Cliente',
        'CLIENT_FULLNAME': 'Nombre Cliente',
        'DRIVER_NAME': 'Nombre Conductor',
        'DRIVER_DOCUMENT_ID': 'Documento ID Conductor',
        'DRIVER_FULLNAME': 'Nombre Conductor',
        'LICENSE_PLATE': 'Id Vehículo',
        'PAYMENT_TYPE': 'Tipo Pago',
        'STATES': 'Estados',
        'SHOW_CLOSED': 'Mostrar Cerrados',
        'FILTER_TITLE': 'Filtros',
        'RESET_FILTER': 'Limpiar Filtros'
      },
      SERVICE_STATES: {
        'REQUEST': 'Solicitado',
        'REQUESTED': 'Solicitado',
        'ASSIGNED': 'Asignado',        
        'ARRIVED': 'Ha llegado',
        'ON_BOARD': 'A bordo',
        'DONE': 'Finalizado',
        'CANCELLED_DRIVER': 'Cancelado por Conductor',
        'CANCELLED_CLIENT': 'Cancelado por Cliente',
        'CANCELLED_OPERATOR': 'Cancelado por Operador',
        'CANCELLED_SYSTEM': 'Cancelado por Sistema'
      },
      SERVICE_PAYMENT_TYPE: {
        'CASH': 'Efectivo',
        'CREDIT_CARD': 'Credit card'
      },
      DETAILS: {
        'GENERAL_INFO': 'Información General',
        TABS: {
          GENERAL_INFO: 'Información General',
          STATE_CHANGES: 'Cambios de Estado',
          ROUTE_TRACKING: 'Seguimiento de ruta'
        },
        'CLIENT': 'Cliente',
        'DRIVER': 'Conductor',
        'VEHICLE': 'Vehículo',
        'DATE': 'Fecha',
        'STATE': 'Estado',
        'CLIENT_PHONE_NUMBER': "Número de Teléfono",
        'STATES': 'Estados del Servicio',
        'CLIENT_FULLNAME': 'Nombre Cliente',
        'CLIENT_USERNAME': 'Nombre de Usuario',
        'CLIENT_TIP': 'Valor Acuerdo Empresarial',
        'CLIENT_TIP_TYPE': 'Tipo de Acuerdo Empresarial',
        'DRIVER_DOCUMENT_ID': 'Documento Identificación Conductor',
        'DRIVER_FULLNAME': 'Nombre Conductor',
        'VEHICLE_LICENSE_PLATE': 'Licencia',
        'PAYMENT_TYPE': 'Tipo Pago',
        'FARE': 'Tarifa',
        'FARE_DISCOUNT': 'Descuento',
        'SERVICE_PARAMS': 'Parámetros del Servicio',
        'PICKED_UP':  'Lugar de Recogida',
        'DROP_OFF':  'Lugar de Destino',
        'CITY':  'Ciudad',
        'ZONE':  'Zona',
        'NEIGHBORHOOD':  'Barrio',
        'ADDRESSLINE1':  'Dirección 1',
        'ADDRESSLINE2':  'Dirección 2',
        'NOTES':  'Notas',
        'FEATURES': {
          'AC': 'Aire Acondicionado',
          'TRUNK': 'Baúl',
          'ROOF_RACK': 'Parrilla de Techo',
          'PETS': 'Permite Mascotas',
          'BIKE_RACK': 'Portabicicletas'
        },
        'TIP_TYPES': {
          'CASH': 'Efectivo',
          'VIRTUAL_WALLET': 'Billetera Virtual'
        }
      }
    },
    ERRORS: {
      1: 'Error interno de servidor',
      2: 'Permiso denegado.',
    }
  }
};
