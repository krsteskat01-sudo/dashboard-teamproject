import {
  collection, query, where, orderBy, getDocs, getCountFromServer, Timestamp,
} from 'firebase/firestore'
import { db } from './config'

async function wrap(fn) {
  try {
    return { success: true, data: await fn(), error: null }
  } catch (err) {
    return { success: false, data: null, error: err?.message ?? String(err) }
  }
}

export function toTs(date) {
  return Timestamp.fromDate(date instanceof Date ? date : new Date(date))
}

// Fetch all scans between two dates — the single source of truth for analytics.
export async function getScansInRange(start, end) {
  return wrap(async () => {
    const q = query(
      collection(db, 'scans'),
      where('timestamp', '>=', toTs(start)),
      where('timestamp', '<=', toTs(end)),
      orderBy('timestamp', 'asc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  })
}

// Count-only query — cheap for overview stats comparison.
export async function countScansInRange(start, end) {
  return wrap(async () => {
    const q = query(
      collection(db, 'scans'),
      where('timestamp', '>=', toTs(start)),
      where('timestamp', '<=', toTs(end)),
    )
    const snap = await getCountFromServer(q)
    return snap.data().count
  })
}

// Fetch all campaigns for campaign comparison panel.
export async function getAllCampaigns() {
  return wrap(async () => {
    const snap = await getDocs(collection(db, 'campaigns'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  })
}

// Fetch all billboards for name resolution.
export async function getAllBillboards() {
  return wrap(async () => {
    const snap = await getDocs(collection(db, 'billboards'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  })
}
