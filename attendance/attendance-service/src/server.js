const app = require('./app');
const env = require('./config/env');
const { startOutboxWorker } = require('./services/outbox.service');

app.listen(env.port, '0.0.0.0', () => {
    console.log(`[Core Service] Running on http://0.0.0.0:${env.port}`);
    startOutboxWorker();
});
