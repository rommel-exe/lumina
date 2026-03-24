import { openDB } from 'idb'
import type { AppData } from '../models'

const DB_NAME = 'lumina-db'
const DB_VERSION = 1
const SNAPSHOT_KEY = 'app-data'

type LuminaDB = {
  snapshots: {
    key: string
    value: AppData
  }
}

const getDb = () =>
  openDB<LuminaDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('snapshots')) {
        db.createObjectStore('snapshots')
      }
    },
  })

export const saveSnapshot = async (data: AppData) => {
  const db = await getDb()
  await db.put('snapshots', data, SNAPSHOT_KEY)
}

export const loadSnapshot = async () => {
  const db = await getDb()
  return db.get('snapshots', SNAPSHOT_KEY)
}
