import { SchemaDefinition, Transport } from 'acebase-core';
import { sendError, sendUnauthorizedError } from '../shared/error.js';
export const addRoute = (env) => {
    env.app.post(`/schema/${env.db.name}/test`, async (req, res) => {
        // tests a schema
        if (!req.user || req.user.username !== 'admin') {
            return sendUnauthorizedError(res, 'admin_only', 'only admin can perform schema operations');
        }
        try {
            const data = req.body;
            if (typeof data.value?.val === 'undefined' || !['string', 'object', 'undefined'].includes(typeof data.value?.map)) {
                return sendError(res, { code: 'invalid_serialized_value', message: 'The sent value is not properly serialized' });
            }
            const value = Transport.deserialize(data.value);
            const { path, schema, partial } = data;
            let result;
            if (schema) {
                const definition = new SchemaDefinition(schema);
                result = definition.check(path, value, partial);
            }
            else {
                result = await env.db.schema.check(path, schema, partial);
            }
            res.contentType('application/json').send(result);
        }
        catch (err) {
            sendError(res, err);
        }
    });
};
export default addRoute;
//# sourceMappingURL=data-schema-test.js.map