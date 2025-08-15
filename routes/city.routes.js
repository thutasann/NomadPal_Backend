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

    // Get cities - return full city data for proper filtering
    console.log('Executing cities query with params:', finalParams);
    console.log('SQL Query:', `SELECT id, slug, name, country, description, monthly_cost_usd, avg_pay_rate_usd_hour, weather_avg_temp_c, safety_score, nightlife_rating, transport_rating, housing_studio_usd_month, housing_one_bed_usd_month, housing_coliving_usd_month, climate_avg_temp_c, climate_summary, internet_speed, cost_pct_rent, cost_pct_dining, cost_pct_transport, cost_pct_groceries, cost_pct_coworking, cost_pct_other, travel_flight_from_usd, travel_local_transport_usd_week, travel_hotel_usd_week, lifestyle_tags, currency, last_updated FROM cities ${whereClause} ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`);
    
    let cities;
    
    // If no filters, try a simple query first
    if (whereParams.length === 0) {
      console.log('No filters, trying full data query...');
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
           FROM cities ORDER BY name ASC LIMIT ? OFFSET ?`,
          [finalLimit, finalOffset]
        );
        cities = simpleResult;
        console.log('Full data query successful, got', cities.length, 'cities');
      } catch (simpleError) {
        console.error('Full data query failed:', simpleError);
        throw simpleError;
      }
    } else {
      // Try using query instead of execute to avoid parameter binding issues
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
    }

    // Try to enhance cities with ML predictions from Python service
    try {
      const isAvailable = await pythonService.isAvailable();
      if (isAvailable) {
        // Get ML predictions for all cities
        const mlResult = await pythonService.getTopCities(1000); // Get a large batch to match against
        
        if (mlResult.success && mlResult.data.length > 0) {
          // Merge ML predictions with database data
          const enhancedCities = pythonService.mergeCityData(cities, mlResult.data);
          
          // If we have ML enhancements and no specific sort is requested, sort by predicted score
          if (sort_by === 'name' && sort_order === 'ASC') {
            enhancedCities.sort((a, b) => (b.predicted_score || 0) - (a.predicted_score || 0));
          }
          
          cities = enhancedCities;
          console.log(`✅ Enhanced ${cities.length} cities with ML predictions`);
        }
      } else {
        // Add default predicted_score if Python service is unavailable
        cities = cities.map(city => ({ ...city, predicted_score: 0, ml_enhanced: false }));
        console.log('⚠️ Python ML service unavailable, using database-only results');
      }
    } catch (mlError) {
      // If ML service fails, continue with database-only results
      cities = cities.map(city => ({ ...city, predicted_score: 0, ml_enhanced: false }));
      console.warn('⚠️ ML service error:', mlError.message);
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
