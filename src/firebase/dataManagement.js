import {
  collection, getDocs, getCountFromServer, writeBatch, updateDoc, doc,
} from 'firebase/firestore'
import { db } from './config'

function ok(data)  { return { success: true,  data,  error: null } }
function fail(err) { return { success: false, data: null, error: err?.message ?? String(err) } }

async function batchDelete(docs) {
  for (let i = 0; i < docs.length; i += 499) {
    const batch = writeBatch(db)
    docs.slice(i, i + 499).forEach(d => batch.delete(d.ref))
    await batch.commit()
  }
}

export async function getStorageUsage() {
  try {
    const [c, b, s] = await Promise.all([
      getCountFromServer(collection(db, 'campaigns')),
      getCountFromServer(collection(db, 'billboards')),
      getCountFromServer(collection(db, 'scans')),
    ])
    return ok({ campaigns: c.data().count, billboards: b.data().count, scans: s.data().count })
  } catch (e) { return fail(e) }
}

export async function exportAllData() {
  try {
    const [campSnap, bbSnap, scansSnap] = await Promise.all([
      getDocs(collection(db, 'campaigns')),
      getDocs(collection(db, 'billboards')),
      getDocs(collection(db, 'scans')),
    ])
    return ok({
      exportedAt: new Date().toISOString(),
      campaigns:  campSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      billboards: bbSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      scans:      scansSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    })
  } catch (e) { return fail(e) }
}

export async function deleteTestScans() {
  try {
    const snap = await getDocs(collection(db, 'scans'))
    const test = snap.docs.filter(d => {
      const ua = (d.data().userAgent ?? '').toLowerCase()
      return ua.includes('simulated') || ua.includes('test-agent')
    })
    await batchDelete(test)
    return ok({ deleted: test.length })
  } catch (e) { return fail(e) }
}

export async function resetCounters() {
  try {
    const [bbSnap, campSnap] = await Promise.all([
      getDocs(collection(db, 'billboards')),
      getDocs(collection(db, 'campaigns')),
    ])
    const allDocs = [...bbSnap.docs, ...campSnap.docs]
    for (let i = 0; i < allDocs.length; i += 499) {
      const batch = writeBatch(db)
      allDocs.slice(i, i + 499).forEach(d => batch.update(d.ref, { totalScans: 0 }))
      await batch.commit()
    }
    return ok({ billboards: bbSnap.size, campaigns: campSnap.size })
  } catch (e) { return fail(e) }
}

export async function deleteAllData(onProgress) {
  try {
    for (const col of ['scans', 'billboards', 'campaigns']) {
      const snap = await getDocs(collection(db, col))
      onProgress?.(`Deleting ${snap.size} ${col}…`)
      await batchDelete(snap.docs)
    }
    return ok(true)
  } catch (e) { return fail(e) }
}
