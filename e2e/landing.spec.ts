import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
  test('should load landing page successfully', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ClientBrain/i)
  })

  test('should render scroll progress bar', async ({ page }) => {
    await page.goto('/')
    const progressBar = page.locator('.fixed.top-0.left-0.right-0')
    await expect(progressBar).toBeVisible()
  })

  test('should render ClientBrain brand name', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/ClientBrain/i).first()).toBeVisible()
  })

  test('should have navigation links to login and signup', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /get started/i })).toBeVisible()
  })

  test('should navigate to login page when Sign In is clicked', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/login')
  })
})
