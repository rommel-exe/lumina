import { useEffect, useState } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export interface UpdateStatus {
  isAvailable: boolean
  version: string | null
  isUpdating: boolean
  error: string | null
}

export function useAutoUpdate() {
  const [status, setStatus] = useState<UpdateStatus>({
    isAvailable: false,
    version: null,
    isUpdating: false,
    error: null,
  })

  useEffect(() => {
    checkForUpdate()
    // Check every 30 minutes
    const interval = setInterval(checkForUpdate, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const checkForUpdate = async () => {
    try {
      const update = await check()
      if (update?.available) {
        setStatus({
          isAvailable: true,
          version: update.version,
          isUpdating: false,
          error: null,
        })
        console.log(`Update available: v${update.version}`)
      }
    } catch (error) {
      console.error('Update check failed:', error)
      setStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
    }
  }

  const downloadAndInstall = async () => {
    try {
      setStatus((prev) => ({ ...prev, isUpdating: true }))
      const update = await check()
      if (update?.available) {
        await update.downloadAndInstall()
        setStatus((prev) => ({
          ...prev,
          isUpdating: false,
          isAvailable: false,
        }))
        // Relaunch the app with the new version
        await relaunch()
      }
    } catch (error) {
      console.error('Update installation failed:', error)
      setStatus((prev) => ({
        ...prev,
        isUpdating: false,
        error: error instanceof Error ? error.message : 'Installation failed',
      }))
    }
  }

  return {
    ...status,
    checkForUpdate,
    downloadAndInstall,
  }
}
