const { initializeDatabase, testConnection } = require('./config/database.js');

const initDB = async () => {
  try {
    console.log('🔌 Testing database connection...');
    await testConnection();
    
    console.log('📊 Initializing database tables...');
    await initializeDatabase();
    
    console.log('🎉 Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Database initialization failed:', error.message);
    process.exit(1);
  }
};

initDB();
