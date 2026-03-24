import type { Settings } from '../models'

const SETTINGS_KEY = 'lumina-settings'

export const loadSettings = (): Settings | null => {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as Settings
  } catch {
    return null
  }
}

export const saveSettings = (settings: Settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
