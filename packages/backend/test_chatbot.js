const chatbotService = require('./services/chatbot.service');
const env = require('./config/env');
const connectDB = require('./loaders/database.loader');
const mongoose = require('mongoose');

async function test() {
    await connectDB();
    console.log('Testing with model:', env.geminiModel);
    try {
        const question = 'Hợp đồng sắp hết hạn';
        const result = await chatbotService.answerQuestion(question);
        console.log('RESULT:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('FAILED:', err);
    } finally {
        await mongoose.disconnect();
    }
}

test();
