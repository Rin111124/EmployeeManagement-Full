const app = require('./app');
const connectDatabase = require('./loaders/database.loader');
const env = require('./config/env');
const logger = require('./utils/logger');
const socketManager = require('./utils/socket');
const os = require('os');
const http = require('http');

async function bootstrap() {
    try {
        logger.info('Starting server bootstrap...');
        
        // 1. Kết nối Database
        await connectDatabase();
        logger.info('Database handshake successful');

        // 2. Lấy IP mạng cục bộ để hiển thị
        const networkInterfaces = os.networkInterfaces();
        let localIp = 'localhost';
        for (const name of Object.keys(networkInterfaces)) {
            for (const net of networkInterfaces[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    localIp = net.address;
                    break;
                }
            }
        }

        // 3. Khởi động HTTP server
        const httpServer = http.createServer(app);

        // 4. Khởi tạo Socket.IO qua module singleton (thay thế global.io)
        const { allowedOrigins } = require('./config/cors');
        socketManager.init(httpServer, allowedOrigins);

        httpServer.listen(env.port, '0.0.0.0', () => {
            logger.info('Server network interface bound', { 
                port: env.port, 
                host: '0.0.0.0' 
            });
            
            console.log('\n' + '='.repeat(50));
            console.log(`🚀 BACKEND ĐÃ SẴN SÀNG HOẠT ĐỘNG!`);
            console.log(`🏠 Local:   http://localhost:${env.port}`);
            console.log(`🌐 Network: http://${localIp}:${env.port}`);
            console.log(`⚡ WebSocket: Bật (socket.io)`);
            console.log('='.repeat(50) + '\n');
        });

    } catch (error) {
        logger.error('CRITICAL: Failed to bootstrap server', { 
            error: error.message,
            stack: error.stack 
        });
        process.exit(1);
    }
}

bootstrap();

