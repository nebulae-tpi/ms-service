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
  ERROR_23003: (msg) => {return new CustomError('Invalid JWT Token', `Auth`, 23003, msg)} ,
  ERROR_23212: (location) => {return new CustomError('ShiftLocationReportedError', `ShiftLocationReported`, 23212, `Localización reportada inválida, ${JSON.stringify(location)}`)},  
  ERROR_23223: new CustomError('ModifyServiceStateError', `ModifyServicesState`, 23223, 'Servicio no encontrado'),
  ERROR_23230: new CustomError('ModifyServiceStateError', `ModifyServicesState`, 23230, 'Estado de servicio no permitido'),    
} 