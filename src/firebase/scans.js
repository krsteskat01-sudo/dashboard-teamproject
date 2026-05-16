import {
  collection, doc, deleteDoc,
  query, orderBy, limit, where, Timestamp, onSnapshot,
} from 'firebase/firestore'
import { db } from './config'

const COL = 'scans'

function since24h() {
  const d = new Date()
  d.setHours(d.getHours() - 24)
  return Timestamp.fromDate(d)
}

// Real-time subscription — last 24 h, newest first, max 100 docs.
// All field filtering is client-side to avoid composite index requirements.
export function subscribeToScans(callback) {
  const q = query(
    collection(db, COL),
    where('timestamp', '>=', since24h()),
    orderBy('timestamp', 'desc'),
    limit(100),
  )

  return onSnapshot(
    q,
    snapshot => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      callback({ success: true, data, error: null })
    },
    err => callback({ success: false, data: [], error: err?.message ?? String(err) }),
  )
}

export async function deleteScan(id) {
  try {
    await deleteDoc(doc(db, COL, id))
    return { success: true }
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) }
  }
}
