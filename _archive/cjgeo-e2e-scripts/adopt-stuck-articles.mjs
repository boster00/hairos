/**
 * One-time repair: POST dev-repair-adopts (runs inside Next so @/ imports resolve).
 *
 *   npm run dev
 *   node scripts/adopt-stuck-articles.mjs
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envLocal = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });

const BASE = process.env.ADOPT_REPAIR_BASE || 'http://localhost:3000';

const res = await fetch(`${BASE}/api/content-magic/dev-repair-adopts`, { method: 'POST' });
const json = await res.json().catch(() => ({}));
console.log(res.status, JSON.stringify(json, null, 2));
if (!res.ok) process.exit(1);
