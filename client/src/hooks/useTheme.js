import { useEffect, useState } from 'react'

const KEY = 'seo-tracker-theme'

const read = () => {
  try { return localStorage.getItem(KEY) } catch { return null }
}
const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches

// 'dark' | 'light' — the saved choice, else the operating system setting
export const initialTheme = () => read() || (systemDark() ? 'dark' : 'light')

export const applyTheme = (theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

export function useTheme() {
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem(KEY, theme) } catch { /* private mode — theme just isn't remembered */ }
  }, [theme])

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}
