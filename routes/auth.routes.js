const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { 
  validateUserRegistration, 
  validateUserLogin 
} = require('../middleware/validation.middleware');
const { 
  generateId, 
  hashPassword, 
  comparePassword, 
  generateToken,
  successResponse,
  errorResponse 
} = require('../utils/helpers');
const { pool } = require('../config/database');

// User Registration
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { 
      email, 
      password, 
      display_name,
      preferred_language,
      country_city,
      timezone,
      passport,
      job_title,
      monthly_budget_min_usd,
      monthly_budget_max_usd,
      preferred_climate,
      internet_speed_requirement,
      lifestyle_priorities,
      newsletter_consent,
      research_consent
    } = req.body;
    
    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return errorResponse(res, 'User with this email already exists', 409);
    }

    // Generate user ID and hash password
    const userId = generateId();
    const passwordHash = await hashPassword(password);

    // Insert new user with all fields
    await pool.execute(
      `INSERT INTO users (
        id, email, password_hash, display_name, preferred_language, 
        country_city, timezone, passport, job_title, monthly_budget_min_usd,
        monthly_budget_max_usd, preferred_climate, internet_speed_requirement,
        lifestyle_priorities, newsletter_consent, research_consent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, email, passwordHash, display_name || null, preferred_language || null,
        country_city || null, timezone || null, passport || null, job_title || null,
        monthly_budget_min_usd || null, monthly_budget_max_usd || null,
        preferred_climate || null, internet_speed_requirement || null,
        lifestyle_priorities ? JSON.stringify(lifestyle_priorities) : null,
        newsletter_consent || false, research_consent || false
      ]
    );

    // Generate JWT token
    const token = generateToken(userId);

    // Get created user (without password)
    const [newUser] = await pool.execute(
      `SELECT id, email, display_name, preferred_language, country_city, 
              timezone, passport, job_title, monthly_budget_min_usd,
              monthly_budget_max_usd, preferred_climate, internet_speed_requirement,
              lifestyle_priorities, newsletter_consent, research_consent, created_at 
       FROM users WHERE id = ?`,
      [userId]
    );

    successResponse(res, {
      user: newUser[0],
      token
    }, 'User registered successfully', 201);

  } catch (error) {
    console.error('Registration error:', error);
    errorResponse(res, 'Registration failed', 500);
  }
});

// User Login
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const [users] = await pool.execute(
      'SELECT id, email, password_hash, display_name FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Remove password from response
    delete user.password_hash;

    successResponse(res, {
      user,
      token
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    errorResponse(res, 'Login failed', 500);
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.execute(
      `SELECT id, email, display_name, preferred_language, country_city, 
              timezone, passport, job_title, monthly_budget_min_usd,
              monthly_budget_max_usd, preferred_climate, internet_speed_requirement,
              lifestyle_priorities, newsletter_consent, research_consent, created_at 
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    successResponse(res, users[0], 'User profile retrieved successfully');

  } catch (error) {
    console.error('Get profile error:', error);
    errorResponse(res, 'Failed to retrieve profile', 500);
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  successResponse(res, null, 'Logout successful');
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Generate new token
    const newToken = generateToken(userId);

    successResponse(res, {
      token: newToken
    }, 'Token refreshed successfully');

  } catch (error) {
    console.error('Token refresh error:', error);
    errorResponse(res, 'Token refresh failed', 500);
  }
});

module.exports = router;
