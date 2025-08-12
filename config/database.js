const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nomadpal_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

const pool = mysql.createPool(dbConfig);

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

const initializeDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(24) PRIMARY KEY,
        email VARCHAR(191) NOT NULL UNIQUE,
        password_hash VARCHAR(191) NOT NULL,
        display_name VARCHAR(128),
        preferred_language VARCHAR(64),
        country_city VARCHAR(128),
        timezone VARCHAR(64),
        passport VARCHAR(128),
        visa_flexibility VARCHAR(128),
        preferred_regions VARCHAR(128),
        job_title VARCHAR(128),
        target_salary_usd DECIMAL(12,2),
        salary_currency CHAR(3) DEFAULT 'USD',
        sources VARCHAR(255),
        work_style VARCHAR(64),
        monthly_budget_min_usd DECIMAL(10,2),
        monthly_budget_max_usd DECIMAL(10,2),
        preferred_climate VARCHAR(64),
        internet_speed_requirement VARCHAR(64),
        lifestyle_priorities JSON,
        newsletter_consent BOOLEAN DEFAULT FALSE,
        research_consent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    connection.release();
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  testConnection,
  initializeDatabase
};
