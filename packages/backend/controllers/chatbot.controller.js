const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const chatbotService = require('../services/chatbot.service');

const ask = asyncHandler(async (req, res) => {
    const question = String(req.body?.question || '').trim();
    if (!question) {
        throw new AppError('question is required', 400);
    }

    if (question.length > 1000) {
        throw new AppError('question must be at most 1000 characters', 400);
    }

    const result = await chatbotService.answerQuestion(question);
    res.status(200).json({
        success: true,
        data: result,
    });
});

module.exports = {
    ask,
};
