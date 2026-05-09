import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('\n❌ ERROR: DATABASE_URL is not defined!');
  console.error('   Please add DATABASE_URL to your environment variables.\n');
  // In development, we might not want to exit, but in production we must.
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const sql = postgres(connectionString || 'postgres://localhost:5432/postgres', {
  ssl: connectionString?.includes('neon.tech') ? 'require' : false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export default sql;
