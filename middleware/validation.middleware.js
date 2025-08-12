const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input',
      details: errors.array()
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('display_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 128 })
    .withMessage('Display name must be between 2 and 128 characters'),
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// User profile update validation
const validateUserProfileUpdate = [
  body('display_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 128 })
    .withMessage('Display name must be between 2 and 128 characters'),
  body('target_salary_usd')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Target salary must be a positive number'),
  body('monthly_budget_min_usd')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum budget must be a positive number'),
  body('monthly_budget_max_usd')
    .optional()
    .isFloat({ min: 0 })
    .custom((value, { req }) => {
      if (req.body.monthly_budget_min_usd && parseFloat(value) <= parseFloat(req.body.monthly_budget_min_usd)) {
        throw new Error('Maximum budget must be greater than minimum budget');
      }
      return true;
    }),
  handleValidationErrors
];

// Job search validation
const validateJobSearch = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Job title must be between 2 and 255 characters'),
  body('location')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Location must be between 2 and 255 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 128 })
    .withMessage('Category must be between 2 and 128 characters'),
  handleValidationErrors
];

// City recommendation validation
const validateCityRecommendation = [
  body('job_title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 128 })
    .withMessage('Job title must be between 2 and 128 characters'),
  body('monthly_budget_min_usd')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum budget must be a positive number'),
  body('monthly_budget_max_usd')
    .optional()
    .isFloat({ min: 0 })
    .custom((value, { req }) => {
      if (req.body.monthly_budget_min_usd && parseFloat(value) <= parseFloat(req.body.monthly_budget_min_usd)) {
        throw new Error('Maximum budget must be greater than minimum budget');
      }
      return true;
    }),
  body('preferred_climate')
    .optional()
    .trim()
    .isLength({ min: 2, max: 64 })
    .withMessage('Preferred climate must be between 2 and 64 characters'),
  handleValidationErrors
];

// Travel cost estimation validation
const validateTravelEstimation = [
  body('origin_city')
    .notEmpty()
    .trim()
    .withMessage('Origin city is required'),
  body('destination_city')
    .notEmpty()
    .trim()
    .withMessage('Destination city is required'),
  body('departure_date')
    .isISO8601()
    .withMessage('Departure date must be a valid date'),
  body('return_date')
    .optional()
    .isISO8601()
    .custom((value, { req }) => {
      if (value && new Date(value) <= new Date(req.body.departure_date)) {
        throw new Error('Return date must be after departure date');
      }
      return true;
    }),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateUserProfileUpdate,
  validateJobSearch,
  validateCityRecommendation,
  validateTravelEstimation,
  handleValidationErrors
};
