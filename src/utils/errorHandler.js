const ERROR_MESSAGES = {
  'permission-denied':   "You don't have permission to access this data.",
  'unavailable':         'Service is temporarily unavailable. Please try again.',
  'unauthenticated':     'You must be signed in to access this data.',
  'not-found':           'The requested data could not be found.',
  'failed-precondition': 'A required index may be missing. Check the Firestore console.',
  'resource-exhausted':  'Too many requests. Please wait a moment and try again.',
  'cancelled':           'The operation was cancelled.',
  'deadline-exceeded':   'The operation timed out. Please try again.',
  'already-exists':      'The document already exists.',
  'invalid-argument':    'Invalid query or data format.',
  'internal':            'An internal server error occurred.',
  'data-loss':           'Unrecoverable data loss or corruption.',
}

export function getFirestoreErrorMessage(error) {
  if (!error) return 'An unexpected error occurred.'
  const code = error?.code?.replace('firestore/', '') ?? ''
  return ERROR_MESSAGES[code] || error?.message || 'An error occurred while fetching data.'
}
