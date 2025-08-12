const { pool } = require('./config/database');

async function testSimple() {
  try {
    console.log('🔍 Simple database test...');
    
    // Test basic connection
    const [result] = await pool.execute('SELECT 1 as test');
    console.log('✅ Database connection works:', result[0]);
    
    // Check if cities table exists
    const [tables] = await pool.execute("SHOW TABLES LIKE 'cities'");
    console.log('📋 Cities table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      // Try to get count
      const [count] = await pool.execute('SELECT COUNT(*) as total FROM cities');
      console.log('📊 Cities count:', count[0].total);
      
      // Try to get one city
      const [cities] = await pool.execute('SELECT id, name, country FROM cities LIMIT 1');
      console.log('🏙️  First city:', cities[0] || 'No cities found');
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testSimple();
