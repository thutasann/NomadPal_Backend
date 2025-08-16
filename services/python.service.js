const axios = require('axios');

/**
 * Service for communicating with the Python ML microservice
 */
class PythonService {
  constructor() {
    // Configure the base URL for the Python service
    this.baseURL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
    this.timeout = parseInt(process.env.PYTHON_SERVICE_TIMEOUT) || 30000; // 30 seconds

    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🐍 Python Service Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('🐍 Python Service Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`🐍 Python Service Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('🐍 Python Service Error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if the Python service is healthy
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Get top cities with ML predictions
   * @param {number} limit - Number of cities to return (default: 10, max: 50)
   * @returns {Promise<Object>} Top cities with predictions
   */
  async getTopCities(limit = 10) {
    try {
      const response = await this.client.get('/cities/top', {
        params: { limit: Math.min(limit, 50) }
      });
      
      return {
        success: true,
        data: response.data.data,
        total: response.data.total,
        limit: response.data.limit
      };
    } catch (error) {
      throw this.handleError('getTopCities', error);
    }
  }

  /**
   * Search cities with ML predictions
   * @param {string} query - Search query
   * @param {number} limit - Number of cities to return (default: 10, max: 50)
   * @returns {Promise<Object>} Search results with predictions
   */
  async searchCities(query, limit = 10) {
    try {
      if (!query || query.trim().length === 0) {
        throw new Error('Search query is required');
      }

      const response = await this.client.get('/cities/search', {
        params: { 
          q: query.trim(), 
          limit: Math.min(limit, 50) 
        }
      });
      
      return {
        success: true,
        data: response.data.data,
        total: response.data.total,
        query: response.data.query
      };
    } catch (error) {
      throw this.handleError('searchCities', error);
    }
  }

  /**
   * Get cities by country with ML predictions
   * @param {string} country - Country name
   * @param {number} limit - Number of cities to return (default: 10, max: 50)
   * @returns {Promise<Object>} Cities in the specified country with predictions
   */
  async getCitiesByCountry(country, limit = 10) {
    try {
      if (!country || country.trim().length === 0) {
        throw new Error('Country parameter is required');
      }

      const response = await this.client.get(`/cities/by-country/${encodeURIComponent(country)}`, {
        params: { limit: Math.min(limit, 50) }
      });
      
      return {
        success: true,
        data: response.data.data,
        total: response.data.total,
        country: response.data.country
      };
    } catch (error) {
      throw this.handleError('getCitiesByCountry', error);
    }
  }

  /**
   * Get list of all available countries
   * @returns {Promise<Object>} List of countries
   */
  async getCountries() {
    try {
      const response = await this.client.get('/countries');
      
      return {
        success: true,
        data: response.data.data,
        total: response.data.total
      };
    } catch (error) {
      throw this.handleError('getCountries', error);
    }
  }

  /**
   * Get dataset statistics
   * @returns {Promise<Object>} Dataset statistics
   */
  async getStats() {
    try {
      const response = await this.client.get('/stats');
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      throw this.handleError('getStats', error);
    }
  }

  /**
   * Get personalized city recommendations based on user preferences
   * @param {Object} userPreferences - User preference data from database
   * @param {Object} params - Query parameters including pagination
   * @param {number} params.limit - Number of cities to return (default: 20, max: 100)
   * @param {number} params.page - Page number (default: 1)
   * @returns {Promise<Object>} Personalized city recommendations
   */
  async getPersonalizedCities(userPreferences, params = {}) {
    try {
      if (!userPreferences || typeof userPreferences !== 'object') {
        throw new Error('User preferences are required and must be an object');
      }

      const { limit = 20, page = 1 } = params;
      const validatedLimit = Math.min(limit, 200);  // Increased max limit to 200
      const validatedPage = Math.max(page, 1);

      const response = await this.client.post('/cities/personalized', userPreferences, {
        params: { 
          limit: validatedLimit,
          page: validatedPage
        }
      });
      
      console.log('🐍 Python service response:', {
        status: response.data.status,
        dataCount: response.data.data?.length,
        total: response.data.total,
        limit: response.data.limit,
        pagination: response.data.pagination
      });
      
      // Extract pagination from the response
      const pagination = response.data.pagination || {};
      
      const result = {
        success: true,
        data: response.data.data,
        total: response.data.total,
        limit: response.data.limit,
        offset: pagination.offset,
        current_page: pagination.current_page,
        total_pages: pagination.total_pages,
        has_next_page: pagination.has_next_page,
        has_prev_page: pagination.has_prev_page,
        userPreferences: response.data.user_preferences
      };
      
      console.log('🎯 Python service returning:', {
        success: result.success,
        dataCount: result.data?.length,
        total: result.total,
        current_page: result.current_page,
        total_pages: result.total_pages,
        has_next_page: result.has_next_page
      });
      
      return result;
    } catch (error) {
      throw this.handleError('getPersonalizedCities', error);
    }
  }

  /**
   * Merge ML predictions with database city data
   * @param {Array} dbCities - Cities from database
   * @param {Array} mlCities - Cities with ML predictions
   * @returns {Array} Merged city data
   */
  mergeCityData(dbCities, mlCities) {
    if (!Array.isArray(dbCities) || !Array.isArray(mlCities)) {
      return dbCities || [];
    }

    // Create a map of ML predictions by city name and country for faster lookup
    const mlMap = new Map();
    mlCities.forEach(mlCity => {
      const key = `${mlCity.name?.toLowerCase()}_${mlCity.country?.toLowerCase()}`;
      mlMap.set(key, mlCity);
    });

    // Merge database cities with ML predictions
    return dbCities.map(dbCity => {
      const key = `${dbCity.name?.toLowerCase()}_${dbCity.country?.toLowerCase()}`;
      const mlCity = mlMap.get(key);
      
      if (mlCity) {
        return {
          ...dbCity,
          predicted_score: mlCity.predicted_score,
          ml_enhanced: true
        };
      }
      
      return {
        ...dbCity,
        predicted_score: 0,
        ml_enhanced: false
      };
    });
  }

  /**
   * Handle errors from Python service calls
   * @param {string} operation - The operation that failed
   * @param {Error} error - The error object
   * @returns {Error} Formatted error
   */
  handleError(operation, error) {
    const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
    const statusCode = error.response?.status || 500;
    
    const formattedError = new Error(`Python Service ${operation} failed: ${errorMessage}`);
    formattedError.statusCode = statusCode;
    formattedError.originalError = error;
    formattedError.pythonServiceError = true;
    
    return formattedError;
  }

  /**
   * Check if the Python service is available
   * @returns {Promise<boolean>} True if service is available
   */
  async isAvailable() {
    try {
      const health = await this.checkHealth();
      return health.success;
    } catch (error) {
      console.warn('🐍 Python Service is not available:', error.message);
      return false;
    }
  }
}

// Create and export a singleton instance
const pythonService = new PythonService();

module.exports = pythonService;
