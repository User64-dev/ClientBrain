import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '@/app/login/page'
import Signup from '@/app/signup/page'

const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockSignInWithPassword = jest.fn()
const mockSignUp = jest.fn()
const mockSignOut = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
  redirect: jest.fn(),
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
    },
  })),
}))

describe('Auth flow integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should complete signup flow with valid credentials', async () => {
    mockSignUp.mockResolvedValue({ error: null })

    render(<Signup />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/^email$/i), 'newuser@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'securepassword')
    await user.type(screen.getByLabelText(/confirm password/i), 'securepassword')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'securepassword',
      })
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should complete login flow with valid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })

    render(<Login />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      })
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should show error and not redirect when login credentials are invalid', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })

    render(<Login />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })
})
