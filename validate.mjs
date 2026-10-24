import fs from 'fs'
import { parse } from 'yaml'
import { DISCOVER_FILE, STREAMERS_FILE, validateDiscover, validateStreamers } from './lib/data.mjs'

function check(file, validate) {
  let content
  try {
    content = parse(fs.readFileSync(file, 'utf-8'))
  } catch (error) {
    console.error(`❌ ${file} no es YAML válido:\n${error.message}`)
    process.exit(1)
  }

  const errors = validate(content)
  if (errors.length) {
    console.error(`❌ ${file} tiene ${errors.length} problema(s):\n- ${errors.join('\n- ')}`)
    process.exit(1)
  }
  return content
}

const list = check(STREAMERS_FILE, validateStreamers)
console.log(`✅ ${STREAMERS_FILE} es válido (${list.length} streamers)`)
check(DISCOVER_FILE, validateDiscover)
console.log(`✅ ${DISCOVER_FILE} es válido`)
