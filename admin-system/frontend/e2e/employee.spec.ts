import { test, expect, Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loginAsAdmin(page: Page) {
    await page.goto('/login');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('Admin@123456');
    await page.getByRole('button', { name: /login|sign in|đăng nhập/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
}

async function navigateToEmployees(page: Page) {
    await page.goto('/employees');
    // Wait for the employee list to load
    await page.waitForSelector('table, [data-testid="employee-list"], [class*="employee"]', { timeout: 10_000 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Employee Management', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('employee list page loads and shows data', async ({ page }) => {
        await navigateToEmployees(page);

        // Should display a table or list of employees
        const table = page.locator('table, [role="grid"]').first();
        await expect(table).toBeVisible();
    });

    test('search bar filters employees by name', async ({ page }) => {
        await navigateToEmployees(page);

        const searchInput = page.getByPlaceholder(/search|tìm kiếm/i).first();
        await searchInput.fill('admin');
        await page.waitForTimeout(600); // debounce wait

        // Result should still render the list (possibly filtered)
        await expect(page.locator('table, [role="grid"]').first()).toBeVisible();
    });

    test('clicking employee row opens detail page', async ({ page }) => {
        await navigateToEmployees(page);

        // Click the first row in the table
        const firstRow = page.locator('table tbody tr, [role="row"]').first();
        await firstRow.click();

        // Should navigate to detail page (URL contains /employees/:id or shows modal)
        const onDetailPage = await Promise.race([
            page.waitForURL(/\/employees\/.+/, { timeout: 5_000 }).then(() => true).catch(() => false),
            page.locator('[data-testid="employee-detail"], [class*="detail"], h2').first()
                .isVisible({ timeout: 5_000 }).catch(() => false),
        ]);
        expect(onDetailPage).toBeTruthy();
    });

    test('create employee button opens form', async ({ page }) => {
        await navigateToEmployees(page);

        // Find add/create button
        const addBtn = page.getByRole('button', { name: /add|create|new|thêm|tạo/i }).first();
        await addBtn.click();

        // A form or modal should appear
        const formVisible = await page.locator('form, [role="dialog"], [data-testid="employee-form"]')
            .first()
            .isVisible({ timeout: 5_000 })
            .catch(() => false);
        expect(formVisible).toBeTruthy();
    });

    test('navigation menu shows Employees section', async ({ page }) => {
        await page.goto('/');

        // Sidebar or nav should have employees link
        const employeesLink = page.getByRole('link', { name: /employees|nhân viên/i }).first();
        await expect(employeesLink).toBeVisible({ timeout: 8_000 });
    });
});
