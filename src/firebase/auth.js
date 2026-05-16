import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './config'

/**
 * Конвертира Firebase error код во user-friendly порака
 */
const getErrorMessage = (errorCode) => {
  const errorMessages = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Check your connection',
  }
  return errorMessages[errorCode] || 'An unexpected error occurred'
}

/**
 * Login со email и password
 * Враќа: { success, user, error }
 */
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const firebaseUser = userCredential.user

    // Провери дали постои user документ во Firestore
    const userDocRef = doc(db, 'users', firebaseUser.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      // Auto logout - корисникот не е регистриран во системот
      await signOut(auth)
      return {
        success: false,
        error: 'Access denied. User not authorized.',
      }
    }

    const userData = userDoc.data()

    // Провери ULOGA - само admin може да влезе
    if (userData.role !== 'admin') {
      await signOut(auth)
      return {
        success: false,
        error: 'Access denied. Admin privileges required.',
      }
    }

    // Update last login
    await setDoc(
      userDocRef,
      { lastLogin: serverTimestamp() },
      { merge: true }
    )

    return {
      success: true,
      user: {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: userData.displayName || firebaseUser.email,
        role: userData.role,
      },
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      error: getErrorMessage(error.code),
    }
  }
}

/**
 * Logout
 */
export const logoutUser = async () => {
  try {
    await signOut(auth)
    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    return {
      success: false,
      error: 'Failed to logout',
    }
  }
}

/**
 * Listener за auth state промени
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        // Земи Firestore user data
        const userDocRef = doc(db, 'users', firebaseUser.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          
          // Провери дали е admin
          if (userData.role === 'admin') {
            callback({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: userData.displayName || firebaseUser.email,
              role: userData.role,
            })
          } else {
            // Не е admin - logout
            await signOut(auth)
            callback(null)
          }
        } else {
          // Нема user документ - logout
          await signOut(auth)
          callback(null)
        }
      } catch (error) {
        console.error('Auth state check error:', error)
        callback(null)
      }
    } else {
      callback(null)
    }
  })
}