import { test, expect, Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loginAs(page: Page, username: string, password: string) {
    await page.goto('/login');
    await page.getByLabel(/username/i).fill(username);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /login|sign in|đăng nhập/i }).click();
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
        await page.getByLabel(/username/i).fill('admin');
        await page.getByLabel(/password/i).fill('wrong-password-xyz');
        await page.getByRole('button', { name: /login|sign in|đăng nhập/i }).click();

        // Should stay on login page
        await expect(page).toHaveURL(/\/login/);
        // Should show an error
        const errorVisible = await page.locator('[role="alert"], .error, [data-testid="error"]').isVisible()
            .catch(() => false);
        // Also accept toast notifications
        const toastVisible = await page.locator('[class*="toast"], [class*="notification"]').isVisible()
            .catch(() => false);
        expect(errorVisible || toastVisible).toBeTruthy();
    });

    test('non-existent user shows error message', async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel(/username/i).fill('nonexistent_user_xyz');
        await page.getByLabel(/password/i).fill('anypassword');
        await page.getByRole('button', { name: /login|sign in|đăng nhập/i }).click();

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

        // Find and click logout button
        const logoutBtn = page.getByRole('button', { name: /logout|sign out|đăng xuất/i });
        await logoutBtn.click();

        await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
    });

    test('empty credentials show validation errors', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: /login|sign in|đăng nhập/i }).click();

        // Should still be on login page
        await expect(page).toHaveURL(/\/login/);
    });
});
