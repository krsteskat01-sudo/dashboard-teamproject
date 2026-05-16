import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore'
import {
  EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile,
} from 'firebase/auth'
import { db, auth } from './config'

function ok(data)  { return { success: true,  data,  error: null } }
function fail(err) {
  const AUTH_MSGS = {
    'auth/wrong-password':    'Current password is incorrect',
    'auth/invalid-credential':'Current password is incorrect',
    'auth/too-many-requests': 'Too many attempts — try again later',
    'auth/weak-password':     'New password is too weak (min 6 chars)',
    'auth/requires-recent-login': 'Session expired — please sign out and back in',
  }
  const msg = AUTH_MSGS[err?.code] ?? err?.message ?? String(err)
  return { success: false, data: null, error: msg }
}

export async function getAllUsers() {
  try {
    const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
    return ok(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  } catch (e) { return fail(e) }
}

export async function getUserById(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    return ok(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  } catch (e) { return fail(e) }
}

export async function updateUserProfile(uid, updates) {
  try {
    await updateDoc(doc(db, 'users', uid), { ...updates, updatedAt: serverTimestamp() })
    if (updates.displayName && auth.currentUser?.uid === uid) {
      await updateProfile(auth.currentUser, { displayName: updates.displayName })
    }
    return ok(true)
  } catch (e) { return fail(e) }
}

export async function updateUserRole(uid, role) {
  try {
    await updateDoc(doc(db, 'users', uid), { role, updatedAt: serverTimestamp() })
    return ok(true)
  } catch (e) { return fail(e) }
}

// Creates a pending user document. Actual Firebase Auth account must be created separately.
export async function inviteUser(email, role) {
  try {
    const id = `pending_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`
    await setDoc(doc(db, 'users', id), {
      email:       email.toLowerCase().trim(),
      role,
      status:      'pending',
      displayName: email.split('@')[0],
      createdAt:   serverTimestamp(),
      lastLogin:   null,
    })
    return ok({ id })
  } catch (e) { return fail(e) }
}

export async function deleteUser(uid) {
  try {
    await deleteDoc(doc(db, 'users', uid))
    return ok(true)
  } catch (e) { return fail(e) }
}

export async function changePassword(currentPassword, newPassword) {
  try {
    const user = auth.currentUser
    if (!user) throw new Error('Not authenticated')
    const credential = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, credential)
    await updatePassword(user, newPassword)
    return ok(true)
  } catch (e) { return fail(e) }
}
