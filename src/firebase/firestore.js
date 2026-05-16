// Required composite indexes (create in Firestore console):
//   Collection: scans  | Fields: billboardId ASC, timestamp ASC
//   Collection: scans  | Fields: platform ASC, timestamp ASC
//   Collection: campaigns | Fields: status ASC, startDate DESC

import {
  collection, query, where, orderBy, limit,
  getDocs, getDoc, doc, getCountFromServer,
  Timestamp,
} from 'firebase/firestore'
import { db } from './config'
import { getFirestoreErrorMessage } from '../utils/errorHandler'

async function wrap(fn) {
  try {
    const data = await fn()
    return { success: true, data, error: null }
  } catch (err) {
    return { success: false, data: null, error: getFirestoreErrorMessage(err) }
  }
}

export async function getTotalScansCount() {
  return wrap(async () => {
    const snap = await getCountFromServer(collection(db, 'scans'))
    return snap.data().count
  })
}

export async function getActiveBillboardsCount() {
  return wrap(async () => {
    const snap = await getCountFromServer(collection(db, 'billboards'))
    return snap.data().count
  })
}

export async function getScansLastNDays(n = 7) {
  return wrap(async () => {
    const since = Timestamp.fromDate(new Date(Date.now() - n * 86_400_000))
    const q = query(
      collection(db, 'scans'),
      where('timestamp', '>=', since),
      orderBy('timestamp', 'asc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  })
}

export async function getRecentScans(n = 15) {
  return wrap(async () => {
    const q = query(
      collection(db, 'scans'),
      orderBy('timestamp', 'desc'),
      limit(n),
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  })
}

export async function getTopBillboards(n = 5) {
  return wrap(async () => {
    const q = query(
      collection(db, 'billboards'),
      orderBy('totalScans', 'desc'),
      limit(n),
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  })
}

export async function getWeekOverWeekChange(billboardIds) {
  return wrap(async () => {
    if (!billboardIds?.length) return {}

    const now = Date.now()
    const sevenDaysAgo   = Timestamp.fromDate(new Date(now - 7  * 86_400_000))
    const fourteenDaysAgo = Timestamp.fromDate(new Date(now - 14 * 86_400_000))

    const [thisSnap, lastSnap] = await Promise.all([
      getDocs(query(collection(db, 'scans'),
        where('billboardId', 'in', billboardIds),
        where('timestamp', '>=', sevenDaysAgo),
      )),
      getDocs(query(collection(db, 'scans'),
        where('billboardId', 'in', billboardIds),
        where('timestamp', '>=', fourteenDaysAgo),
        where('timestamp', '<', sevenDaysAgo),
      )),
    ])

    const thisWeek = {}
    const lastWeek = {}
    billboardIds.forEach(id => { thisWeek[id] = 0; lastWeek[id] = 0 })
    thisSnap.forEach(d => { const id = d.data().billboardId; if (id in thisWeek) thisWeek[id]++ })
    lastSnap.forEach(d => { const id = d.data().billboardId; if (id in lastWeek) lastWeek[id]++ })

    const changes = {}
    billboardIds.forEach(id => {
      changes[id] = lastWeek[id] > 0
        ? parseFloat((((thisWeek[id] - lastWeek[id]) / lastWeek[id]) * 100).toFixed(1))
        : thisWeek[id] > 0 ? 100 : 0
    })
    return changes
  })
}

export async function getPlatformDistribution(days = 30) {
  return wrap(async () => {
    const since = Timestamp.fromDate(new Date(Date.now() - days * 86_400_000))
    const q = query(collection(db, 'scans'), where('timestamp', '>=', since))
    const snap = await getDocs(q)

    const counts = {}
    snap.forEach(d => {
      const p = d.data().platform || 'other'
      counts[p] = (counts[p] || 0) + 1
    })

    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    return { counts, total }
  })
}

export async function getScansByHour(days = 1) {
  return wrap(async () => {
    const since = Timestamp.fromDate(new Date(Date.now() - days * 86_400_000))
    const q = query(collection(db, 'scans'), where('timestamp', '>=', since))
    const snap = await getDocs(q)

    const bins = {}
    for (let h = 0; h < 24; h++) bins[`${String(h).padStart(2, '0')}:00`] = 0
    snap.forEach(d => {
      const ts = d.data().timestamp?.toDate?.()
      if (ts) bins[`${String(ts.getHours()).padStart(2, '0')}:00`]++
    })

    return Object.entries(bins).map(([hour, scans]) => ({ hour, scans }))
  })
}

export async function getCampaignStats() {
  return wrap(async () => {
    const q = query(
      collection(db, 'campaigns'),
      where('status', '==', 'active'),
      orderBy('startDate', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  })
}

export async function getBillboardById(id) {
  return wrap(async () => {
    const snap = await getDoc(doc(db, 'billboards', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  })
}
