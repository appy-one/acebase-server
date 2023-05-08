import { SchemaDefinition, Transport } from 'acebase-core';
import adminOnly from '../middleware/admin-only.js';
import { sendError } from '../shared/error.js';
export const addRoute = (env) => {
    env.router.post(`/schema/${env.db.name}/test`, adminOnly(env), async (req, res) => {
        // tests a schema
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