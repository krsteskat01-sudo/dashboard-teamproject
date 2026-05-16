/**
 * Firestore cleanup script — deletes all documents from campaigns, billboards, and scans.
 * The users collection is intentionally skipped to preserve admin accounts.
 *
 * Requirements:
 *   - Node.js 20.6+ (uses --env-file flag to load .env.local)
 *   - .env.local must contain VITE_FIREBASE_* variables
 *   - .env.local must contain SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD
 *
 * Run:
 *   npm run cleanup
 */

import readline from 'readline'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore'

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
  console.error('❌  SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env.local')
  process.exit(1)
}

const COLLECTIONS_TO_DELETE = ['campaigns', 'billboards', 'scans']
const BATCH_SIZE = 500

// ── Helpers ──────────────────────────────────────────────────────────────────

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer)
    })
  })
}

async function deleteCollection(db, collectionName) {
  const snap = await getDocs(collection(db, collectionName))

  if (snap.empty) {
    console.log(`  ⚪  ${collectionName}: empty, nothing to delete`)
    return 0
  }

  const docs = snap.docs
  let deleted = 0
  let batchNum = 0

  while (deleted < docs.length) {
    const chunk = docs.slice(deleted, deleted + BATCH_SIZE)
    const batch = writeBatch(db)
    chunk.forEach(d => batch.delete(d.ref))
    await batch.commit()
    deleted += chunk.length
    batchNum++
    console.log(`  ✓ ${collectionName}: deleted ${deleted}/${docs.length} (batch ${batchNum})`)
  }

  return deleted
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function cleanup() {
  console.log('\n⚠️   This will delete ALL data from campaigns, billboards, and scans collections')
  console.log('    The users collection will NOT be touched.\n')

  const answer = await prompt('Type DELETE to confirm: ')

  if (answer.trim() !== 'DELETE') {
    console.log('\n🚫  Aborted — nothing was deleted.')
    process.exit(0)
  }

  console.log('\n🔐  Signing in...')
  const app  = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db   = getFirestore(app)

  await signInWithEmailAndPassword(auth, SEED_EMAIL, SEED_PASSWORD)
  console.log('✓  Authenticated\n')

  let totalDeleted = 0

  for (const name of COLLECTIONS_TO_DELETE) {
    console.log(`🗑️   Deleting ${name}...`)
    const count = await deleteCollection(db, name)
    totalDeleted += count
  }

  console.log(`\n✅  Cleanup complete! Deleted ${totalDeleted} documents total.`)
  console.log()
}

cleanup().catch(err => {
  console.error('\n❌  Cleanup failed:', err.message)
  process.exit(1)
})
