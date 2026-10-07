/** @typedef {{ type: string, label: string, url: string }} Link */

function isUrl(value) {
  return /^https?:\/\//i.test(value)
}

/** Links that accept a bare handle; any other key must be a full URL. */
const HANDLE_BUILDERS = {
  youtube: (id) => `https://www.youtube.com/${id}`,
  twitch: (login) => `https://www.twitch.tv/${login}`,
  kick: (slug) => `https://kick.com/${slug}`,
  twitter: (handle) => `https://twitter.com/${handle.replace(/^@/, '')}`,
  x: (handle) => `https://x.com/${handle.replace(/^@/, '')}`,
  facebook: (handle) => `https://www.facebook.com/${handle}`,
  github: (handle) => `https://github.com/${handle.replace(/^@/, '')}`,
}

const LABELS = {
  website: 'Sitio web',
  youtube: 'YouTube',
  twitch: 'Twitch',
  kick: 'Kick',
  twitter: 'Twitter',
  x: 'X',
  facebook: 'Facebook',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  bluesky: 'Bluesky',
}

/** @param {string} key */
export function acceptsHandle(key) {
  return key in HANDLE_BUILDERS
}

/** @param {string} key */
export function linkLabel(key) {
  return LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
}

/**
 * @param {string} key  Link type from streamers.yml, e.g. "twitch"
 * @param {string} value  Handle or full URL
 */
export function buildUrl(key, value) {
  if (isUrl(value)) return value
  return HANDLE_BUILDERS[key]?.(value) ?? value
}

/**
 * Extracts the channel name from a bare handle or a full profile URL,
 * e.g. "https://www.twitch.tv/foo" → "foo".
 * @param {string} value
 */
export function channelHandle(value) {
  if (!isUrl(value)) return value.replace(/^@/, '').toLowerCase()
  const segments = new URL(value).pathname.split('/').filter(Boolean)
  return (segments.at(-1) ?? '').toLowerCase()
}

/**
 * Links in the order they appear in streamers.yml.
 * @param {{ links: Record<string, string> }} person
 * @returns {Link[]}
 */
export function buildLinks(person) {
  return Object.entries(person.links).map(([key, value]) => ({
    type: key,
    label: linkLabel(key),
    url: buildUrl(key, value),
  }))
}

export { isUrl }
