import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

let pool: pkg.Pool;

export async function initializeDatabase(): Promise<pkg.Pool> {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    client.release();

    // Run migrations
    await runMigrations(pool);

    return pool;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}

async function runMigrations(pool: pkg.Pool) {
  const migrations = [
    `
      CREATE TABLE IF NOT EXISTS workspace_tokens (
        workspace_id VARCHAR(255) PRIMARY KEY,
        access_token TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        workspace_id VARCHAR(255) NOT NULL,
        channel VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        ts BIGINT NOT NULL,
        thread_ts BIGINT,
        embeddings VECTOR(1536),
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (workspace_id) REFERENCES workspace_tokens(workspace_id)
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS anomalies (
        id VARCHAR(255) PRIMARY KEY,
        workspace_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        confidence DECIMAL(3,2) NOT NULL,
        channel VARCHAR(255) NOT NULL,
        message_ids TEXT[] NOT NULL,
        context JSONB,
        flagged BOOLEAN DEFAULT FALSE,
        feedback TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (workspace_id) REFERENCES workspace_tokens(workspace_id)
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS patterns (
        id VARCHAR(255) PRIMARY KEY,
        workspace_id VARCHAR(255) NOT NULL,
        keywords TEXT[] NOT NULL,
        channels TEXT[] NOT NULL,
        frequency INT DEFAULT 1,
        last_seen TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (workspace_id) REFERENCES workspace_tokens(workspace_id)
      );
    `,
    `
      CREATE TABLE IF NOT EXISTS user_feedback (
        id VARCHAR(255) PRIMARY KEY,
        workspace_id VARCHAR(255) NOT NULL,
        anomaly_id VARCHAR(255) NOT NULL,
        is_relevant BOOLEAN NOT NULL,
        feedback_text TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (workspace_id) REFERENCES workspace_tokens(workspace_id),
        FOREIGN KEY (anomaly_id) REFERENCES anomalies(id)
      );
    `,
  ];

  try {
    for (const migration of migrations) {
      await pool.query(migration);
    }
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

export async function getDatabase(): Promise<pkg.Pool> {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  return pool;
}
