const { paginateResults } = require('./utils/helpers');

console.log('🧪 Testing paginateResults function...\n');

// Test cases
const testCases = [
  { page: 1, limit: 20 },
  { page: 2, limit: 10 },
  { page: 5, limit: 50 },
  { page: '1', limit: '20' }, // String inputs
  { page: undefined, limit: undefined }, // Undefined inputs
  { page: null, limit: null }, // Null inputs
  { page: 0, limit: 0 }, // Zero inputs
  { page: -1, limit: -5 }, // Negative inputs
];

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}:`, testCase);
  
  try {
    const result = paginateResults(testCase.page, testCase.limit);
    console.log('  Result:', result);
    console.log('  Types:', { 
      offset: { value: result.offset, type: typeof result.offset, isNaN: isNaN(result.offset) },
      limit: { value: result.limit, type: typeof result.limit, isNaN: isNaN(result.limit) }
    });
    console.log('  Valid:', { 
      offset: !isNaN(result.offset) && result.offset >= 0,
      limit: !isNaN(result.limit) && result.limit > 0
    });
  } catch (error) {
    console.log('  Error:', error.message);
  }
  console.log('');
});

console.log('✅ Pagination test completed!');
