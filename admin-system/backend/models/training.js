const mongoose = require('mongoose');

const { Schema } = mongoose;
const { trainingSessionSchema } = require('./sharedSchemas');

const trainingSchema = new Schema(
    {
        course_name: {
            type: String,
            required: true,
            trim: true,
        },
        sessions: {
            type: [trainingSessionSchema],
            default: [],
        },
    },
    {
        timestamps: true,
        collection: 'training',
    }
);

module.exports = mongoose.models.Training || mongoose.model('Training', trainingSchema);