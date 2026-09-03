import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/database.js';

const compiledDirectory = fileURLToPath(new URL('./migrations/', import.meta.url));
const sourceDirectory = fileURLToPath(new URL('../../src/database/migrations/', import.meta.url));
const migrationsDirectory = existsSync(compiledDirectory) ? compiledDirectory : sourceDirectory;

try {
  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
  for (const file of files) {
    const sql = await readFile(join(migrationsDirectory, file), 'utf8');
    await pool.query(sql);
    console.log(`Applied migration ${file}.`);
  }
  console.log(`Database migration completed (${files.length} files).`);
} catch (error) {
  console.error('Database migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
