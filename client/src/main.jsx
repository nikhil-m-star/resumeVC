import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import './styles/variables.css'
import './styles/reset.css'
import './styles/base.css'
import './styles/utilities.css'
import './styles/components/avatar.css'
import './styles/components/button.css'
import './styles/components/input.css'
import './styles/components/dialog.css'
import './styles/components/dropdown.css'
import './styles/components/editor-components.css'
import './styles/layouts/auth.css'
import './styles/layouts/dashboard.css'
import './styles/layouts/editor.css'
import './styles/layouts/app.css'
import App from './App.jsx'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const getResolvedTheme = () => {
  const storedTheme = localStorage.getItem('resumevc-theme') || 'dark'
  if (storedTheme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return storedTheme
}

function Root() {
  const [resolvedTheme, setResolvedTheme] = useState(getResolvedTheme)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const onThemeSourceChange = () => setResolvedTheme(getResolvedTheme())
    const observer = new MutationObserver(() => {
      const rootTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      setResolvedTheme(rootTheme)
    })

    window.addEventListener('storage', onThemeSourceChange)
    mediaQuery.addEventListener('change', onThemeSourceChange)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      window.removeEventListener('storage', onThemeSourceChange)
      mediaQuery.removeEventListener('change', onThemeSourceChange)
      observer.disconnect()
    }
  }, [])

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      appearance={{
        theme: resolvedTheme === 'dark' ? dark : undefined,
        layout: {
          unsafe_disableDevelopmentModeWarnings: true,
        },
      }}
    >
      <App />
    </ClerkProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
