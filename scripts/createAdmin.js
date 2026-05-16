/**
 * Creates a new admin user in Firebase Auth + Firestore.
 *
 * Usage:
 *   node --env-file=.env.local scripts/createAdmin.js <email> <password>
 */

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
}

const [newEmail, newPassword] = process.argv.slice(2)

if (!newEmail || !newPassword) {
  console.error('Usage: node --env-file=.env.local scripts/createAdmin.js <email> <password>')
  process.exit(1)
}

// Primary app — signs in as existing admin for Firestore write access
const primaryApp = initializeApp(firebaseConfig, 'primary')
const primaryAuth = getAuth(primaryApp)
const db = getFirestore(primaryApp)

// Secondary app — creates the new user without touching the primary session
const secondaryApp = initializeApp(firebaseConfig, 'secondary')
const secondaryAuth = getAuth(secondaryApp)

async function run() {
  console.log('\n🔐  Signing in as existing admin...')
  await signInWithEmailAndPassword(
    primaryAuth,
    process.env.SEED_ADMIN_EMAIL,
    process.env.SEED_ADMIN_PASSWORD,
  )
  console.log('✓  Authenticated')

  console.log(`\n👤  Creating Firebase Auth account for ${newEmail}...`)
  const { user } = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword)
  console.log(`✓  Auth account created (uid: ${user.uid})`)

  console.log('\n📝  Writing Firestore user document...')
  await setDoc(doc(db, 'users', user.uid), {
    email:       newEmail.toLowerCase().trim(),
    displayName: newEmail.split('@')[0],
    role:        'admin',
    status:      'active',
    createdAt:   serverTimestamp(),
    lastLogin:   null,
  })
  console.log('✓  Firestore document created')

  console.log(`\n✅  Admin created successfully!`)
  console.log(`   email:    ${newEmail}`)
  console.log(`   password: ${newPassword}`)
  console.log(`   uid:      ${user.uid}\n`)
}

run().catch(err => {
  console.error('\n❌  Failed:', err.message)
  process.exit(1)
})
