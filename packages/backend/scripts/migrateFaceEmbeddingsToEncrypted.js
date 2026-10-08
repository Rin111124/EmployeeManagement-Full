require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { encryptJSON, reencryptJSON, getEncryptionKey } = require('../utils/cryptoVault');

async function main() {
    const apply = process.argv.includes('--apply');
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
    getEncryptionKey();
    await mongoose.connect(process.env.MONGODB_URI);

    const collection = mongoose.connection.collection('employees');
    const cursor = collection.find({});
    let scanned = 0;
    let changed = 0;
    for await (const employee of cursor) {
        scanned++;
        let employeeChanged = false;
        const identity = employee.identity ? { ...employee.identity } : employee.identity;
        if (identity?.number && !identity.number_ciphertext) {
            identity.number_ciphertext = encryptJSON(identity.number);
            delete identity.number;
            employeeChanged = true;
            changed++;
        } else if (identity?.number_ciphertext) {
            const rotated = reencryptJSON(identity.number_ciphertext);
            if (rotated !== identity.number_ciphertext) {
                identity.number_ciphertext = rotated;
                employeeChanged = true;
                changed++;
            }
        }
        const bankAccounts = (employee.bank_accounts || []).map((account) => {
            const migrated = { ...account };
            if (migrated.account_number && !migrated.account_number_ciphertext) {
                migrated.account_number_ciphertext = encryptJSON(migrated.account_number);
                delete migrated.account_number;
                employeeChanged = true;
                changed++;
            } else if (migrated.account_number_ciphertext) {
                const rotated = reencryptJSON(migrated.account_number_ciphertext);
                if (rotated !== migrated.account_number_ciphertext) {
                    migrated.account_number_ciphertext = rotated;
                    employeeChanged = true;
                    changed++;
                }
            }
            return migrated;
        });
        const faceData = (employee.face_data || []).map((face) => {
            const migrated = { ...face };
            if (Array.isArray(migrated.embedding) && migrated.embedding.length && !migrated.embedding_ciphertext) {
                migrated.embedding_ciphertext = encryptJSON(migrated.embedding);
                delete migrated.embedding;
                changed++;
                employeeChanged = true;
            } else if (migrated.embedding_ciphertext) {
                const rotated = reencryptJSON(migrated.embedding_ciphertext);
                if (rotated !== migrated.embedding_ciphertext) {
                    migrated.embedding_ciphertext = rotated;
                    employeeChanged = true;
                    changed++;
                }
            }
            return migrated;
        });
        if (apply && employeeChanged) {
            const setFields = {};
            if (employee.face_data) setFields.face_data = faceData;
            if (employee.identity) setFields.identity = identity;
            if (employee.bank_accounts) setFields.bank_accounts = bankAccounts;
            await collection.updateOne({ _id: employee._id }, { $set: setFields });
        }
    }
    console.log(`${apply ? 'Migrated' : 'Would migrate'} ${changed} sensitive field(s) across ${scanned} employee records.`);
    if (!apply) console.log('Back up the database, then rerun with --apply to write encrypted embeddings.');
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error.message);
    process.exitCode = 1;
    await mongoose.disconnect().catch(() => {});
});
