export const addRoute = (env) => {
    env.router.get(`/ping/${env.db.name}`, (req, res) => {
        // For simple connectivity check
        res.send('pong');
    });
};
export default addRoute;
//# sourceMappingURL=meta-ping.js.map