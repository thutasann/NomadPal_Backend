const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { 
  validateUserProfileUpdate 
} = require('../middleware/validation.middleware');
const { 
  successResponse,
  errorResponse,
  sanitizeInput 
} = require('../utils/helpers');
const { pool } = require('../config/database');

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.execute(
      `SELECT id, email, display_name, preferred_language, country_city, 
              timezone, passport, visa_flexibility, preferred_regions, job_title,
              target_salary_usd, salary_currency, sources, work_style,
              monthly_budget_min_usd, monthly_budget_max_usd, preferred_climate,
              internet_speed_requirement, lifestyle_priorities, newsletter_consent,
              research_consent, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    successResponse(res, users[0], 'Profile retrieved successfully');

  } catch (error) {
    console.error('Get profile error:', error);
    errorResponse(res, 'Failed to retrieve profile', 500);
  }
});

// Update user profile
router.put('/profile', authenticateToken, validateUserProfileUpdate, async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // Sanitize input data
    const sanitizedData = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && updateData[key] !== null) {
        sanitizedData[key] = sanitizeInput(updateData[key]);
      }
    });

    // Build dynamic update query
    const updateFields = Object.keys(sanitizedData)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const updateValues = Object.values(sanitizedData);
    updateValues.push(userId);

    if (Object.keys(sanitizedData).length === 0) {
      return errorResponse(res, 'No valid fields to update', 400);
    }

    await pool.execute(
      `UPDATE users SET ${updateFields} WHERE id = ?`,
      updateValues
    );

    // Get updated user
    const [updatedUsers] = await pool.execute(
      `SELECT id, email, display_name, preferred_language, country_city, 
              timezone, passport, visa_flexibility, preferred_regions, job_title,
              target_salary_usd, salary_currency, sources, work_style,
              monthly_budget_min_usd, monthly_budget_max_usd, preferred_climate,
              internet_speed_requirement, lifestyle_priorities, newsletter_consent,
              research_consent, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    successResponse(res, updatedUsers[0], 'Profile updated successfully');

  } catch (error) {
    console.error('Update profile error:', error);
    errorResponse(res, 'Failed to update profile', 500);
  }
});

// Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.execute(
      `SELECT preferred_language, country_city, timezone, passport, 
              visa_flexibility, preferred_regions, job_title, target_salary_usd,
              salary_currency, work_style, monthly_budget_min_usd, 
              monthly_budget_max_usd, preferred_climate, internet_speed_requirement,
              lifestyle_priorities
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    successResponse(res, users[0], 'Preferences retrieved successfully');

  } catch (error) {
    console.error('Get preferences error:', error);
    errorResponse(res, 'Failed to retrieve preferences', 500);
  }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    // Validate and sanitize preferences
    const allowedFields = [
      'preferred_language', 'country_city', 'timezone', 'passport',
      'visa_flexibility', 'preferred_regions', 'job_title', 'target_salary_usd',
      'salary_currency', 'work_style', 'monthly_budget_min_usd',
      'monthly_budget_max_usd', 'preferred_climate', 'internet_speed_requirement',
      'lifestyle_priorities'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (preferences[field] !== undefined) {
        updateData[field] = sanitizeInput(preferences[field]);
      }
    });

    if (Object.keys(updateData).length === 0) {
      return errorResponse(res, 'No valid preferences to update', 400);
    }

    // Build dynamic update query
    const updateFields = Object.keys(updateData)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const updateValues = Object.values(updateData);
    updateValues.push(userId);

    await pool.execute(
      `UPDATE users SET ${updateFields} WHERE id = ?`,
      updateValues
    );

    successResponse(res, null, 'Preferences updated successfully');

  } catch (error) {
    console.error('Update preferences error:', error);
    errorResponse(res, 'Failed to update preferences', 500);
  }
});

// Get saved cities
router.get('/saved-cities', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [savedCities] = await pool.execute(
      `SELECT c.* FROM cities c
       INNER JOIN saved_cities sc ON c.id = sc.city_id
       WHERE sc.user_id = ?
       ORDER BY c.name`,
      [userId]
    );

    successResponse(res, savedCities, 'Saved cities retrieved successfully');

  } catch (error) {
    console.error('Get saved cities error:', error);
    errorResponse(res, 'Failed to retrieve saved cities', 500);
  }
});

// Save city to user's list
router.post('/saved-cities', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { city_id } = req.body;

    if (!city_id) {
      return errorResponse(res, 'City ID is required', 400);
    }

    // Check if city exists
    const [cities] = await pool.execute(
      'SELECT id FROM cities WHERE id = ?',
      [city_id]
    );

    if (cities.length === 0) {
      return errorResponse(res, 'City not found', 404);
    }

    // Check if already saved
    const [existing] = await pool.execute(
      'SELECT user_id FROM saved_cities WHERE user_id = ? AND city_id = ?',
      [userId, city_id]
    );

    if (existing.length > 0) {
      return errorResponse(res, 'City already saved', 409);
    }

    // Save city
    await pool.execute(
      'INSERT INTO saved_cities (user_id, city_id) VALUES (?, ?)',
      [userId, city_id]
    );

    successResponse(res, null, 'City saved successfully', 201);

  } catch (error) {
    console.error('Save city error:', error);
    errorResponse(res, 'Failed to save city', 500);
  }
});

// Remove city from saved list
router.delete('/saved-cities/:cityId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cityId } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM saved_cities WHERE user_id = ? AND city_id = ?',
      [userId, cityId]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, 'Saved city not found', 404);
    }

    successResponse(res, null, 'City removed from saved list');

  } catch (error) {
    console.error('Remove saved city error:', error);
    errorResponse(res, 'Failed to remove saved city', 500);
  }
});

// Get saved jobs
router.get('/saved-jobs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [savedJobs] = await pool.execute(
      `SELECT j.*, sj.status FROM jobs j
       INNER JOIN saved_jobs sj ON j.id = sj.job_id
       WHERE sj.user_id = ?
       ORDER BY j.posted_date DESC`,
      [userId]
    );

    successResponse(res, savedJobs, 'Saved jobs retrieved successfully');

  } catch (error) {
    console.error('Get saved jobs error:', error);
    errorResponse(res, 'Failed to retrieve saved jobs', 500);
  }
});

// Save job to user's list
router.post('/saved-jobs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { job_id, status = 'Interested' } = req.body;

    if (!job_id) {
      return errorResponse(res, 'Job ID is required', 400);
    }

    // Check if job exists
    const [jobs] = await pool.execute(
      'SELECT id FROM jobs WHERE id = ?',
      [job_id]
    );

    if (jobs.length === 0) {
      return errorResponse(res, 'Job not found', 404);
    }

    // Check if already saved
    const [existing] = await pool.execute(
      'SELECT user_id FROM saved_jobs WHERE user_id = ? AND job_id = ?',
      [userId, job_id]
    );

    if (existing.length > 0) {
      // Update status if already saved
      await pool.execute(
        'UPDATE saved_jobs SET status = ? WHERE user_id = ? AND job_id = ?',
        [status, userId, job_id]
      );
      return successResponse(res, null, 'Job status updated successfully');
    }

    // Save job
    await pool.execute(
      'INSERT INTO saved_jobs (user_id, job_id, status) VALUES (?, ?, ?)',
      [userId, job_id, status]
    );

    successResponse(res, null, 'Job saved successfully', 201);

  } catch (error) {
    console.error('Save job error:', error);
    errorResponse(res, 'Failed to save job', 500);
  }
});

// Update saved job status
router.put('/saved-jobs/:jobId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;
    const { status } = req.body;

    if (!status) {
      return errorResponse(res, 'Status is required', 400);
    }

    const [result] = await pool.execute(
      'UPDATE saved_jobs SET status = ? WHERE user_id = ? AND job_id = ?',
      [status, userId, jobId]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, 'Saved job not found', 404);
    }

    successResponse(res, null, 'Job status updated successfully');

  } catch (error) {
    console.error('Update job status error:', error);
    errorResponse(res, 'Failed to update job status', 500);
  }
});

// Remove job from saved list
router.delete('/saved-jobs/:jobId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?',
      [userId, jobId]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, 'Saved job not found', 404);
    }

    successResponse(res, null, 'Job removed from saved list');

  } catch (error) {
    console.error('Remove saved job error:', error);
    errorResponse(res, 'Failed to remove saved job', 500);
  }
});

module.exports = router;
