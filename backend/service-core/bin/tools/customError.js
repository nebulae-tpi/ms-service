//Every single error code
// please use the prefix assigned to this micorservice
const INTERNAL_SERVER_ERROR_CODE = 00001;
const PERMISSION_DENIED = 00002;

/**
 * class to emcapsulute diferent errors.
 */
class CustomError extends Error {
  constructor(name, method, code = INTERNAL_SERVER_ERROR_CODE, message = '') {
    super(message);
    this.code = code;
    this.name = name;
    this.method = method;
  }

  getContent() {
    return {
      name: this.name,
      code: this.code,
      msg: this.message,
      method: this.method,
      // stack: this.stack
    }
  }
};

class DefaultError extends Error {
  constructor(anyError) {
    super(anyError.message)
    this.code = INTERNAL_SERVER_ERROR_CODE;
    this.name = anyError.name;
    this.msg = anyError.message;
    // this.stack = anyError.stack;
  }

  getContent() {
    return {
      code: this.code,
      name: this.name,
      msg: this.msg
    }
  }
}

module.exports = {
  CustomError,
  DefaultError,
  INTERNAL_SERVER_ERROR_CODE,
  PERMISSION_DENIED,


  ERROR_23010: new CustomError('StartShiftError', `StartShift`, 23010, 'No se puede iniciar el turno: el conductor ya tiene un turno abierto'),
  ERROR_23011: new CustomError('StartShiftError', `StartShift`, 23011, 'No se puede iniciar el turno: el vehiculo seleccionado tiene un turno abierto'),
  ERROR_23012: new CustomError('StartShiftError', `StartShift`, 23012, 'No se puede iniciar el turno: conductor actualmente inactivo.  Por favor comunicarse con el administrador del sistema'),
  ERROR_23013: new CustomError('StartShiftError', `StartShift`, 23013, 'No se puede iniciar el turno: vehiculo actualmente inactivo.  Por favor comunicarse con el administrador del sistema.'),
  ERROR_23014: new CustomError('StartShiftError', `StartShift`, 23014, 'No se puede iniciar el turno: el vehículo no está asignado al conductor'),
  ERROR_23015: new CustomError('StartShiftError', `StartShift`, 23015, 'No se puede iniciar el turno: vehículo no registrado.  Por favor comunicarse con el administrador del sistema'),
  ERROR_23016: new CustomError('StartShiftError', `StartShift`, 23016, 'No se puede iniciar el turno: conductor no registrado.  Por favor comunicarse con el administrador del sistema'),
  ERROR_23017: new CustomError('StartShiftError', `StopShift`, 23017, 'No se puede iniciar el turno: La versión del APP no es valida'),

  ERROR_23020: new CustomError('StopShiftError', `StopShift`, 23020, 'No se puede detener el turno: el conductor no tiene un turno abierto'),
  ERROR_23021: new CustomError('StopShiftError', `StopShift`, 23021, 'No se puede detener el turno: todavía hay un servicio en curso'),

  ERROR_23025: new CustomError('SetShiftStateError', `SetShiftState`, 23025, 'No se puede cambiar el estado del turno: el estado actual no es modificable por el conductor'),
  ERROR_23026: new CustomError('SetShiftStateError', `SetShiftState`, 23026, 'No se puede cambiar el estado del turno: el conductor no tiene un turno abierto'),
  ERROR_23027: new CustomError('SetShiftStateError', `SetShiftState`, 23027, 'No se puede cambiar el estado del turno: estado ingresado no válido'),
  ERROR_23028: new CustomError('SetShiftStateError', `SetShiftState`, 23028, 'No se puede detener el turno: todavía hay un servicio en curso'),

  ERROR_23100: new CustomError('ServicesOfferError', `AcceptServiceOffer`, 23100, 'Datos insuficientes: servicio y ubicación necesarios.'),
  ERROR_23101: new CustomError('ServicesOfferError', `AcceptServiceOffer`, 23101, 'Turno no valido: su estado de turno no es valido para esta operacion'),
  ERROR_23102: new CustomError('ServicesOfferError', `AcceptServiceOffer`, 23102, 'Asignación de servicio denegada: Saldo insuficiente'),
  ERROR_23103: new CustomError('ServicesOfferError', `AcceptServiceOffer`, 23103, 'Asignación de servicio denegada: Turno bloqueado'),
  ERROR_23104: new CustomError('ServicesOfferError', `AcceptServiceOffer`, 23104, 'Asignación de servicio denegada: Servicio ya asignado'),
  ERROR_23105: new CustomError('ServicesOfferError', `AcceptServiceOffer`, 23105, 'Asignación de servicio denegada'),


  ERROR_23200: new CustomError('RequestServicesError', `RequestServices`, 23200, 'Datos insuficientes. Cliente, punto de recogida y el tipo de pago son obligatorios'),
  ERROR_23201: new CustomError('RequestServicesError', `RequestServices`, 23201, 'nombre del cliente inválido'),
  ERROR_23202: new CustomError('RequestServicesError', `RequestServices`, 23202, 'Tipo de propina para el cliente/satelite invalida '),
  ERROR_23203: new CustomError('RequestServicesError', `RequestServices`, 23203, 'Valor de propina para el incliente no valido'),
  ERROR_23204: new CustomError('RequestServicesError', `RequestServices`, 23204, 'ubicación de recogida indefinida'),
  ERROR_23205: new CustomError('RequestServicesError', `RequestServices`, 23205, 'dirección de recogida no especificada'),
  ERROR_23206: new CustomError('RequestServicesError', `RequestServices`, 23206, 'tipo de pago inválido'),
  ERROR_23207: new CustomError('RequestServicesError', `RequestServices`, 23207, 'Funciones solicitadas inválidas'),
  ERROR_23208: new CustomError('RequestServicesError', `RequestServices`, 23208, 'ubicación de destino indefinida'),
  ERROR_23209: new CustomError('RequestServicesError', `RequestServices`, 23209, 'valor de descuento de tarifa no válido'),
  ERROR_23210: new CustomError('RequestServicesError', `RequestServices`, 23210, 'valor de tarifa no válido'),
  ERROR_23211: new CustomError('RequestServicesError', `RequestServices`, 23211, 'valor de propina no válido'),
  ERROR_23212: new CustomError('RequestServicesError', `RequestServices`, 23212, 'El cliente ya tiene una solicitud de servicio pendiente.'),

  ERROR_23220: new CustomError('ModifyServiceStateError', `ModifyServicesState`, 23220, 'Datos insuficientes. ID, tipo de autor y razón son obligatorios'),
  ERROR_23221: new CustomError('ModifyServiceStateError', `ModifyServicesState`, 23221, 'Tipo de Autor inválido'),
  ERROR_23222: new CustomError('ModifyServiceStateError', `ModifyServicesState`, 23222, 'tipo de razón inválida'),
  ERROR_23223: new CustomError('ModifyServiceStateError', `ModifyServicesState`, 23223, 'Servicio no encontrado'),
  ERROR_23224: new CustomError('ModifyServiceStateError', `ModifyServicesState`, 23224, 'Servicio se encuentra cerrado/terminado, no se puede modificar'),
  ERROR_23225: new CustomError('ModifyServiceStateError', `ModifyServicesState`, 23225, 'Datos insuficientes: se debe ingresar el id del servicio y un identificación de turno o un par conductor-vehículo'),
  ERROR_23226: new CustomError('ModifyServiceStateError', `ModifyServicesState`, 23226, 'placa invalida'),
  ERROR_23227: new CustomError('ModifyServiceStateError', `ModifyServicesState`, 23227, 'nombre de conductor invalido'),
  ERROR_23228: new CustomError('ModifyServiceStateError', `ModifyServicesState`, 23228, 'turno no encontrado'),
  ERROR_23229: new CustomError('ModifyServiceStateError', `ModifyServicesState`, 23229, 'turno se encuentra cerrado'),
  ERROR_23230: new CustomError('ModifyServiceStateError', `AssignService`, 23230, 'No se puede asignar el servicio: el vehículo ya tiene un servicio activo'),



} 