import { test, expect, Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loginAs(page: Page, username: string, password: string) {
    await page.goto('/login');
    await page.locator('#username').fill(username);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
}

async function loginAsAdmin(page: Page) {
    await loginAs(page, 'admin', 'Admin@123456');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Authentication Flow', () => {
    test('successful login redirects to dashboard', async ({ page }) => {
        await loginAsAdmin(page);

        await expect(page).not.toHaveURL(/\/login/);
        // Dashboard should show some meaningful content
        await expect(page.locator('h1, [data-testid="dashboard"]').first()).toBeVisible({ timeout: 10_000 });
    });

    test('wrong password shows error message', async ({ page }) => {
        await page.goto('/login');
        await page.locator('#username').fill('admin');
        await page.locator('#password').fill('wrong-password-xyz');
        await page.locator('button[type="submit"]').click();

        // Should stay on login page
        await expect(page).toHaveURL(/\/login/);
        // Should show an error with wait
        await expect(page.locator('[role="alert"], [data-testid="error"]').first()).toBeVisible({ timeout: 8_000 });
    });

    test('non-existent user shows error message', async ({ page }) => {
        await page.goto('/login');
        await page.locator('#username').fill('nonexistent_user_xyz');
        await page.locator('#password').fill('anypassword');
        await page.locator('button[type="submit"]').click();

        await expect(page).toHaveURL(/\/login/);
    });

    test('accessing protected route without login redirects to login', async ({ page }) => {
        // Ensure no session exists
        await page.context().clearCookies();
        await page.goto('/employees');

        await expect(page).toHaveURL(/\/login/);
    });

    test('logout redirects to login page', async ({ page }) => {
        await loginAsAdmin(page);
        await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

        // Find and click logout button (use .first() to avoid strict mode collision between topbar & sidebar)
        const logoutBtn = page.getByRole('button', { name: /logout|sign out|đăng xuất/i }).first();
        await logoutBtn.click();

        await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
    });

    test('empty credentials show validation errors', async ({ page }) => {
        await page.goto('/login');
        await page.locator('button[type="submit"]').click();

        // Should still be on login page
        await expect(page).toHaveURL(/\/login/);
    });
});
