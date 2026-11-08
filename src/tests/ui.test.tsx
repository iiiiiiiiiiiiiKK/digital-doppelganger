import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { XLink, AUTHOR_X_URL } from '../components/XLink'
import { IdentityOrb } from '../components/IdentityOrb'
import { useApp } from '../store/useApp'
import { defaultSettings } from '../lib/io'

describe('author X link', () => {
  it('points at the author profile and is keyboard reachable', () => {
    render(<XLink />)
    const link = screen.getByRole('link', { name: /0xkillcoin/i })
    expect(link).toHaveAttribute('href', AUTHOR_X_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(link.textContent).toContain('𝕏')
  })
})

describe('app shell', () => {
  it('renders the top bar with the author X link and primary navigation', () => {
    useApp.setState({
      settings: { ...defaultSettings(), lang: 'en' },
      profile: null,
      doppel: null,
      loaded: true,
    })
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AppShell />
      </MemoryRouter>,
    )
    const authorLinks = screen.getAllByRole('link', { name: /0xkillcoin/i })
    expect(authorLinks.length).toBeGreaterThan(0)
    expect(authorLinks[0]).toHaveAttribute('href', AUTHOR_X_URL)
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0)
  })

  it('toggles language from the top bar', async () => {
    useApp.setState({ settings: { ...defaultSettings(), lang: 'en' }, loaded: true })
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AppShell />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: /language/i }))
    await waitFor(() => {
      expect(useApp.getState().settings.lang).toBe('zh')
    })
  })
})

describe('identity orb', () => {
  it('renders a deterministic svg identity mark', () => {
    const { container, rerender } = render(<IdentityOrb seed="kai" />)
    const first = container.innerHTML
    rerender(<IdentityOrb seed="kai" />)
    expect(container.innerHTML).toBe(first)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
