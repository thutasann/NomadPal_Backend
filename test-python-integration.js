#!/usr/bin/env node

/**
 * Test script to verify Python service integration
 * Run this script to test the connection between Node.js and Python services
 */

const pythonService = require('./services/python.service');

async function testPythonIntegration() {
  console.log('🧪 Testing Python Service Integration');
  console.log('=====================================\n');

  // Test 1: Health Check
  console.log('1️⃣  Testing Python Service Health...');
  try {
    const health = await pythonService.checkHealth();
    if (health.success) {
      console.log('✅ Python service is healthy');
      console.log('   Response:', health.data);
    } else {
      console.log('❌ Python service health check failed');
      console.log('   Error:', health.error);
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
  }
  console.log('');

  // Test 2: Service Availability
  console.log('2️⃣  Testing Service Availability...');
  try {
    const isAvailable = await pythonService.isAvailable();
    console.log(`${isAvailable ? '✅' : '❌'} Service availability: ${isAvailable}`);
  } catch (error) {
    console.log('❌ Availability check error:', error.message);
  }
  console.log('');

  // Test 3: Get Top Cities
  console.log('3️⃣  Testing Get Top Cities...');
  try {
    const result = await pythonService.getTopCities(3);
    if (result.success) {
      console.log('✅ Successfully retrieved top cities');
      console.log(`   Total cities: ${result.total}`);
      result.data.forEach((city, index) => {
        console.log(`   ${index + 1}. ${city.name}, ${city.country} (Score: ${city.predicted_score})`);
      });
    } else {
      console.log('❌ Failed to get top cities');
    }
  } catch (error) {
    console.log('❌ Get top cities error:', error.message);
  }
  console.log('');

  // Test 4: Search Cities
  console.log('4️⃣  Testing Search Cities...');
  try {
    const searchQuery = 'thailand';
    const result = await pythonService.searchCities(searchQuery, 5);
    if (result.success) {
      console.log(`✅ Successfully searched for "${searchQuery}"`);
      console.log(`   Found ${result.total} cities`);
      result.data.forEach((city, index) => {
        console.log(`   ${index + 1}. ${city.name}, ${city.country} (Score: ${city.predicted_score})`);
      });
    } else {
      console.log(`❌ Failed to search for "${searchQuery}"`);
    }
  } catch (error) {
    console.log('❌ Search cities error:', error.message);
  }
  console.log('');

  // Test 5: Get Cities by Country
  console.log('5️⃣  Testing Get Cities by Country...');
  try {
    const country = 'portugal';
    const result = await pythonService.getCitiesByCountry(country, 3);
    if (result.success) {
      console.log(`✅ Successfully retrieved cities in ${country}`);
      console.log(`   Found ${result.total} cities`);
      result.data.forEach((city, index) => {
        console.log(`   ${index + 1}. ${city.name}, ${city.country} (Score: ${city.predicted_score})`);
      });
    } else {
      console.log(`❌ Failed to get cities in ${country}`);
    }
  } catch (error) {
    console.log('❌ Get cities by country error:', error.message);
  }
  console.log('');

  // Test 6: Get Statistics
  console.log('6️⃣  Testing Get Statistics...');
  try {
    const result = await pythonService.getStats();
    if (result.success) {
      console.log('✅ Successfully retrieved statistics');
      console.log('   Stats:', JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ Failed to get statistics');
    }
  } catch (error) {
    console.log('❌ Get statistics error:', error.message);
  }
  console.log('');

  // Test 7: Test Data Merging
  console.log('7️⃣  Testing Data Merging...');
  try {
    const dbCities = [
      { id: '1', name: 'Bangkok', country: 'Thailand', monthly_cost_usd: 1200 },
      { id: '2', name: 'Lisbon', country: 'Portugal', monthly_cost_usd: 1500 }
    ];
    
    const mlCities = [
      { name: 'Bangkok', country: 'Thailand', predicted_score: 0.85 },
      { name: 'Lisbon', country: 'Portugal', predicted_score: 0.72 }
    ];

    const merged = pythonService.mergeCityData(dbCities, mlCities);
    console.log('✅ Data merging test successful');
    console.log('   Merged cities:', merged.length);
    merged.forEach(city => {
      console.log(`   - ${city.name}: Score ${city.predicted_score}, Enhanced: ${city.ml_enhanced}`);
    });
  } catch (error) {
    console.log('❌ Data merging error:', error.message);
  }
  console.log('');

  console.log('🏁 Integration testing completed!');
  console.log('=====================================');
}

// Run the tests
testPythonIntegration().catch(console.error);
