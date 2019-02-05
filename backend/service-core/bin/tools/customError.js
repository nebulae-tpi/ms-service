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


  ERROR_23010: new CustomError('StartShiftError', `StartShift `, 23010, 'No se puede iniciar el turno: el conductor ya tiene un turno abierto'),
  ERROR_23011: new CustomError('StartShiftError', `StartShift `, 23011, 'No se puede iniciar el turno: el vehiculo seleccionado tiene un turno abierto'),
  ERROR_23012: new CustomError('StartShiftError', `StartShift `, 23012, 'No se puede iniciar el turno: conductor actualmente inactivo.  Por favor comunicarse con el administrador del sistema'),
  ERROR_23014: new CustomError('StartShiftError', `StartShift `, 23014, 'No se puede iniciar el turno: el vehículo no está asignado al conductor'),
  ERROR_23015: new CustomError('StartShiftError', `StartShift `, 23015, 'No se puede iniciar el turno: vehículo no registrado.  Por favor comunicarse con el administrador del sistema'),
  ERROR_23016: new CustomError('StartShiftError', `StartShift `, 23016, 'No se puede iniciar el turno: conductor no registrado.  Por favor comunicarse con el administrador del sistema'),
  
  ERROR_23020: new CustomError('StopShiftError', `StopShift `, 23020, 'No se puede detener el turno: el conductor no tiene un turno abierto'),
  ERROR_23021: new CustomError('StopShiftError', `StopShift `, 23021, 'No se puede detener el turno: todavía hay un servicio en curso'),

  ERROR_23025: new CustomError('SetShiftStateError', `SetShiftState `, 23025, 'No se puede cambiar el estado del turno: el estado actual no es modificable por el conductor'),
  ERROR_23026: new CustomError('SetShiftStateError', `SetShiftState `, 23026, 'No se puede cambiar el estado del turno: el conductor no tiene un turno abierto'),
  ERROR_23027: new CustomError('SetShiftStateError', `SetShiftState `, 23027, 'No se puede cambiar el estado del turno: estado ingresado no válido'),
  ERROR_23028: new CustomError('SetShiftStateError', `SetShiftState `, 23028, 'No se puede detener el turno: todavía hay un servicio en curso'),
  

} 