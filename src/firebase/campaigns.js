import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, where, orderBy, onSnapshot,
  serverTimestamp, getCountFromServer,
} from 'firebase/firestore'
import { db, auth } from './config'

const COL = 'campaigns'

function toResult(data)  { return { success: true,  data,  error: null } }
function toError(err)    { return { success: false, data: null, error: err?.message ?? String(err) } }

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildQuery(filters = {}) {
  const constraints = []

  if (filters.status && filters.status !== 'all') {
    constraints.push(where('status', '==', filters.status))
  }

  // sortBy
  const field = {
    newest:     ['createdAt', 'desc'],
    oldest:     ['createdAt', 'asc'],
    name:       ['name',      'asc'],
    mostScans:  ['totalScans','desc'],
  }[filters.sortBy] ?? ['createdAt', 'desc']

  constraints.push(orderBy(...field))

  return query(collection(db, COL), ...constraints)
}

function shapeDocs(snapshot) {
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function createCampaign(data) {
  try {
    const ref = await addDoc(collection(db, COL), {
      name:            data.name.trim(),
      description:     data.description?.trim() ?? '',
      status:          data.status,
      startDate:       data.startDate,
      endDate:         data.endDate,
      totalScans:      0,
      totalBillboards: 0,
      createdBy:       auth.currentUser?.uid ?? '',
      createdAt:       serverTimestamp(),
      updatedAt:       serverTimestamp(),
    })
    return toResult({ id: ref.id })
  } catch (err) {
    return toError(err)
  }
}

export async function updateCampaign(id, updates) {
  try {
    await updateDoc(doc(db, COL, id), {
      ...updates,
      updatedAt: serverTimestamp(),
    })
    return toResult(null)
  } catch (err) {
    return toError(err)
  }
}

export async function deleteCampaign(id, totalBillboards) {
  try {
    // Block deletion if campaign still has billboards
    const count = totalBillboards ??
      (await getCountFromServer(
        query(collection(db, 'billboards'), where('campaignId', '==', id))
      )).data().count

    if (count > 0) {
      return {
        success: false,
        data: null,
        error: `Cannot delete — this campaign has ${count} billboard${count > 1 ? 's' : ''}. Delete those first.`,
      }
    }

    await deleteDoc(doc(db, COL, id))
    return toResult(null)
  } catch (err) {
    return toError(err)
  }
}

export async function getCampaigns(filters = {}) {
  try {
    const snapshot = await getDocs(buildQuery(filters))
    let results = shapeDocs(snapshot)

    if (filters.search) {
      const q = filters.search.toLowerCase()
      results = results.filter(c => c.name.toLowerCase().includes(q))
    }

    return toResult(results)
  } catch (err) {
    return toError(err)
  }
}

export function subscribeToCampaigns(callback, filters = {}) {
  const q = buildQuery(filters)

  return onSnapshot(q, (snapshot) => {
    let results = shapeDocs(snapshot)

    if (filters.search) {
      const q2 = filters.search.toLowerCase()
      results = results.filter(c => c.name.toLowerCase().includes(q2))
    }

    callback({ success: true, data: results, error: null })
  }, (err) => {
    callback({ success: false, data: [], error: err?.message ?? String(err) })
  })
}
