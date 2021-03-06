//Every single error code
// please use the prefix assigned to this micorservice
const INTERNAL_SERVER_ERROR_CODE = 00001;
const PERMISSION_DENIED = 00002;
const LICENSE_PLATE_ALREADY_ASSIGNED = { code: 23011, description: 'Vehicle license ALREADY ASSIGNED'};
const LICENSE_PLATE_NO_EXIST = { code: 23012, description: "Vehicle license plate don't exist"};

/**
 * class to emcapsulute diferent errors.
 */
class CustomError extends Error {
    constructor(name, method, code = INTERNAL_SERVER_ERROR_CODE , message = '') {
      super(message); 
      this.code = code;
      this.name = name;
      this.method = method;
    }
  
    getContent(){
      return {
        name: this.name,
        code: this.code,
        msg: this.message,      
        method: this.method,
        // stack: this.stack
      }
    }
  };

  class DefaultError extends Error{
    constructor(anyError){
      super(anyError.message)
      this.code = INTERNAL_SERVER_ERROR_CODE;
      this.name = anyError.name;
      this.msg = anyError.message;
      // this.stack = anyError.stack;
    }

    getContent(){
      return{
        code: this.code,
        name: this.name,
        msg: this.msg
      }
    }
  }

  module.exports =  { 
    CustomError,
    DefaultError,
    INTERNAL_SERVER_ERROR_CODE,
    PERMISSION_DENIED,
    LICENSE_PLATE_ALREADY_ASSIGNED,
    LICENSE_PLATE_NO_EXIST,
    ERROR_23020: new CustomError('StopShiftError', `StopShift`, 23020, 'No se puede detener el turno: el conductor no tiene un turno abierto'),
    ERROR_23021: new CustomError('StopShiftError', `StopShift`, 23021, 'No se puede detener el turno: todavía hay un servicio en curso'),
    ERROR_23022: new CustomError('StopShiftError', `StopShift`, 23022, 'No se puede detener el turno: El turno ya se encuentra cerrado'),

    ERROR_23023: new CustomError('VehicleAssignent', `AssignVehicleToDriver`, 23023, 'No se puede asignar el vehículo porque está inactivo'),

  } 