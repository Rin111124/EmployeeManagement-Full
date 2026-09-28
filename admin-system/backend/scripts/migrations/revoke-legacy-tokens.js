#!/usr/bin/env node
/**
 * scripts/migrations/revoke-legacy-tokens.js
 *
 * P0-KIOSK-07: Migration script — Revoke legacy device tokens
 *
 * Mục đích:
 *   Tìm và revoke tất cả thiết bị vẫn đang dùng legacy token (plaintext device_token
 *   hoặc claim_code_hash không có bootstrap_hash), buộc kiosk phải re-enroll
 *   theo flow challenge-response mới.
 *
 * Chạy:
 *   node scripts/migrations/revoke-legacy-tokens.js [options]
 *
 * Options:
 *   --dry-run           Chỉ in danh sách, không thực sự thay đổi DB (mặc định)
 *   --execute           Thực sự revoke token (yêu cầu xác nhận)
 *   --batch-size=N      Số thiết bị xử lý mỗi lần (mặc định: 10)
 *   --mongo-uri=URI     Override MongoDB URI (mặc định lấy từ .env)
 *   --yes               Bỏ qua xác nhận interactive (dùng cho CI/automation)
 *
 * Ví dụ:
 *   node scripts/migrations/revoke-legacy-tokens.js --dry-run
 *   node scripts/migrations/revoke-legacy-tokens.js --execute --batch-size=5
 *   node scripts/migrations/revoke-legacy-tokens.js --execute --yes
 *
 * Nghiệm thu (P0-KIOSK-07):
 *   - Sau khi chạy --execute, query Device.find({ $or: [{ device_token: { $exists: true } }, { claim_code_hash: { $exists: true } }] })
 *     phải trả về 0 kết quả.
 *   - Audit log DEVICE_LEGACY_TOKEN_REVOKED phải tồn tại cho mỗi device đã revoke.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const readline = require('readline');

// ─── Parse CLI args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');
const skipConfirm = args.includes('--yes');
const batchSizeArg = args.find((a) => a.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 10;
const mongoUriArg = args.find((a) => a.startsWith('--mongo-uri='));
const mongoUri = mongoUriArg
  ? mongoUriArg.split('=').slice(1).join('=')
  : process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/employee_management';

// ─── Minimal inline schemas (không import app để tránh side effects) ──────────

const deviceSchema = new mongoose.Schema(
  {
    device_name: String,
    ip_address: String,
    location: String,
    device_type: String,
    status: String,
    device_id: String,
    bootstrap_hash: { type: String, select: false },
    device_token: { type: String, select: false },
    device_token_hash: { type: String, select: false },
    claim_code_hash: { type: String, select: false },
    enrollment_challenge: {
      challenge: { type: String, select: false },
      expires_at: { type: Date, select: false },
      attempts: { type: Number, select: false },
    },
    revoked_at: Date,
    can_access_db: Boolean,
    scopes: [String],
    last_sync: Date,
    metadata: { type: Map, of: String },
  },
  { timestamps: true }
);

const auditSchema = new mongoose.Schema({
  user_id: mongoose.Schema.Types.Mixed,
  action: String,
  target: { type: mongoose.Schema.Types.Mixed },
  metadata: mongoose.Schema.Types.Mixed,
  ip: String,
  user_agent: String,
  timestamp: { type: Date, default: Date.now },
});

let Device, AuditLog;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function printBanner(isDry) {
  console.log('\n' + '═'.repeat(60));
  console.log('  P0-KIOSK-07 — Legacy Device Token Revocation Migration');
  console.log('  Mode:', isDry ? '🔍 DRY-RUN (no changes will be made)' : '⚠️  EXECUTE (will write to DB)');
  console.log('  MongoDB:', mongoUri.replace(/:\/\/[^@]+@/, '://***@')); // mask credentials
  console.log('  Batch size:', batchSize);
  console.log('═'.repeat(60) + '\n');
}

/**
 * Tìm tất cả device có legacy token (plaintext device_token hoặc claim_code_hash).
 * Điều kiện legacy = có token cũ VÀ không có bootstrap_hash (chưa upgrade enrollment).
 */
async function findLegacyDevices() {
  return Device.find({
    $or: [
      { device_token: { $exists: true, $ne: null, $ne: '' } },
      { claim_code_hash: { $exists: true, $ne: null, $ne: '' } },
    ],
  })
    .select('+device_token +device_token_hash +claim_code_hash +bootstrap_hash +enrollment_challenge.challenge')
    .sort({ createdAt: 1 });
}

/**
 * Tìm device có token cũ nhưng CHƯA có bootstrap_hash (chưa sẵn sàng re-enroll).
 */
async function findDevicesWithoutBootstrap() {
  return Device.find({
    $and: [
      {
        $or: [
          { device_token: { $exists: true, $ne: null, $ne: '' } },
          { claim_code_hash: { $exists: true, $ne: null, $ne: '' } },
        ],
      },
      {
        $or: [
          { bootstrap_hash: { $exists: false } },
          { bootstrap_hash: null },
          { bootstrap_hash: '' },
        ],
      },
    ],
  }).select('+bootstrap_hash');
}

function printDeviceTable(devices) {
  if (devices.length === 0) {
    console.log('  (không có thiết bị nào)');
    return;
  }
  const colW = [24, 16, 10, 12, 10];
  const header = [
    'device_name'.padEnd(colW[0]),
    'status'.padEnd(colW[1]),
    'has_old_token'.padEnd(colW[2]),
    'has_claim_code'.padEnd(colW[3]),
    'has_bootstrap',
  ].join('  ');
  console.log('  ' + header);
  console.log('  ' + '-'.repeat(header.length));
  for (const d of devices) {
    const row = [
      (d.device_name || '?').substring(0, colW[0] - 1).padEnd(colW[0]),
      (d.status || '?').padEnd(colW[1]),
      (d.device_token ? 'YES' : 'no').padEnd(colW[2]),
      (d.claim_code_hash ? 'YES' : 'no').padEnd(colW[3]),
      d.bootstrap_hash ? 'YES' : 'NO ⚠️',
    ].join('  ');
    console.log('  ' + row);
  }
}

// ─── Core revocation logic ────────────────────────────────────────────────────

async function revokeDeviceBatch(devices) {
  const results = { revoked: 0, skipped: 0, errors: [] };

  for (let i = 0; i < devices.length; i += batchSize) {
    const batch = devices.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(devices.length / batchSize);
    console.log(`\n  Xử lý batch ${batchNum}/${totalBatches} (${batch.length} thiết bị)...`);

    for (const device of batch) {
      try {
        // Revoke: xóa token cũ, đặt revoked_at, can_access_db = false
        // Không xóa bootstrap_hash — thiết bị cần nó để re-enroll
        await Device.findByIdAndUpdate(device._id, {
          $unset: {
            device_token: 1,
            device_token_hash: 1,
            claim_code_hash: 1,
            enrollment_challenge: 1,
          },
          $set: {
            revoked_at: new Date(),
            can_access_db: false,
            // Giữ nguyên status để device biết cần re-enroll (không reject hẳn)
          },
        });

        // Ghi audit log
        await AuditLog.create({
          user_id: null,
          action: 'DEVICE_LEGACY_TOKEN_REVOKED',
          target: { type: 'Device', id: device._id },
          metadata: {
            device_name: device.device_name,
            device_id: device.device_id,
            had_plaintext_token: !!device.device_token,
            had_claim_code: !!device.claim_code_hash,
            had_bootstrap: !!device.bootstrap_hash,
            migration_script: 'revoke-legacy-tokens.js',
            migration_timestamp: new Date().toISOString(),
          },
          timestamp: new Date(),
        });

        console.log(`    ✅ Revoked: ${device.device_name} (${device._id})`);
        results.revoked++;
      } catch (err) {
        console.error(`    ❌ Error revoking ${device.device_name} (${device._id}): ${err.message}`);
        results.errors.push({ device_id: device._id, error: err.message });
        results.skipped++;
      }
    }

    // Delay nhỏ giữa các batch để tránh spike DB
    if (i + batchSize < devices.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  printBanner(isDryRun);

  // Kết nối DB
  console.log('Đang kết nối MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Đã kết nối MongoDB\n');

  // Đăng ký models
  Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);
  AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditSchema);

  // Tìm legacy devices
  console.log('Đang quét thiết bị có legacy token...');
  const legacyDevices = await findLegacyDevices();
  const noBootstrapDevices = await findDevicesWithoutBootstrap();

  console.log(`\n📋 Tổng thiết bị có legacy token/claim_code: ${legacyDevices.length}`);
  printDeviceTable(legacyDevices);

  if (noBootstrapDevices.length > 0) {
    console.log(`\n⚠️  Cảnh báo: ${noBootstrapDevices.length} thiết bị chưa có bootstrap_hash!`);
    console.log('   Những thiết bị này sẽ KHÔNG thể re-enroll qua challenge-response sau khi bị revoke.');
    console.log('   ➡️  Hành động: Liên hệ đội vận hành để cài lại firmware/bootstrap credential trên các kiosk này trước khi chạy --execute.\n');
    console.log('   Danh sách:');
    for (const d of noBootstrapDevices) {
      console.log(`     - ${d.device_name} (${d._id})`);
    }
  }

  if (legacyDevices.length === 0) {
    console.log('\n✅ Không có thiết bị nào cần migration. Hệ thống sạch!\n');
    await mongoose.disconnect();
    return;
  }

  // DRY-RUN: chỉ in báo cáo
  if (isDryRun) {
    console.log('\n--- KẾT QUẢ DRY-RUN ---');
    console.log(`  ${legacyDevices.length} thiết bị sẽ bị revoke nếu chạy --execute`);
    console.log(`  ${noBootstrapDevices.length} thiết bị cần cập nhật bootstrap_hash trước`);
    console.log('\n  Để thực sự revoke, chạy:');
    console.log('    node scripts/migrations/revoke-legacy-tokens.js --execute\n');
    await mongoose.disconnect();
    return;
  }

  // EXECUTE mode: xác nhận
  if (!skipConfirm) {
    console.log('\n⚠️  CẢNH BÁO: Thao tác này sẽ REVOKE token của TẤT CẢ thiết bị trong danh sách trên.');
    console.log('   Kiosk sẽ mất kết nối ngay lập tức và cần re-enroll thủ công.\n');

    if (noBootstrapDevices.length > 0) {
      console.log(`   ⛔ Có ${noBootstrapDevices.length} thiết bị chưa có bootstrap_hash.`);
      console.log('   Nên cài bootstrap trước. Tiếp tục có thể khóa kiosk vĩnh viễn!\n');
    }

    const answer = await confirm('Nhập "REVOKE" để xác nhận, hoặc Ctrl+C để hủy: ');
    if (answer !== 'revoke') {
      console.log('\nĐã hủy. Không có thay đổi nào được thực hiện.\n');
      await mongoose.disconnect();
      return;
    }
  }

  // Thực hiện revoke
  console.log('\nBắt đầu revoke legacy tokens...');
  const results = await revokeDeviceBatch(legacyDevices);

  // Báo cáo cuối
  console.log('\n' + '═'.repeat(60));
  console.log('  BÁO CÁO KẾT QUẢ MIGRATION');
  console.log('═'.repeat(60));
  console.log(`  ✅ Đã revoke:     ${results.revoked} thiết bị`);
  console.log(`  ⏭️  Bỏ qua/lỗi:   ${results.skipped} thiết bị`);
  if (results.errors.length > 0) {
    console.log('\n  Lỗi chi tiết:');
    for (const e of results.errors) {
      console.log(`    - Device ${e.device_id}: ${e.error}`);
    }
  }

  console.log('\n  Bước tiếp theo:');
  console.log('  1. Thông báo đội vận hành kiosk về việc cần re-enroll');
  console.log('  2. Mỗi kiosk cần: POST /api/v1/devices/enroll/challenge → POST /api/v1/devices/claim-token');
  console.log('  3. Xác nhận bằng query: db.devices.find({ device_token: { $exists: true } }) → 0 kết quả');
  console.log('  4. Tham khảo runbook: docs/runbooks/kiosk-reenrollment.md');
  console.log('═'.repeat(60) + '\n');

  await mongoose.disconnect();
  process.exit(results.errors.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  console.error(err.stack);
  mongoose.disconnect().finally(() => process.exit(1));
});
