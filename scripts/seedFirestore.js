/**
 * Firestore seed script — populates campaigns, billboards, and scans.
 *
 * Requirements:
 *   - Node.js 20.6+ (uses --env-file flag to load .env)
 *   - .env must contain VITE_FIREBASE_* variables
 *   - .env must contain SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD
 *     (a Firebase Auth user with Firestore write access)
 *
 * Run:
 *   npm run seed
 */

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, collection, doc, writeBatch, Timestamp } from 'firebase/firestore'

// ── Config ───────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
}

const SEED_EMAIL    = process.env.SEED_ADMIN_EMAIL
const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD

if (!SEED_EMAIL || !SEED_PASSWORD) {
  console.error('❌  SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env')
  process.exit(1)
}

const app  = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db   = getFirestore(app)

// ── Seed data ────────────────────────────────────────────────────────────────

const CAMPAIGNS = [
  { name: 'Summer Refresh 2025',  status: 'active',   daysAgo: 14  },
  { name: 'Back to School',       status: 'active',   daysAgo: 7   },
  { name: 'City Nights',          status: 'ended',    daysAgo: 60  },
  { name: 'Winter Warmup',        status: 'upcoming', daysAgo: -14 },
  { name: 'Brand Awareness Q2',   status: 'active',   daysAgo: 21  },
]

const LOCATIONS = [
  'Skopje Centar', 'GTC Mall',      'City Mall',     'Vero Centar',
  'Aerodrom',      'Kisela Voda',   'Bit Pazar',     'Kapistec',
  'Karpoš',        'Gazi Baba',     'Čair',          'Šuto Orizari',
  'Butel',         'Saraj',         'Lisice',        'Novo Maalo',
  'Krnjevo',       'Čento',
]

const PLATFORMS = ['instagram', 'instagram', 'instagram', 'instagram',
                   'tiktok', 'tiktok', 'tiktok',
                   'web', 'web', 'web',
                   'other']

const DEVICES = ['mobile', 'mobile', 'mobile', 'mobile', 'mobile',
                 'mobile', 'mobile', 'mobile',
                 'desktop', 'desktop',
                 'tablet']

// Hourly scan weight — realistic daily pattern peaking at 19:00
const HOUR_WEIGHTS = [
  2, 1, 1, 1, 1, 3, 7, 14, 20, 26, 32, 36,
  42, 40, 38, 41, 47, 62, 92, 100, 83, 62, 44, 22,
]

// Billboard scan weight (first locations are busier)
const BOARD_WEIGHTS = [
  100, 90, 74, 68, 63, 55, 48, 42, 38, 34,
  30, 26, 22, 19, 16, 13, 10, 8,
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function weightedRandom(weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return weights.length - 1
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function ts(date) {
  return Timestamp.fromDate(date)
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86_400_000)
}

async function flushBatch(batch, label) {
  await batch.commit()
  console.log(`  ✓ ${label}`)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🔐  Signing in...')
  await signInWithEmailAndPassword(auth, SEED_EMAIL, SEED_PASSWORD)
  console.log('✓  Authenticated')

  // ── Campaigns ──────────────────────────────────────────────────────────────
  console.log('\n📋  Creating campaigns...')
  const campaignIds = []
  const batch0 = writeBatch(db)

  for (const c of CAMPAIGNS) {
    const ref = doc(collection(db, 'campaigns'))
    campaignIds.push(ref.id)
    const startDate = daysAgo(c.daysAgo)
    batch0.set(ref, {
      name:        c.name,
      status:      c.status,
      startDate:   ts(startDate),
      endDate:     ts(new Date(startDate.getTime() + 90 * 86_400_000)),
      totalScans:  0,
      createdAt:   ts(new Date()),
      updatedAt:   ts(new Date()),
    })
  }

  // ── Billboards ─────────────────────────────────────────────────────────────
  console.log('📍  Creating 18 billboards...')
  const billboardIds = []
  const campaignAssignment = [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 4]

  for (let i = 0; i < 18; i++) {
    const ref = doc(collection(db, 'billboards'))
    billboardIds.push(ref.id)
    batch0.set(ref, {
      campaignId:   campaignIds[campaignAssignment[i]],
      locationName: LOCATIONS[i],
      city:         'Skopje',
      totalScans:   0,
      createdAt:    ts(new Date()),
    })
  }

  await flushBatch(batch0, 'campaigns + billboards')

  // ── Scans (2000 total in 4 batches of 500) ─────────────────────────────────
  console.log('\n⚡  Seeding 2000 scans...')

  const scanCounts  = {}
  const campaignTotals = {}
  billboardIds.forEach(id => { scanCounts[id] = 0 })
  campaignIds.forEach(id => { campaignTotals[id] = 0 })

  const TOTAL_SCANS = 2000
  const BATCH_SIZE  = 500

  for (let batch = 0; batch < TOTAL_SCANS / BATCH_SIZE; batch++) {
    const wb = writeBatch(db)

    for (let i = 0; i < BATCH_SIZE; i++) {
      const boardIdx  = weightedRandom(BOARD_WEIGHTS)
      const billboardId  = billboardIds[boardIdx]
      const campaignIdx  = campaignAssignment[boardIdx]
      const campaignId   = campaignIds[campaignIdx]

      const hour   = weightedRandom(HOUR_WEIGHTS)
      const minute = Math.floor(Math.random() * 60)
      const second = Math.floor(Math.random() * 60)
      const dayOffset = Math.floor(Math.random() * 30)

      const scanDate = new Date(
        Date.now()
          - dayOffset * 86_400_000
          - (new Date().getHours() - hour) * 3_600_000
          - minute * 60_000
          - second * 1_000
      )

      const ref = doc(collection(db, 'scans'))
      wb.set(ref, {
        billboardId,
        campaignId,
        platform:  pick(PLATFORMS),
        device:    pick(DEVICES),
        timestamp: ts(scanDate),
      })

      scanCounts[billboardId]++
      campaignTotals[campaignId]++
    }

    await flushBatch(wb, `scans batch ${batch + 1}/${TOTAL_SCANS / BATCH_SIZE}`)
  }

  // ── Update totalScans on billboards + campaigns ────────────────────────────
  console.log('\n🔄  Updating totals...')
  const batchFinal = writeBatch(db)

  billboardIds.forEach(id => {
    batchFinal.update(doc(db, 'billboards', id), { totalScans: scanCounts[id] })
  })
  campaignIds.forEach(id => {
    batchFinal.update(doc(db, 'campaigns', id), {
      totalScans: campaignTotals[id],
      updatedAt:  ts(new Date()),
    })
  })

  await flushBatch(batchFinal, 'totalScans updated on all billboards + campaigns')

  console.log('\n✅  Seed complete!')
  console.log(`   campaigns:  ${CAMPAIGNS.length}`)
  console.log(`   billboards: ${billboardIds.length}`)
  console.log(`   scans:      ${TOTAL_SCANS}`)
  console.log()
}

seed().catch(err => {
  console.error('\n❌  Seed failed:', err.message)
  process.exit(1)
})
