import { test, expect } from '@playwright/test'

test.describe('Authentication flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('should display signup page', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible()
    await expect(page.getByLabel(/^email$/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByLabel(/confirm password/i)).toBeVisible()
  })

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('invalid@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.locator('.text-red-500')).toBeVisible({ timeout: 5000 })
  })

  test('should show error when passwords do not match on signup', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel(/^email$/i).fill('test@example.com')
    await page.getByLabel(/^password$/i).fill('password123')
    await page.getByLabel(/confirm password/i).fill('differentpassword')
    await page.getByRole('button', { name: /sign up/i }).click()
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  })

  test('should have working link from login to signup', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL('/signup')
  })

  test('should have working link from signup to login', async ({ page }) => {
    await page.goto('/signup')
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/login')
  })

  test('should redirect unauthenticated users from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })
})
