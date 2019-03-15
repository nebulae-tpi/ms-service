'use strinct'

const { of } = require('rxjs');
const { map, tap } = require('rxjs/operators');
const { CustomError, DefaultError } = require('./customError');

const buildSuccessResponse$ = (rawRespponse) => {
    return of(rawRespponse).pipe(
        map(resp => {
            return {
                data: resp,
                result: {
                    code: 200
                }
            };
        })
    );
};

const buildErrorResponse$ = (errCode, rawRespponse) => {
    return of(rawRespponse).pipe(
        map(resp => {
            return {
                data: resp,
                result: {
                    code: errCode
                }
            };
        })
    );
};

const handleError$ = (err, doLog = false) => {
    return of(err).pipe(
        tap(err => { if (doLog) logError(err); }),
        map(err => {
            const exception = { data: null, result: {} };
            const isCustomError = err instanceof CustomError;
            if (!isCustomError) {
                err = new DefaultError(err);
            }
            exception.result = {
                code: err.code,
                error: { ...err.getContent() }
            };
            return exception;
        })
    );
}

/**
 * Logs an error at the console.error printing only the message and the stack related to the project source code
 * @param {Error} error 
 */
const logError = (error) => {
    if (!error.stack) {
        console.error(error);
        return;
    }
    try {
        const stackLines = error.stack.split('\n');
        console.error(
            new Date().toString() + ': ' + stackLines[0] + '\n' + stackLines.filter(line => line.includes('client-app-link/bin')).join('\n') + '\n'
        );
    }
    catch (e) {
        console.error(e);
        console.error(error);
    }
}

module.exports = {
    buildSuccessResponse$,
    handleError$,
    buildErrorResponse$
}