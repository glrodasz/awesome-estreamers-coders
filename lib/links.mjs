/** @typedef {{ label: string, url: string }} Link */

function isUrl(value) {
  return /^https?:\/\//i.test(value)
}

/** @param {string} identifier */
export function buildYouTubeUrl(identifier) {
  if (isUrl(identifier)) return identifier
  return `https://www.youtube.com/${identifier}`
}

/** @param {string} login */
export function buildTwitchUrl(login) {
  if (isUrl(login)) return login
  return `https://www.twitch.tv/${login}`
}

/** @param {string} slug */
export function buildKickUrl(slug) {
  if (isUrl(slug)) return slug
  return `https://kick.com/${slug}`
}

/** @param {string} handle */
export function buildTwitterUrl(handle) {
  if (isUrl(handle)) return handle
  return `https://twitter.com/${handle.replace(/^@/, '')}`
}

/** @param {string} handle */
export function buildFacebookUrl(handle) {
  if (isUrl(handle)) return handle
  return `https://www.facebook.com/${handle}`
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
 * @param {{ website?: string, youtube?: string, twitch?: string, kick?: string, twitter?: string, facebook?: string, otherLinks?: Link[] }} person
 * @returns {Link[]}
 */
export function buildLinks(person) {
  const links = []

  if (person.website) {
    links.push({ label: 'Sitio web', url: person.website })
  }

  if (person.youtube) {
    links.push({ label: 'YouTube', url: buildYouTubeUrl(person.youtube) })
  }

  if (person.twitch) {
    links.push({ label: 'Twitch', url: buildTwitchUrl(person.twitch) })
  }

  if (person.kick) {
    links.push({ label: 'Kick', url: buildKickUrl(person.kick) })
  }

  if (person.twitter) {
    links.push({ label: 'Twitter', url: buildTwitterUrl(person.twitter) })
  }

  if (person.facebook) {
    links.push({ label: 'Facebook', url: buildFacebookUrl(person.facebook) })
  }

  if (Array.isArray(person.otherLinks)) {
    links.push(...person.otherLinks)
  }

  return links
}
