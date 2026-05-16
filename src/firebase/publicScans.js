import {
  collection, doc, getDoc, addDoc,
  updateDoc, serverTimestamp, increment,
} from 'firebase/firestore'
import { db } from './config'

const SCANS_COL     = 'scans'
const BILLBOARDS_COL = 'billboards'
const CAMPAIGNS_COL  = 'campaigns'

/**
 * Records a QR scan for a billboard.
 * Safe to call without auth — uses public Firestore rules.
 * Always returns { success, error? } so the caller can decide what to show.
 *
 * @param {string} billboardId
 * @param {{ device, platform, userAgent, referrer }} metadata
 */
export async function recordPublicScan(billboardId, metadata) {
  try {
    const billboardRef  = doc(db, BILLBOARDS_COL, billboardId)
    const billboardSnap = await getDoc(billboardRef)

    if (!billboardSnap.exists()) {
      return { success: false, error: 'Billboard not found' }
    }

    const billboard = billboardSnap.data()

    // Inactive billboards: skip recording but don't block the redirect
    if (billboard.isActive === false) {
      return { success: false, error: 'Billboard inactive' }
    }

    const campaignId = billboard.campaignId ?? null

    // Write scan document
    await addDoc(collection(db, SCANS_COL), {
      billboardId,
      campaignId,
      timestamp: serverTimestamp(),
      device:    metadata.device,
      platform:  metadata.platform,
      userAgent: metadata.userAgent,
      referrer:  metadata.referrer,
    })

    // Increment counters
    await updateDoc(billboardRef, {
      totalScans: increment(1),
      updatedAt:  serverTimestamp(),
    })

    if (campaignId) {
      await updateDoc(doc(db, CAMPAIGNS_COL, campaignId), {
        totalScans: increment(1),
        updatedAt:  serverTimestamp(),
      })
    }

    return { success: true }
  } catch (err) {
    console.error('[scan] Failed to record scan:', err)
    return { success: false, error: err?.message ?? String(err) }
  }
}
