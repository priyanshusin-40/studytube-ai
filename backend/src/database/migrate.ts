import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/database.js';

const migrationUrl = new URL('./migrations/001_initial.sql', import.meta.url);

try {
  const sql = await readFile(fileURLToPath(migrationUrl), 'utf8');
  await pool.query(sql);
  console.log('Database migration completed.');
} catch (error) {
  console.error('Database migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
