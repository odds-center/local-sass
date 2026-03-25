import 'dotenv/config'
import 'reflect-metadata'
import { initDb } from './database/db'
import { startServer } from './server'

async function main() {
  await initDb()
  await startServer()
}

main().catch((err) => {
  console.error('[Standalone] Fatal error:', err)
  process.exit(1)
})
