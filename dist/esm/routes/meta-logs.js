import { sendUnauthorizedError } from '../shared/error.js';
export const addRoute = (env) => {
    env.app.get(`/logs/${env.db.name}`, async (req, res) => {
        // Get database logs
        if (req.user?.uid !== 'admin') {
            return sendUnauthorizedError(res, 'admin_only', 'Only the admin user has access to logs');
        }
        // Create index is it's not there yet
        const db = env.log.ref.db;
        const createIndexes = [
            db.indexes.create(env.log.ref.path, 'date') //, { include: ['action', 'ip', 'code'] })
        ];
        if (req.query.filter_col === 'action') {
            createIndexes.push(db.indexes.create(env.log.ref.path, 'action', { include: ['date'] })); // , 'ip', 'code'
        }
        if (req.query.filter_col === 'code') {
            createIndexes.push(db.indexes.create(env.log.ref.path, 'code', { include: ['date'] })); // , 'ip'
        }
        await Promise.all(createIndexes);
        try {
            const query = env.log.query()
                .take(parseInt(req.query.take ?? '100'))
                .skip(parseInt(req.query.skip ?? '0'))
                .sort(req.query.sort ?? 'date', false);
            if (req.query.filter_col) {
                query.filter(req.query.filter_col, req.query.filter_op, req.query.filter_val);
            }
            const snaps = await query.get();
            const logs = snaps.getValues();
            res.send(logs);
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err.message);
        }
    });
};
export default addRoute;
//# sourceMappingURL=meta-logs.js.map