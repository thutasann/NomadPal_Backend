const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth.middleware');
const { 
  successResponse,
  errorResponse,
  paginateResults,
  sanitizeInput 
} = require('../utils/helpers');
const { pool } = require('../config/database');
const pythonService = require('../services/python.service');

// Get popular cities (based on safety score and cost efficiency)
router.get('/popular', optionalAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const [cities] = await pool.execute(
      `SELECT id, slug, name, country, description,
              monthly_cost_usd, avg_pay_rate_usd_hour, weather_avg_temp_c, safety_score,
              nightlife_rating, transport_rating, climate_avg_temp_c, climate_summary,
              lifestyle_tags, currency
       FROM cities 
       WHERE safety_score >= 70 AND monthly_cost_usd <= 3000
       ORDER BY (safety_score * 0.6) + ((3000 - monthly_cost_usd) / 30) DESC
       LIMIT ?`,
      [parseInt(limit)]
    );

    // Add saved status for authenticated users
    if (req.user) {
      for (let city of cities) {
        const [savedResult] = await pool.execute(
          'SELECT 1 FROM saved_cities WHERE user_id = ? AND city_id = ?',
          [req.user.id, city.id]
        );
        city.is_saved = savedResult.length > 0;
      }
    }

    successResponse(res, cities, 'Popular cities retrieved successfully');

  } catch (error) {
    console.error('Get popular cities error:', error);
    errorResponse(res, 'Failed to retrieve popular cities', 500);
  }
});

// Get cities with advanced filters
router.get('/filter', optionalAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      country, 
      climate, 
      min_cost, 
      max_cost,
      min_safety,
      max_safety,
      min_internet,
      min_nightlife,
      min_transport,
      sort_by = 'name',
      sort_order = 'ASC'
    } = req.query;

    // Ensure page and limit are numbers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    
    const { offset, limit: queryLimit } = paginateResults(pageNum, limitNum);

    // Build WHERE clause
    let whereClause = '';
    const whereParams = [];

    if (country) {
      whereClause += ' WHERE country LIKE ?';
      whereParams.push(`%${sanitizeInput(country)}%`);
    }

    if (climate) {
      whereClause += whereClause ? ' AND climate_summary LIKE ?' : ' WHERE climate_summary LIKE ?';
      whereParams.push(`%${sanitizeInput(climate)}%`);
    }

    if (min_cost) {
      const minCost = parseFloat(min_cost);
      if (!isNaN(minCost)) {
        whereClause += whereClause ? ' AND monthly_cost_usd >= ?' : ' WHERE monthly_cost_usd >= ?';
        whereParams.push(minCost);
      }
    }

    if (max_cost) {
      const maxCost = parseFloat(max_cost);
      if (!isNaN(maxCost)) {
        whereClause += whereClause ? ' AND monthly_cost_usd <= ?' : ' WHERE monthly_cost_usd <= ?';
        whereParams.push(maxCost);
      }
    }

    if (min_safety) {
      const minSafety = parseFloat(min_safety);
      if (!isNaN(minSafety)) {
        whereClause += whereClause ? ' AND safety_score >= ?' : ' WHERE safety_score >= ?';
        whereParams.push(minSafety);
      }
    }

    // If no filters, use default WHERE clause
    if (!whereClause) {
      whereClause = ' WHERE 1=1';
    }

    console.log('WHERE clause:', whereClause);
    console.log('WHERE params count:', whereParams.length);
    console.log('WHERE params:', whereParams);

    // Validate sort parameters
    const allowedSortFields = ['name', 'country', 'monthly_cost_usd', 'safety_score', 'nightlife_rating', 'transport_rating'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'name';
    const sortOrder = allowedSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'ASC';

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM cities ${whereClause}`,
      whereParams
    );
    const total = countResult[0].total;

    // Get cities
    const [cities] = await pool.execute(
      `SELECT id, slug, name, country, description,
              monthly_cost_usd, avg_pay_rate_usd_hour, weather_avg_temp_c, safety_score,
              nightlife_rating, transport_rating, housing_studio_usd_month, 
              housing_one_bed_usd_month, housing_coliving_usd_month, climate_avg_temp_c,
              climate_summary, internet_speed, cost_pct_rent, cost_pct_dining,
              cost_pct_transport, cost_pct_groceries, cost_pct_coworking, cost_pct_other,
              travel_flight_from_usd, travel_local_transport_usd_week, travel_hotel_usd_week,
              lifestyle_tags, currency, last_updated
       FROM cities ${whereClause}
       ORDER BY ${sortField} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...whereParams, queryLimit, offset]
    );

    // Add saved status for authenticated users
    if (req.user) {
      for (let city of cities) {
        const [savedResult] = await pool.execute(
          'SELECT 1 FROM saved_cities WHERE user_id = ? AND city_id = ?',
          [req.user.id, city.id]
        );
        city.is_saved = savedResult.length > 0;
      }
    }

    const totalPages = Math.ceil(total / queryLimit);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    successResponse(res, {
      cities,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_items: total,
        items_per_page: queryLimit,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage
      }
    }, 'Filtered cities retrieved successfully');

  } catch (error) {
    console.error('Get filtered cities error:', error);
    errorResponse(res, 'Failed to retrieve filtered cities', 500);
  }
});

// Search cities
router.get('/search/:query', optionalAuth, async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Ensure page and limit are numbers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    
    const { offset, limit: queryLimit } = paginateResults(pageNum, limitNum);
    const searchQuery = sanitizeInput(query);

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM cities 
       WHERE name LIKE ? OR country LIKE ? OR description LIKE ?`,
      [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]
    );
    const total = countResult[0].total;

    // Search cities
    const [cities] = await pool.execute(
      `SELECT id, slug, name, country, description,
              monthly_cost_usd, avg_pay_rate_usd_hour, weather_avg_temp_c, safety_score,
              climate_avg_temp_c, climate_summary, lifestyle_tags, currency
       FROM cities 
       WHERE name LIKE ? OR country LIKE ? OR description LIKE ?
       ORDER BY 
         CASE 
           WHEN name LIKE ? THEN 1
           WHEN country LIKE ? THEN 2
           ELSE 3
         END,
         name
       LIMIT ? OFFSET ?`,
      [
        `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`,
        `${searchQuery}%`, `${searchQuery}%`,
        queryLimit, offset
      ]
    );

    // Add saved status for authenticated users
    if (req.user) {
      for (let city of cities) {
        const [savedResult] = await pool.execute(
          'SELECT 1 FROM saved_cities WHERE user_id = ? AND city_id = ?',
          [req.user.id, city.id]
        );
        city.is_saved = savedResult.length > 0;
      }
    }

    const totalPages = Math.ceil(total / queryLimit);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    successResponse(res, {
      cities,
      search_query: searchQuery,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_items: total,
        items_per_page: queryLimit,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage
      }
    }, 'Search completed successfully');

  } catch (error) {
    console.error('Search cities error:', error);
    errorResponse(res, 'Search failed', 500);
  }
});

// Get cities by country
router.get('/country/:country', optionalAuth, async (req, res) => {
  try {
    const { country } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Ensure page and limit are numbers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    
    const { offset, limit: queryLimit } = paginateResults(pageNum, limitNum);
    const countryQuery = sanitizeInput(country);

    // Get total count
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM cities WHERE country LIKE ?',
      [`%${countryQuery}%`]
    );
    const total = countResult[0].total;

    // Get cities by country
    const [cities] = await pool.execute(
      `SELECT id, slug, name, country, description,
              monthly_cost_usd, avg_pay_rate_usd_hour, weather_avg_temp_c, safety_score,
              nightlife_rating, transport_rating, climate_avg_temp_c, climate_summary,
              lifestyle_tags, currency
       FROM cities 
       WHERE country LIKE ?
       ORDER BY name
       LIMIT ? OFFSET ?`,
      [`%${countryQuery}%`, queryLimit, offset]
    );

    // Add saved status for authenticated users
    if (req.user) {
      for (let city of cities) {
        const [savedResult] = await pool.execute(
          'SELECT 1 FROM saved_cities WHERE user_id = ? AND city_id = ?',
          [req.user.id, city.id]
        );
        city.is_saved = savedResult.length > 0;
      }
    }

    const totalPages = Math.ceil(total / queryLimit);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    successResponse(res, {
      cities,
      country: countryQuery,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_items: total,
        items_per_page: queryLimit,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage
      }
    }, 'Cities by country retrieved successfully');

  } catch (error) {
    console.error('Get cities by country error:', error);
    errorResponse(res, 'Failed to retrieve cities by country', 500);
  }
});

// Get all cities with pagination and filters (MUST BE LAST AMONG THE / ROUTES)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      country, 
      climate, 
      min_cost, 
      max_cost,
      min_safety,
      sort_by = 'name',
      sort_order = 'ASC'
    } = req.query;

    // Ensure page and limit are numbers and have fallbacks
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));
    
    console.log('Input values:', { page, limit, pageNum, limitNum });
    
    const pagination = paginateResults(pageNum, limitNum);
    console.log('Pagination result:', pagination);
    
    const queryLimit = pagination.limit;
    const offset = pagination.offset;

    // Validate pagination values
    if (isNaN(queryLimit) || isNaN(offset) || queryLimit < 1 || offset < 0) {
      console.error('Invalid pagination values:', { queryLimit, offset, pagination });
      return errorResponse(res, 'Invalid pagination parameters', 400);
    }

    // Ensure values are integers for MySQL
    const finalLimit = parseInt(queryLimit);
    const finalOffset = parseInt(offset);

    // Debug logging
    console.log('Pagination debug:', { 
      pageNum, 
      limitNum, 
      queryLimit, 
      offset, 
      finalLimit,
      finalOffset,
      pagination 
    });

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const whereParams = [];

    if (country) {
      whereClause += ' AND country LIKE ?';
      whereParams.push(`%${sanitizeInput(country)}%`);
    }

    if (climate) {
      whereClause += ' AND climate_summary LIKE ?';
      whereParams.push(`%${sanitizeInput(climate)}%`);
    }

    if (min_cost) {
      const minCost = parseFloat(min_cost);
      if (!isNaN(minCost)) {
        whereClause += ' AND monthly_cost_usd >= ?';
        whereParams.push(minCost);
      }
    }

    if (max_cost) {
      const maxCost = parseFloat(max_cost);
      if (!isNaN(maxCost)) {
        whereClause += ' AND monthly_cost_usd <= ?';
        whereParams.push(maxCost);
      }
    }

    if (min_safety) {
      const minSafety = parseFloat(min_safety);
      if (!isNaN(minSafety)) {
        whereClause += ' AND safety_score >= ?';
        whereParams.push(minSafety);
      }
    }

    // Validate sort parameters
    const allowedSortFields = ['name', 'country', 'monthly_cost_usd', 'safety_score', 'nightlife_rating', 'transport_rating'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'name';
    const sortOrder = allowedSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'ASC';

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM cities ${whereClause}`,
      whereParams
    );
    const total = countResult[0].total;

    // Prepare final parameters for the cities query
    const finalParams = [...whereParams, finalLimit, finalOffset];
    console.log('Final query params:', finalParams);
    console.log('Parameter types:', finalParams.map(p => ({ value: p, type: typeof p, isNaN: isNaN(p) })));
    
    // Try to fetch cities directly from Python service first
    let cities = [];
    try {
      const isAvailable = await pythonService.isAvailable();
      if (isAvailable) {
        console.log('🐍 Fetching cities directly from Python ML service...');
        
        // Check if we have filters that need special handling
        if (country) {
          // Use country-specific endpoint
          const mlResult = await pythonService.getCitiesByCountry(country, finalLimit);
          if (mlResult.success) {
            cities = mlResult.data;
            console.log(`✅ Got ${cities.length} cities from Python service for country: ${country}`);
          }
        } else {
          // Get top cities based on ML predictions
          const mlResult = await pythonService.getTopCities(finalLimit);
          if (mlResult.success) {
            cities = mlResult.data;
            console.log(`✅ Got ${cities.length} cities from Python ML service`);
          }
        }
        
        // Add ml_enhanced flag
        cities = cities.map(city => ({ ...city, ml_enhanced: true }));
      }
    } catch (mlError) {
      console.warn('⚠️ Python ML service error:', mlError.message);
    }

    // Fallback to database query if Python service failed or returned no data
    if (cities.length === 0) {
      console.log('🗄️ Falling back to database query...');
      
      // If no filters, try a simple query first
      if (whereParams.length === 0) {
        try {
          const [simpleResult] = await pool.query(
            `SELECT id, slug, name, country, description, 
                    monthly_cost_usd, avg_pay_rate_usd_hour, weather_avg_temp_c, safety_score,
                    nightlife_rating, transport_rating, housing_studio_usd_month, 
                    housing_one_bed_usd_month, housing_coliving_usd_month, climate_avg_temp_c,
                    climate_summary, internet_speed, cost_pct_rent, cost_pct_dining,
                    cost_pct_transport, cost_pct_groceries, cost_pct_coworking, cost_pct_other,
                    travel_flight_from_usd, travel_local_transport_usd_week, travel_hotel_usd_week,
                    lifestyle_tags, currency, last_updated
             FROM cities ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`,
            [finalLimit, finalOffset]
          );
          cities = simpleResult;
          console.log('📊 Database query successful, got', cities.length, 'cities');
        } catch (simpleError) {
          console.error('❌ Database query failed:', simpleError);
          throw simpleError;
        }
      } else {
        // Apply filters in database query
        const [citiesResult] = await pool.query(
          `SELECT id, slug, name, country, description,
                  monthly_cost_usd, avg_pay_rate_usd_hour, weather_avg_temp_c, safety_score,
                  nightlife_rating, transport_rating, housing_studio_usd_month, 
                  housing_one_bed_usd_month, housing_coliving_usd_month, climate_avg_temp_c,
                  climate_summary, internet_speed, cost_pct_rent, cost_pct_dining,
                  cost_pct_transport, cost_pct_groceries, cost_pct_coworking, cost_pct_other,
                  travel_flight_from_usd, travel_local_transport_usd_week, travel_hotel_usd_week,
                  lifestyle_tags, currency, last_updated
           FROM cities ${whereClause} ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`,
          finalParams
        );
        cities = citiesResult;
        console.log('📊 Filtered database query successful, got', cities.length, 'cities');
      }
      
      // Add default ML fields for database results
      cities = cities.map(city => ({ 
        ...city, 
        predicted_score: 0, 
        ml_enhanced: false 
      }));
    }

    // Add saved status for authenticated users
    if (req.user) {
      for (let city of cities) {
        const [savedResult] = await pool.execute(
          'SELECT 1 FROM saved_cities WHERE user_id = ? AND city_id = ?',
          [req.user.id, city.id]
        );
        city.is_saved = savedResult.length > 0;
      }
    }

    const totalPages = Math.ceil(total / finalLimit);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    successResponse(res, {
      cities,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_items: total,
        items_per_page: finalLimit,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage
      }
    }, 'Cities retrieved successfully');

  } catch (error) {
    console.error('Get cities error:', error);
    errorResponse(res, 'Failed to retrieve cities', 500);
  }
});

// Get personalized city recommendations based on user preferences
router.get('/personalized', async (req, res) => {
  console.log('🔍 GET /personalized route hit');
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return errorResponse(res, 'Authentication required', 401);
    }

    // Verify token and get user
    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return errorResponse(res, 'Invalid token', 401);
    }

    const userId = decoded.userId;
    
    // Validate user ID
    if (!userId) {
      console.error('User ID is undefined from token:', decoded);
      return errorResponse(res, 'Invalid user token', 401);
    }

    const userIdStr = String(userId);
    const { limit = 20, page = 1 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 20, 200);  // Increased max limit to 200
    const pageNum = Math.max(parseInt(page) || 1, 1);

    // Get user preferences from database
    const [userPrefs] = await pool.execute(
      `SELECT monthly_budget_min_usd, monthly_budget_max_usd, preferred_climate, 
              timezone, lifestyle_priorities, monthly_budget_min_usd, monthly_budget_max_usd
       FROM users WHERE id = ?`,
      [userIdStr]
    );

    if (userPrefs.length === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    const userPreferences = userPrefs[0];
    
    // Parse lifestyle priorities if it's a JSON string
    if (userPreferences.lifestyle_priorities && typeof userPreferences.lifestyle_priorities === 'string') {
      try {
        userPreferences.lifestyle_priorities = JSON.parse(userPreferences.lifestyle_priorities);
      } catch (e) {
        userPreferences.lifestyle_priorities = [];
      }
    }

    console.log('User preferences:', userPreferences);

    // Get personalized recommendations from Python ML service with pagination
    const mlResult = await pythonService.getPersonalizedCities(userPreferences, {
      limit: limitNum,
      page: pageNum
    });
    
    if (mlResult.success) {
      // Add saved status for authenticated users
      const cities = mlResult.data;
      for (let city of cities) {
        const [savedResult] = await pool.execute(
          'SELECT 1 FROM saved_cities WHERE user_id = ? AND city_id = ?',
          [userIdStr, city.id]
        );
        city.is_saved = savedResult.length > 0;
      }

      successResponse(res, {
        cities,
        pagination: {
          current_page: mlResult.current_page,
          total_pages: mlResult.total_pages,
          total_items: mlResult.total,
          items_per_page: mlResult.limit,
          has_next_page: mlResult.has_next_page,
          has_prev_page: mlResult.has_prev_page
        },
        user_preferences: mlResult.userPreferences
      }, 'Personalized city recommendations retrieved successfully');
    } else {
      errorResponse(res, 'Failed to get personalized recommendations', 500);
    }

  } catch (error) {
    console.error('Get personalized cities error:', error);
    errorResponse(res, 'Failed to retrieve personalized cities', 500);
  }
});

// Get user's saved cities
router.get('/saved', async (req, res) => {
  console.log('🔍 GET /saved route hit');
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return errorResponse(res, 'Authentication required', 401);
    }

    // Verify token and get user
    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return errorResponse(res, 'Invalid token', 401);
    }

    const userId = decoded.userId;
    
    // Validate user ID
    if (!userId) {
      console.error('User ID is undefined from token:', decoded);
      return errorResponse(res, 'Invalid user token', 401);
    }

    const userIdStr = String(userId);
    const { page = 1, limit = 20 } = req.query;

    // Ensure page and limit are numbers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    
    console.log('Pagination debug - pageNum:', pageNum, 'limitNum:', limitNum);
    
    // Calculate pagination manually to avoid any import issues
    const finalLimit = Math.max(1, Math.min(parseInt(limitNum) || 20, 100)); // Ensure between 1-100
    const finalOffset = Math.max(0, (parseInt(pageNum) || 1) - 1) * finalLimit;
    
    console.log('Manual pagination - finalLimit:', finalLimit, 'finalOffset:', finalOffset);
    
    // Additional validation to ensure we have valid numbers
    if (isNaN(finalLimit) || isNaN(finalOffset)) {
      console.error('Invalid pagination values - finalLimit:', finalLimit, 'finalOffset:', finalOffset);
      return errorResponse(res, 'Internal server error', 500);
    }
    
    // Ensure positive values
    if (finalLimit < 0 || finalOffset < 0) {
      console.error('Negative pagination values - finalLimit:', finalLimit, 'finalOffset:', finalOffset);
      return errorResponse(res, 'Internal server error', 500);
    }

    // Get total count of saved cities
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM saved_cities WHERE user_id = ?',
      [userIdStr]
    );
    const total = countResult[0].total;

    // Get saved cities
    console.log('SQL Query params - userIdStr:', userIdStr, 'finalLimit:', finalLimit, 'finalOffset:', finalOffset);
    console.log('SQL Query params types:', typeof userIdStr, typeof finalLimit, typeof finalOffset);
    
    // Validate parameters before SQL execution
    if (!userIdStr || finalLimit === undefined || finalLimit === null || finalOffset === undefined || finalOffset === null) {
      console.error('Invalid parameters for SQL query:', { userIdStr, finalLimit, finalOffset });
      return errorResponse(res, 'Internal server error', 500);
    }
    
    // Convert to explicit numbers for MySQL
    const mysqlLimit = Number(finalLimit);
    const mysqlOffset = Number(finalOffset);
    
    console.log('MySQL params - userIdStr:', userIdStr, 'mysqlLimit:', mysqlLimit, 'mysqlOffset:', mysqlOffset);
    console.log('MySQL param types:', typeof userIdStr, typeof mysqlLimit, typeof mysqlOffset);
    
    // Test with hardcoded values first to isolate the issue
    console.log('Testing with hardcoded values first...');
    try {
      const [testResult] = await pool.execute(
        'SELECT COUNT(*) as test FROM saved_cities WHERE user_id = ? LIMIT 1',
        [userIdStr]
      );
      console.log('Test query successful:', testResult);
    } catch (testError) {
      console.error('Test query failed:', testError);
    }
    
    // Try a simpler query first to isolate the issue
    console.log('Attempting simple query first...');
    let savedCities = [];
    
    try {
      // First, get all saved cities without pagination to test the basic query
      const [allSavedCities] = await pool.execute(
        `SELECT c.id, c.slug, c.name, c.country, c.description,
                c.monthly_cost_usd, c.avg_pay_rate_usd_hour, c.weather_avg_temp_c, c.safety_score,
                c.nightlife_rating, c.transport_rating, c.climate_avg_temp_c, c.climate_summary,
                c.lifestyle_tags, c.currency, c.last_updated
         FROM saved_cities sc
         JOIN cities c ON sc.city_id = c.id
         WHERE sc.user_id = ?`,
        [userIdStr]
      );
      
      console.log('Simple query successful, got', allSavedCities.length, 'cities');
      
      // Apply pagination manually in JavaScript
      const startIndex = mysqlOffset;
      const endIndex = startIndex + mysqlLimit;
      savedCities = allSavedCities.slice(startIndex, endIndex);
      
      console.log('Applied pagination manually - startIndex:', startIndex, 'endIndex:', endIndex, 'result:', savedCities.length);
      
    } catch (simpleQueryError) {
      console.error('Simple query failed:', simpleQueryError);
      
      // Fallback: try with hardcoded values
      console.log('Trying fallback with hardcoded values...');
      try {
        const [fallbackResult] = await pool.execute(
          `SELECT c.id, c.slug, c.name, c.country, c.description,
                  c.monthly_cost_usd, c.avg_pay_rate_usd_hour, c.weather_avg_temp_c, c.safety_score,
                  c.nightlife_rating, c.transport_rating, c.climate_avg_temp_c, c.climate_summary,
                  c.lifestyle_tags, c.currency, c.last_updated
           FROM saved_cities sc
           JOIN cities c ON sc.city_id = c.id
           WHERE sc.user_id = ?
           ORDER BY c.name
           LIMIT 20 OFFSET 0`,
          [userIdStr]
        );
        
        savedCities = fallbackResult;
        console.log('Fallback query successful, got', savedCities.length, 'cities');
        
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        throw fallbackError;
      }
    }

    // Add is_saved flag (always true for saved cities)
    const cities = savedCities.map(city => ({ ...city, is_saved: true }));

    const totalPages = Math.ceil(total / finalLimit);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    successResponse(res, {
      cities,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_items: total,
        items_per_page: finalLimit,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage
      }
    }, 'Saved cities retrieved successfully');

  } catch (error) {
    console.error('Get saved cities error:', error);
    errorResponse(res, 'Failed to retrieve saved cities', 500);
  }
});

// Get city by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [cities] = await pool.execute(
      `SELECT id, slug, name, country, description,
              visa_requirement, monthly_cost_usd, avg_pay_rate_usd_hour, 
              weather_avg_temp_c, safety_score, nightlife_rating, transport_rating,
              housing_studio_usd_month, housing_one_bed_usd_month, housing_coliving_usd_month,
              climate_avg_temp_c, climate_summary, internet_speed, cost_pct_rent,
              cost_pct_dining, cost_pct_transport, cost_pct_groceries, cost_pct_coworking,
              cost_pct_other, travel_flight_from_usd, travel_local_transport_usd_week,
              travel_hotel_usd_week, lifestyle_tags, currency, last_updated
       FROM cities WHERE id = ?`,
      [id]
    );

    if (cities.length === 0) {
      return errorResponse(res, 'City not found', 404);
    }

    const city = cities[0];

    // Add saved status for authenticated users
    if (req.user) {
      const [savedResult] = await pool.execute(
        'SELECT 1 FROM saved_cities WHERE user_id = ? AND city_id = ?',
        [req.user.id, id]
      );
      city.is_saved = savedResult.length > 0;
    }

    successResponse(res, city, 'City retrieved successfully');

  } catch (error) {
    console.error('Get city error:', error);
    errorResponse(res, 'Failed to retrieve city', 500);
  }
});

// Get city by slug
router.get('/slug/:slug', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;

    const [cities] = await pool.execute(
      `SELECT id, slug, name, country, description,
              visa_requirement, monthly_cost_usd, avg_pay_rate_usd_hour, 
              weather_avg_temp_c, safety_score, nightlife_rating, transport_rating,
              housing_studio_usd_month, housing_one_bed_usd_month, housing_coliving_usd_month,
              climate_avg_temp_c, climate_summary, internet_speed, cost_pct_rent,
              cost_pct_dining, cost_pct_transport, cost_pct_groceries, cost_pct_coworking,
              cost_pct_other, travel_flight_from_usd, travel_local_transport_usd_week,
              travel_hotel_usd_week, lifestyle_tags, currency, last_updated
       FROM cities WHERE slug = ?`,
      [slug]
    );

    if (cities.length === 0) {
      return errorResponse(res, 'City not found', 404);
    }

    const city = cities[0];

    // Add saved status for authenticated users
    if (req.user) {
      const [savedResult] = await pool.execute(
        'SELECT 1 FROM saved_cities WHERE user_id = ? AND city_id = ?',
        [req.user.id, city.id]
      );
      city.is_saved = savedResult.length > 0;
    }

    successResponse(res, city, 'City retrieved successfully');

  } catch (error) {
    console.error('Get city by slug error:', error);
    errorResponse(res, 'Failed to retrieve city', 500);
  }
});

// Save/unsave a city for authenticated user
router.post('/:id/save', async (req, res) => {
  console.log('🔍 POST /:id/save route hit with id:', req.params.id);
  try {
    const { id } = req.params;
    console.log("city id:", id, "type:", typeof id);
    
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return errorResponse(res, 'Authentication required', 401);
    }

    // Verify token and get user
    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return errorResponse(res, 'Invalid token', 401);
    }

    const userId = decoded.userId;
    console.log("user id:", userId, "type:", typeof userId);

    // Validate parameters
    if (!userId) {
      console.error('User ID is undefined from token:', decoded);
      return errorResponse(res, 'Invalid user token', 401);
    }

    if (!id) {
      console.error('City ID is undefined from params');
      return errorResponse(res, 'City ID is required', 400);
    }

    // Convert to strings to ensure proper format for CHAR(24) columns
    const userIdStr = String(userId);
    const cityIdStr = String(id);

    console.log("Using userIdStr:", userIdStr, "cityIdStr:", cityIdStr);

    // Check if city exists
    const [cityCheck] = await pool.execute(
      'SELECT id FROM cities WHERE id = ?',
      [cityIdStr]
    );

    if (cityCheck.length === 0) {
      return errorResponse(res, 'City not found', 404);
    }

    // Check if already saved
    const [existingSave] = await pool.execute(
      'SELECT 1 FROM saved_cities WHERE user_id = ? AND city_id = ?',
      [userIdStr, cityIdStr]
    );

    if (existingSave.length > 0) {
      // Already saved, so unsave it
      await pool.execute(
        'DELETE FROM saved_cities WHERE user_id = ? AND city_id = ?',
        [userIdStr, cityIdStr]
      );
      
      successResponse(res, { is_saved: false }, 'City removed from saved list');
    } else {
      // Not saved, so save it
      await pool.execute(
        'INSERT INTO saved_cities (user_id, city_id) VALUES (?, ?)',
        [userIdStr, cityIdStr]
      );
      
      successResponse(res, { is_saved: true }, 'City saved successfully');
    }

  } catch (error) {
    console.error('Save city error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    errorResponse(res, 'Failed to save/unsave city', 500);
  }
});

// Get cost of living breakdown for a city
router.get('/:id/cost-breakdown', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [cities] = await pool.execute(
      `SELECT name, country, monthly_cost_usd, cost_pct_rent, cost_pct_dining,
              cost_pct_transport, cost_pct_groceries, cost_pct_coworking, cost_pct_other,
              housing_studio_usd_month, housing_one_bed_usd_month, housing_coliving_usd_month,
              travel_local_transport_usd_week, travel_hotel_usd_week, currency
       FROM cities WHERE id = ?`,
      [id]
    );

    if (cities.length === 0) {
      return errorResponse(res, 'City not found', 404);
    }

    const city = cities[0];

    // Calculate cost breakdown
    const costBreakdown = {
      city_name: city.name,
      country: city.country,
      total_monthly_cost: city.monthly_cost_usd,
      currency: city.currency,
      breakdown: {
        housing: {
          studio: city.housing_studio_usd_month,
          one_bedroom: city.housing_one_bed_usd_month,
          coliving: city.housing_coliving_usd_month,
          percentage: city.cost_pct_rent
        },
        dining: {
          percentage: city.cost_pct_dining,
          estimated_monthly: (city.monthly_cost_usd * city.cost_pct_dining / 100)
        },
        transport: {
          percentage: city.cost_pct_transport,
          estimated_monthly: (city.monthly_cost_usd * city.cost_pct_transport / 100),
          weekly_local: city.travel_local_transport_usd_week
        },
        groceries: {
          percentage: city.cost_pct_groceries,
          estimated_monthly: (city.monthly_cost_usd * city.cost_pct_groceries / 100)
        },
        coworking: {
          percentage: city.cost_pct_coworking,
          estimated_monthly: (city.monthly_cost_usd * city.cost_pct_coworking / 100)
        },
        other: {
          percentage: city.cost_pct_other,
          estimated_monthly: (city.monthly_cost_usd * city.cost_pct_other / 100)
        }
      },
      travel_costs: {
        local_transport_weekly: city.travel_local_transport_usd_week,
        hotel_weekly: city.travel_hotel_usd_week
      }
    };

    successResponse(res, costBreakdown, 'Cost breakdown retrieved successfully');

  } catch (error) {
    console.error('Get cost breakdown error:', error);
    errorResponse(res, 'Failed to retrieve cost breakdown', 500);
  }
});

module.exports = router;
