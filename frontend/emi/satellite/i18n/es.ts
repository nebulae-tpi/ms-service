export const locale = {
  lang: 'es',
  data: {
    'SATELLITE': {
      'CLOSE': 'Cerrar',
      'REQUEST_VEHICLE_TITLE': 'Solicitud de servicio',
      'OTHERS': 'Otros',
      'REQUEST_TAXI': 'Solicitar taxi',
      'VEHICLES_NUMBER': 'Número vehículos',
      'REFERENCE': 'Referencia',
      'PAYMENT_TYPE': 'Tipo pago',
      'TIP': 'Propina conductor',
      'FEATURES': 'Características',
      'NOTES': 'Notas',
      'SERVICE': 'Servicio',
      'FEATURES_LIST': {
        'AC': 'Aire acondicionado',
        'TRUNK': 'Baúl',
        'ROOF_RACK': 'Parrilla de techo',
        'PETS': 'Permite mascotas',
        'BIKE_RACK': 'Portabicicletas'
      },
      'SERVICES': {
        'ERROR_OPERATION': 'Error realizando operación, intente nuevamente.',
        'REQUEST_SERVICE_SUCCESS': 'Solicitud de servicio enviada exitosamente', 
        'CANCEL_SERVICE_SUCCESS': 'Cancelación de servicio enviada exitosamente', 
        'NOT_SERVICES': 'No hay servicios disponibles',
        'CANCEL_REQUEST': 'Cancelar solicitud',
        'CANCEL_SERVICE': 'Cancelar servicio',
        'SEE_DETAIL': 'Ver detalle',
        'MIN_MAX_TIP': 'La propina es un valor opcional pero debe estar entre $500 y $100.000.',
        'LICENSE_PLATE': 'Placa',
        'DRIVER': 'Conductor',
        'SERVICE_PARAMS': 'Parámetros',
        'STATE': 'Estado',
        'REFERENCE': 'Referencia',
        'CANCEL_OPTIONS': {
          'IT_TAKES_TOO_MUCH_TIME': 'Demasiado tiempo', 
          'DOESNT_REQUIRED': 'Ya no se requiere',
          'OTHER': 'Otro',
          'PLATE_DOESNT_MATCH': 'Placa no coincide',
          'IS_NOT_THE_DRIVER': 'No es el conductor'
        },
        'PAYMENT_TYPES': {
          'CASH': 'Efectivo',
          'CREDIT_CARD': 'Tarjeta de crédito'
        },
        'FEATURES': {
          'AC': 'Aire acondicionado',
          'TRUNK': 'Baúl',
          'ROOF_RACK': 'Parrilla de techo',
          'PETS': 'Permite mascotas',
          'BIKE_RACK': 'Portabicicletas'
        },
        'STATES': {
          'REQUEST': 'Solicitado',
          'REQUESTED': 'Solicitado',
          'ASSIGNED': 'Asignado',        
          'ARRIVED': 'Ha llegado',
          'ON_BOARD': 'A bordo',
          'DONE': 'Finalizado',
          'CANCELLED_DRIVER': 'Cancelado por conductor',
          'CANCELLED_CLIENT': 'Cancelado por cliente',
        }
      }
    },
    ERRORS: {
      1: 'Error interno de servidor',
      2: 'Permiso denegado.',
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
    }
  }
};
