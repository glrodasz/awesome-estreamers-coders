import fs from 'fs'
import { parse } from 'yaml'
import { STREAMERS_FILE, validateStreamers } from './lib/data.mjs'

let list
try {
  list = parse(fs.readFileSync(STREAMERS_FILE, 'utf-8'))
} catch (error) {
  console.error(`❌ ${STREAMERS_FILE} no es YAML válido:\n${error.message}`)
  process.exit(1)
}

const errors = validateStreamers(list)
if (errors.length) {
  console.error(`❌ ${STREAMERS_FILE} tiene ${errors.length} problema(s):\n- ${errors.join('\n- ')}`)
  process.exit(1)
}
console.log(`✅ ${STREAMERS_FILE} es válido (${list.length} streamers)`)
