const mongoose = require('mongoose');
const LocalEmployee = require('../../src/models/LocalEmployee');
const { cosineSimilarity } = require('../../src/utils/faceMatching');
const env = require('../../src/config/env');

async function test() {
    await mongoose.connect(env.mongoUri);
    const employees = await LocalEmployee.find({
        status: 'Active',
        face_embedding: { $exists: true, $not: { $size: 0 } }
    });
    
    if (employees.length > 0) {
        const emp = employees[0];
        try {
            const similarity = cosineSimilarity(emp.face_embedding, emp.face_embedding);
            console.log(`Self-similarity for ${emp.full_name}: ${similarity}`);
        } catch (e) {
            console.error(`Error calculating similarity:`, e);
        }
    } else {
        console.log("No employees found");
    }
    process.exit(0);
}
test();
