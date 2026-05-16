import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc,
  getDocs, query, orderBy, onSnapshot,
  serverTimestamp, increment,
} from 'firebase/firestore'
import { db, auth } from './config'

const COL          = 'billboards'
const CAMPAIGNS_COL = 'campaigns'

function toResult(data) { return { success: true,  data,  error: null } }
function toError(err)   { return { success: false, data: null, error: err?.message ?? String(err) } }

// All filtering is done client-side to avoid composite-index requirements.
function buildQuery(filters = {}) {
  const field = {
    newest:    ['createdAt',    'desc'],
    oldest:    ['createdAt',    'asc'],
    name:      ['locationName', 'asc'],
    mostScans: ['totalScans',   'desc'],
  }[filters.sortBy] ?? ['createdAt', 'desc']

  return query(collection(db, COL), orderBy(...field))
}

function shapeDocs(snapshot) {
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

function applyClientFilters(results, filters) {
  let items = results

  if (filters.campaignId) {
    items = items.filter(b => b.campaignId === filters.campaignId)
  }
  if (filters.city && filters.city !== 'all') {
    items = items.filter(b => b.city?.toLowerCase() === filters.city.toLowerCase())
  }
  if (filters.isActive !== undefined && filters.isActive !== 'all') {
    const want = filters.isActive === true || filters.isActive === 'true' || filters.isActive === 'active'
    items = items.filter(b => b.isActive === want)
  }
  if (filters.search) {
    const q = filters.search.toLowerCase()
    items = items.filter(b =>
      b.locationName?.toLowerCase().includes(q) ||
      b.city?.toLowerCase().includes(q)
    )
  }

  return items
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createBillboard(data) {
  try {
    // Create doc first so we have the auto-generated ID for the QR URL
    const ref = await addDoc(collection(db, COL), {
      campaignId:   data.campaignId,
      locationName: data.locationName.trim(),
      city:         data.city.trim(),
      coordinates:  data.coordinates ?? null,
      qrCodeUrl:    '',
      totalScans:   0,
      isActive:     data.isActive ?? true,
      createdBy:    auth.currentUser?.uid ?? '',
      createdAt:    serverTimestamp(),
      updatedAt:    serverTimestamp(),
    })

    const baseUrl   = import.meta.env.VITE_APP_URL || window.location.origin
    const qrCodeUrl = `${baseUrl}/scan/${ref.id}`
    await updateDoc(ref, { qrCodeUrl })

    await updateDoc(doc(db, CAMPAIGNS_COL, data.campaignId), {
      totalBillboards: increment(1),
      updatedAt:       serverTimestamp(),
    })

    return toResult({ id: ref.id })
  } catch (err) {
    return toError(err)
  }
}

export async function updateBillboard(id, updates, oldCampaignId) {
  try {
    const campaignChanged = updates.campaignId && updates.campaignId !== oldCampaignId

    if (campaignChanged && oldCampaignId) {
      await updateDoc(doc(db, CAMPAIGNS_COL, oldCampaignId), {
        totalBillboards: increment(-1),
        updatedAt:       serverTimestamp(),
      })
      await updateDoc(doc(db, CAMPAIGNS_COL, updates.campaignId), {
        totalBillboards: increment(1),
        updatedAt:       serverTimestamp(),
      })
    }

    await updateDoc(doc(db, COL, id), {
      ...updates,
      updatedAt: serverTimestamp(),
    })

    return toResult(null)
  } catch (err) {
    return toError(err)
  }
}

export async function deleteBillboard(id, billboard) {
  try {
    // Use provided data to avoid an extra read; fall back to fetching if needed
    let totalScans = billboard?.totalScans
    let campaignId = billboard?.campaignId

    if (totalScans === undefined || campaignId === undefined) {
      const snap = await getDoc(doc(db, COL, id))
      const d = snap.data() ?? {}
      totalScans = d.totalScans ?? 0
      campaignId = d.campaignId
    }

    if (totalScans > 0) {
      return {
        success: false,
        data:    null,
        error:   `Cannot delete — this billboard has ${totalScans} scan${totalScans > 1 ? 's' : ''}. All scan data would be lost.`,
      }
    }

    await deleteDoc(doc(db, COL, id))

    if (campaignId) {
      await updateDoc(doc(db, CAMPAIGNS_COL, campaignId), {
        totalBillboards: increment(-1),
        updatedAt:       serverTimestamp(),
      })
    }

    return toResult(null)
  } catch (err) {
    return toError(err)
  }
}

export async function getBillboards(filters = {}) {
  try {
    const snapshot = await getDocs(buildQuery(filters))
    return toResult(applyClientFilters(shapeDocs(snapshot), filters))
  } catch (err) {
    return toError(err)
  }
}

export function subscribeToBillboards(callback, filters = {}) {
  return onSnapshot(
    buildQuery(filters),
    (snapshot) => {
      callback({ success: true, data: applyClientFilters(shapeDocs(snapshot), filters), error: null })
    },
    (err) => {
      callback({ success: false, data: [], error: err?.message ?? String(err) })
    }
  )
}

// ── Migration helper ──────────────────────────────────────────────────────────
// Call from browser console: import('/src/firebase/billboards.js').then(m => m.migrateOldQrUrls())
export async function migrateOldQrUrls() {
  const baseUrl  = import.meta.env.VITE_APP_URL || window.location.origin
  const snapshot = await getDocs(collection(db, COL))
  let updated = 0

  for (const d of snapshot.docs) {
    const current = d.data().qrCodeUrl ?? ''
    const correct = `${baseUrl}/scan/${d.id}`
    if (current !== correct) {
      await updateDoc(doc(db, COL, d.id), { qrCodeUrl: correct, updatedAt: serverTimestamp() })
      updated++
    }
  }

  return { total: snapshot.size, updated }
}
