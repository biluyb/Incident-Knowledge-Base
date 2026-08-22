import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const value = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    }
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createAdmin() {
  const name = process.argv[2] || 'Admin';
  const email = process.argv[3] || 'admin@tsehaybank.com';
  const password = process.argv[4] || 'Admin@2026';

  console.log(`Creating admin user: ${email}`);

  try {
    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existing.rows.length > 0) {
      console.log('User already exists. Updating password...');
      const hash = await bcrypt.hash(password, 12);
      await pool.query(
        'UPDATE users SET password_hash = $1, role = $2, status = $3, updated_at = NOW() WHERE LOWER(email) = LOWER($4)',
        [hash, 'admin', 'active', email]
      );
      console.log('Admin user updated successfully.');
    } else {
      const hash = await bcrypt.hash(password, 12);
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [name, email, hash, 'admin', 'active']
      );
      console.log('Admin user created successfully.');
    }

    console.log(`\nLogin credentials:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`\nYou can now login at http://localhost:3000/login`);
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
