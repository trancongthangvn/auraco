const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

/**
 * Run a parameterized query.
 * @param {string} text - SQL text with $1, $2, ... placeholders
 * @param {Array} params - query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
