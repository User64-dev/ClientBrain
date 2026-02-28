import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Signup from '../page'

const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockSignUp = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: mockSignUp,
    },
  })),
}))

describe('Signup page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render signup form with email, password, and confirm password fields', () => {
    render(<Signup />)

    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('should show error when passwords do not match', async () => {
    render(<Signup />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/^email$/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'differentpassword')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  it('should show error message when Supabase auth fails', async () => {
    mockSignUp.mockResolvedValue({
      error: { message: 'User already registered' },
    })

    render(<Signup />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/^email$/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByText('User already registered')).toBeInTheDocument()
    })
  })

  it('should display loading state during submission', async () => {
    mockSignUp.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
    )

    render(<Signup />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/^email$/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument()
  })

  it('should redirect to /dashboard on successful signup', async () => {
    mockSignUp.mockResolvedValue({ error: null })

    render(<Signup />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/^email$/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should have a link to the login page', () => {
    render(<Signup />)

    const loginLink = screen.getByRole('link', { name: /sign in/i })
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('should call signUp with correct credentials', async () => {
    mockSignUp.mockResolvedValue({ error: null })

    render(<Signup />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/^email$/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })
})
