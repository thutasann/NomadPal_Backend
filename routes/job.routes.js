const express = require('express');
const router = express.Router();
const axios = require('axios');
const { 
  successResponse,
  errorResponse,
  sanitizeInput 
} = require('../utils/helpers');

// Remotive API base URL
const REMOTIVE_API_BASE = 'https://remotive.com/api/remote-jobs';

// Get all remote jobs with optional filters
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      company_name, 
      search, 
      limit 
    } = req.query;

    // Build query parameters
    const params = {};
    
    if (category) {
      params.category = sanitizeInput(category);
    }
    
    if (company_name) {
      params.company_name = sanitizeInput(company_name);
    }
    
    if (search) {
      params.search = sanitizeInput(search);
    }
    
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        params.limit = limitNum;
      }
    }

    // Make request to Remotive API
    const response = await axios.get(REMOTIVE_API_BASE, { 
      params,
      timeout: 10000 // 10 second timeout
    });

    const jobsData = response.data;
    
    // Format response
    const formattedResponse = {
      total_jobs: jobsData['job-count'],
      jobs: jobsData.jobs.map(job => ({
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        company_logo: job.company_logo,
        category: job.category,
        job_type: job.job_type,
        salary: job.salary,
        location: job.candidate_required_location,
        publication_date: job.publication_date,
        url: job.url,
        description: job.description
      }))
    };

    successResponse(res, formattedResponse, 'Jobs retrieved successfully');

  } catch (error) {
    console.error('Get jobs error:', error);
    
    if (error.response) {
      // API responded with error
      errorResponse(res, `External API error: ${error.response.status}`, error.response.status);
    } else if (error.request) {
      // Network error
      errorResponse(res, 'Network error while fetching jobs', 503);
    } else {
      // Other error
      errorResponse(res, 'Failed to retrieve jobs', 500);
    }
  }
});

// Get jobs by specific category
router.get('/category/:categorySlug', async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const { limit } = req.query;

    const params = { category: sanitizeInput(categorySlug) };
    
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        params.limit = limitNum;
      }
    }

    const response = await axios.get(REMOTIVE_API_BASE, { 
      params,
      timeout: 10000
    });

    const jobsData = response.data;
    
    const formattedResponse = {
      category: categorySlug,
      total_jobs: jobsData['job-count'],
      jobs: jobsData.jobs.map(job => ({
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        company_logo: job.company_logo,
        category: job.category,
        job_type: job.job_type,
        salary: job.salary,
        location: job.candidate_required_location,
        publication_date: job.publication_date,
        url: job.url,
        description: job.description
      }))
    };

    successResponse(res, formattedResponse, `Jobs in ${categorySlug} retrieved successfully`);

  } catch (error) {
    console.error('Get jobs by category error:', error);
    
    if (error.response) {
      errorResponse(res, `External API error: ${error.response.status}`, error.response.status);
    } else if (error.request) {
      errorResponse(res, 'Network error while fetching jobs', 503);
    } else {
      errorResponse(res, 'Failed to retrieve jobs by category', 500);
    }
  }
});

// Get jobs by company name
router.get('/company/:companyName', async (req, res) => {
  try {
    const { companyName } = req.params;
    const { limit } = req.query;

    const params = { company_name: sanitizeInput(companyName) };
    
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        params.limit = limitNum;
      }
    }

    const response = await axios.get(REMOTIVE_API_BASE, { 
      params,
      timeout: 10000
    });

    const jobsData = response.data;
    
    const formattedResponse = {
      company: companyName,
      total_jobs: jobsData['job-count'],
      jobs: jobsData.jobs.map(job => ({
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        company_logo: job.company_logo,
        category: job.category,
        job_type: job.job_type,
        salary: job.salary,
        location: job.candidate_required_location,
        publication_date: job.publication_date,
        url: job.url,
        description: job.description
      }))
    };

    successResponse(res, formattedResponse, `Jobs at ${companyName} retrieved successfully`);

  } catch (error) {
    console.error('Get jobs by company error:', error);
    
    if (error.response) {
      errorResponse(res, `External API error: ${error.response.status}`, error.response.status);
    } else if (error.request) {
      errorResponse(res, 'Network error while fetching jobs', 503);
    } else {
      errorResponse(res, 'Failed to retrieve jobs by company', 500);
    }
  }
});

// Search jobs by keywords
router.get('/search/:keywords', async (req, res) => {
  try {
    const { keywords } = req.params;
    const { limit, category } = req.query;

    const params = { search: sanitizeInput(keywords) };
    
    if (category) {
      params.category = sanitizeInput(category);
    }
    
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        params.limit = limitNum;
      }
    }

    const response = await axios.get(REMOTIVE_API_BASE, { 
      params,
      timeout: 10000
    });

    const jobsData = response.data;
    
    const formattedResponse = {
      search_keywords: keywords,
      category: category || 'all',
      total_jobs: jobsData['job-count'],
      jobs: jobsData.jobs.map(job => ({
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        company_logo: job.company_logo,
        category: job.category,
        job_type: job.job_type,
        salary: job.salary,
        location: job.candidate_required_location,
        publication_date: job.publication_date,
        url: job.url,
        description: job.description
      }))
    };

    successResponse(res, formattedResponse, `Search results for "${keywords}" retrieved successfully`);

  } catch (error) {
    console.error('Search jobs error:', error);
    
    if (error.response) {
      errorResponse(res, `External API error: ${error.response.status}`, error.response.status);
    } else if (error.request) {
      errorResponse(res, 'Network error while searching jobs', 503);
    } else {
      errorResponse(res, 'Failed to search jobs', 500);
    }
  }
});

// Get job categories
router.get('/categories', async (req, res) => {
  try {
    const response = await axios.get('https://remotive.com/api/remote-jobs/categories', {
      timeout: 10000
    });

    const categories = response.data;
    
    successResponse(res, categories, 'Job categories retrieved successfully');

  } catch (error) {
    console.error('Get job categories error:', error);
    
    if (error.response) {
      errorResponse(res, `External API error: ${error.response.status}`, error.response.status);
    } else if (error.request) {
      errorResponse(res, 'Network error while fetching categories', 503);
    } else {
      errorResponse(res, 'Failed to retrieve job categories', 500);
    }
  }
});

// Get latest jobs (convenience route)
router.get('/latest', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const params = { limit: parseInt(limit) || 10 };

    const response = await axios.get(REMOTIVE_API_BASE, { 
      params,
      timeout: 10000
    });

    const jobsData = response.data;
    
    const formattedResponse = {
      total_jobs: jobsData['job-count'],
      jobs: jobsData.jobs.map(job => ({
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        company_logo: job.company_logo,
        category: job.category,
        job_type: job.job_type,
        salary: job.salary,
        location: job.candidate_required_location,
        publication_date: job.publication_date,
        url: job.url,
        description: job.description
      }))
    };

    successResponse(res, formattedResponse, 'Latest jobs retrieved successfully');

  } catch (error) {
    console.error('Get latest jobs error:', error);
    
    if (error.response) {
      errorResponse(res, `External API error: ${error.response.status}`, error.response.status);
    } else if (error.request) {
      errorResponse(res, 'Network error while fetching latest jobs', 503);
    } else {
      errorResponse(res, 'Failed to retrieve latest jobs', 500);
    }
  }
});

module.exports = router;