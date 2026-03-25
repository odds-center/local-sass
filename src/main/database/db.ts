import { AppDataSource } from './data-source'

export async function initDb(): Promise<void> {
  await AppDataSource.initialize()
  console.log('[DB] TypeORM connected and schema synced')
}
