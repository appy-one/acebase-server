export const sendNotAuthenticatedError = (res, code, message) => {
    res.statusCode = 401; // Unauthorized (not unauthenticated)
    res.statusMessage = 'Not Authenticated';
    res.contentType('application/json').send({ code, message });
};
export const sendUnauthorizedError = (res, code, message) => {
    res.statusCode = 403; // Forbidden
    res.statusMessage = 'Unauthorized';
    res.contentType('application/json').send({ code, message });
};
export const sendError = (res, err) => {
    res.contentType('application/json');
    if (typeof err.code === 'string') {
        sendBadRequestError(res, err); //res.status(400).send({ code: err.code, message: err.message }); // Bad Request
    }
    else {
        sendUnexpectedError(res, err); // res.status(500).send({ code: 'unknown', message: 'server error', details: err.message }); // Internal server error
    }
};
export const sendBadRequestError = (res, err) => {
    res.status(400).contentType('application/json').send({ code: err.code, message: err.message }); // Bad Request
};
export const sendUnexpectedError = (res, err) => {
    res.status(500).contentType('application/json').send({ code: 'unexpected', message: 'server error', details: err.message }); // Internal server error
};
//# sourceMappingURL=error.js.map