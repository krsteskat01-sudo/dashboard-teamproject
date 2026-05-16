import { UAParser } from 'ua-parser-js'

// Returns standardised scan metadata from the browser environment.
export function getScanMetadata() {
  const parser  = new UAParser(navigator.userAgent)
  const result  = parser.getResult()

  // Determine device category
  const deviceType = result.device?.type
  let device = 'desktop'
  if (deviceType === 'mobile')  device = 'mobile'
  if (deviceType === 'tablet')  device = 'tablet'

  // Detect social / in-app browser platform
  const ua = navigator.userAgent.toLowerCase()
  let platform = 'web'
  if (ua.includes('instagram'))       platform = 'instagram'
  else if (ua.includes('tiktok'))     platform = 'tiktok'
  else if (ua.includes('fban') || ua.includes('fbav') || ua.includes('facebookexternalhit'))
                                       platform = 'facebook'
  else if (ua.includes('twitter') || ua.includes('twitterbot'))
                                       platform = 'twitter'

  return {
    device,
    platform,
    userAgent: navigator.userAgent.slice(0, 200),
    referrer:  document.referrer || 'direct',
  }
}
