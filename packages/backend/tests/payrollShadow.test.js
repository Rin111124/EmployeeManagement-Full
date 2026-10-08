'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

test('Payroll Shadow Reconciler: 100% parity across Golden Reference cases (Gate 4)', async () => {
    const { runShadowReconciliation, GOLDEN_CASES } = await import('../../../scripts/payroll/payroll-shadow-reconcile.mjs');
    assert.ok(GOLDEN_CASES.length >= 6, 'Must test at least 6 complex shift scenarios');

    const { allPassed, results } = runShadowReconciliation();
    assert.strictEqual(allPassed, true, 'All golden cases must reconcile with 0 VND error variance');

    for (const r of results) {
        assert.strictEqual(r.varianceVND, 0, `Scenario ${r.id} (${r.title}) had unexpected variance`);
        assert.strictEqual(r.status, 'PASS ✅');
    }
});
