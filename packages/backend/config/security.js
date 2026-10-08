const env = require('./env');

const securityConfig = {
    jsonBodyLimit: env.jsonBodyLimit,
    urlEncoded: {
        extended: true,
    },
};

module.exports = securityConfig;
