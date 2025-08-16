# NomadPal Backend

A robust Node.js backend API for NomadPal, a digital nomad city recommendation platform. Built with Express.js, MongoDB, and JWT authentication, providing RESTful APIs for city data, user management, and personalized recommendations.

## 🚀 Features

### Core API Endpoints
- **Authentication System**: JWT-based user registration, login, and token management
- **Cities Management**: CRUD operations for city data with advanced filtering
- **User Management**: User profiles, preferences, and saved cities
- **Jobs Integration**: Job search and filtering capabilities
- **Personalization Engine**: AI-powered city recommendations based on user preferences

### Data Management
- **MongoDB Integration**: NoSQL database with Mongoose ODM
- **Data Validation**: Comprehensive input validation and sanitization
- **Caching Strategy**: Redis caching for improved performance
- **File Upload**: Image and document upload support
- **Data Export**: CSV and JSON export capabilities

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt password encryption
- **Rate Limiting**: API rate limiting and DDoS protection
- **CORS Configuration**: Cross-origin resource sharing setup
- **Input Sanitization**: Protection against injection attacks

### Performance & Scalability
- **Connection Pooling**: Database connection optimization
- **Middleware Stack**: Efficient request processing pipeline
- **Error Handling**: Centralized error handling and logging
- **Health Checks**: API health monitoring endpoints
- **Load Balancing**: Ready for horizontal scaling

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi schema validation
- **Caching**: Redis (optional)
- **Testing**: Jest + Supertest
- **Documentation**: Swagger/OpenAPI
- **Process Management**: PM2
- **Containerization**: Docker

## 📁 Project Structure

```
NomadPal_Backend/
├── config/                 # Configuration files
│   ├── database.js        # Database connection config
│   └── environment.js     # Environment variables
├── middleware/             # Express middleware
│   ├── auth.middleware.js # Authentication middleware
│   ├── validation.middleware.js # Input validation
│   ├── rateLimit.middleware.js # Rate limiting
│   └── error.middleware.js # Error handling
├── routes/                 # API route definitions
│   ├── auth.routes.js     # Authentication routes
│   ├── cities.routes.js   # Cities API routes
│   ├── user.routes.js     # User management routes
│   └── job.routes.js      # Job-related routes
├── services/               # Business logic layer
│   ├── auth.service.js    # Authentication service
│   ├── cities.service.js  # Cities business logic
│   ├── user.service.js    # User management service
│   ├── python.service.js  # Python ML integration
│   └── cache.service.js   # Caching service
├── models/                 # Database models
│   ├── User.js            # User data model
│   ├── City.js            # City data model
│   ├── Job.js             # Job data model
│   └── Preference.js      # User preferences model
├── utils/                  # Utility functions
│   ├── helpers.js         # Helper functions
│   ├── validators.js      # Validation utilities
│   └── logger.js          # Logging utilities
├── sql/                    # SQL scripts and migrations
├── csv/                    # Data import/export files
├── docs/                   # API documentation
├── tests/                  # Test files
├── server.js               # Main application entry point
├── package.json            # Dependencies and scripts
└── Dockerfile              # Docker configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB 6.0+
- npm 8+
- Redis (optional, for caching)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd NomadPal_Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/nomadpal
   MONGODB_URI_PROD=mongodb://your-production-db
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   
   # Redis Configuration (optional)
   REDIS_URL=redis://localhost:6379
   
   # Python ML Service
   PYTHON_SERVICE_URL=http://localhost:5000
   
   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000
   
   # Rate Limiting
   RATE_LIMIT_WINDOW=15m
   RATE_LIMIT_MAX=100
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB (if using local installation)
   mongod
   
   # Or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

6. **Verify the API**
   Navigate to `http://localhost:3001/api/health`

## 📱 Available Scripts

```bash
# Development
npm run dev          # Start development server with nodemon
npm run start        # Start production server
npm run debug        # Start with debugging enabled

# Database
npm run db:seed      # Seed database with sample data
npm run db:migrate   # Run database migrations
npm run db:reset     # Reset database (development only)

# Testing
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run test:integration # Run integration tests

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier

# Build & Deploy
npm run build        # Build for production
npm run deploy       # Deploy to production
npm run docker:build # Build Docker image
npm run docker:run   # Run Docker container
```

## 🔧 Configuration

### Environment Variables
- **Server**: Port, environment, CORS settings
- **Database**: MongoDB connection strings
- **Security**: JWT secrets, rate limiting
- **Services**: External service URLs
- **Caching**: Redis configuration

### Database Configuration
MongoDB connection with Mongoose, including:
- Connection pooling
- Error handling
- Reconnection logic
- Schema validation

### Security Configuration
- JWT token configuration
- Password hashing settings
- Rate limiting parameters
- CORS policy settings

## 🏗️ Architecture

### API Architecture
- **RESTful Design**: Standard REST API patterns
- **Middleware Stack**: Request processing pipeline
- **Route Organization**: Modular route structure
- **Service Layer**: Business logic separation

### Database Design
- **MongoDB Collections**: Optimized data structure
- **Indexing Strategy**: Performance optimization
- **Data Validation**: Schema-level validation
- **Relationships**: Document references and population

### Service Architecture
- **Authentication Service**: User management and JWT handling
- **Cities Service**: City data operations and filtering
- **User Service**: Profile and preference management
- **Python Service**: ML model integration
- **Cache Service**: Redis caching operations

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register     # User registration
POST   /api/auth/login        # User login
POST   /api/auth/logout       # User logout
POST   /api/auth/refresh      # Token refresh
GET    /api/auth/profile      # Get user profile
PUT    /api/auth/profile      # Update user profile
```

### Cities
```
GET    /api/cities            # Get all cities with pagination
GET    /api/cities/:id        # Get city by ID
GET    /api/cities/slug/:slug # Get city by slug
POST   /api/cities            # Create new city (admin)
PUT    /api/cities/:id        # Update city (admin)
DELETE /api/cities/:id        # Delete city (admin)
GET    /api/cities/search     # Search cities
GET    /api/cities/filter     # Filter cities
GET    /api/cities/personalized # Get personalized recommendations
```

### Users
```
GET    /api/users             # Get all users (admin)
GET    /api/users/:id         # Get user by ID
PUT    /api/users/:id         # Update user
DELETE /api/users/:id         # Delete user
POST   /api/users/preferences # Update user preferences
GET    /api/users/saved-cities # Get user's saved cities
POST   /api/users/save-city   # Save city to user's list
```

### Jobs
```
GET    /api/jobs              # Get all jobs with pagination
GET    /api/jobs/:id          # Get job by ID
GET    /api/jobs/search       # Search jobs
GET    /api/jobs/filter       # Filter jobs by criteria
POST   /api/jobs              # Create new job
PUT    /api/jobs/:id          # Update job
DELETE /api/jobs/:id          # Delete job
```

## 🔒 Security Implementation

### Authentication & Authorization
- **JWT Tokens**: Secure token generation and validation
- **Password Security**: bcrypt hashing with salt rounds
- **Token Refresh**: Automatic token renewal system
- **Route Protection**: Middleware-based access control

### Data Protection
- **Input Validation**: Joi schema validation
- **SQL Injection**: MongoDB injection prevention
- **XSS Protection**: Input sanitization
- **Rate Limiting**: API abuse prevention

### CORS & Headers
- **CORS Policy**: Configurable cross-origin settings
- **Security Headers**: Helmet.js security middleware
- **Content Security**: CSP header implementation

## 📊 Database Models

### User Model
```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, required),
  firstName: String,
  lastName: String,
  preferences: {
    budget: Number,
    climate: String,
    safety: Number,
    lifestyle: [String]
  },
  savedCities: [ObjectId],
  createdAt: Date,
  updatedAt: Date
}
```

### City Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  slug: String (unique, required),
  country: String (required),
  description: String,
  monthlyCost: Number,
  safetyScore: Number,
  internetSpeed: Number,
  climate: String,
  coordinates: {
    lat: Number,
    lng: Number
  },
  tags: [String],
  images: [String],
  createdAt: Date,
  updatedAt: Date
}
```

### Job Model
```javascript
{
  _id: ObjectId,
  title: String (required),
  company: String,
  location: String,
  type: String,
  salary: {
    min: Number,
    max: Number,
    currency: String
  },
  description: String,
  requirements: [String],
  postedAt: Date,
  expiresAt: Date
}
```

## 🧪 Testing

### Testing Strategy
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Database Tests**: MongoDB operation testing
- **Performance Tests**: Load and stress testing

### Test Configuration
```bash
# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:auth          # Authentication tests
npm run test:cities        # Cities API tests
```

### Test Coverage
- **API Endpoints**: 100% endpoint coverage
- **Business Logic**: Core service testing
- **Error Handling**: Edge case coverage
- **Database Operations**: CRUD operation testing

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Docker Deployment
```bash
# Build Docker image
docker build -t nomadpal-backend .

# Run container
docker run -d -p 3001:3001 --name nomadpal-backend nomadpal-backend

# Docker Compose
docker-compose up -d
```

### Environment Setup
1. Set production environment variables
2. Configure production database
3. Set up reverse proxy (Nginx)
4. Configure SSL certificates
5. Set up monitoring and logging

### Deployment Options
- **Cloud Platforms**: AWS, Google Cloud, Azure
- **Container Orchestration**: Kubernetes, Docker Swarm
- **Serverless**: AWS Lambda, Vercel Functions
- **Traditional**: VPS, dedicated servers

## 📊 Performance & Monitoring

### Performance Optimization
- **Database Indexing**: Optimized MongoDB queries
- **Connection Pooling**: Efficient database connections
- **Caching Strategy**: Redis caching implementation
- **Compression**: Gzip response compression

### Monitoring & Logging
- **Health Checks**: API endpoint monitoring
- **Error Tracking**: Centralized error logging
- **Performance Metrics**: Response time monitoring
- **Resource Usage**: CPU and memory tracking

### Scaling Strategies
- **Horizontal Scaling**: Load balancer setup
- **Database Sharding**: MongoDB sharding configuration
- **Microservices**: Service decomposition
- **Caching Layers**: Multi-level caching

## 🔌 External Integrations

### Python ML Service
- **Recommendation Engine**: City recommendation API
- **Data Processing**: ML model integration
- **Real-time Updates**: Dynamic recommendation updates

### Third-party APIs
- **Job Platforms**: Job data integration
- **Weather Services**: Climate data updates
- **Cost of Living**: Economic data sources
- **Safety Data**: Crime and safety statistics

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes and test thoroughly
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

### Code Standards
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format
- **TypeScript**: Type safety (future implementation)

### Testing Requirements
- **Unit Tests**: Required for new features
- **Integration Tests**: API endpoint testing
- **Code Coverage**: Minimum 80% coverage
- **Performance Tests**: Load testing for new endpoints

## 📝 API Documentation

### Swagger/OpenAPI
- **Interactive Docs**: `/api-docs` endpoint
- **API Specification**: OpenAPI 3.0 compliant
- **Request/Response Examples**: Detailed examples
- **Authentication**: JWT token documentation

### Postman Collection
- **API Testing**: Complete Postman collection
- **Environment Variables**: Pre-configured environments
- **Request Examples**: Sample requests for all endpoints

## 🆘 Support & Troubleshooting

### Common Issues
- **Database Connection**: Check MongoDB status and connection string
- **JWT Errors**: Verify JWT secret and token expiration
- **CORS Issues**: Check CORS configuration and origin settings
- **Rate Limiting**: Verify rate limit configuration

### Getting Help
- **Documentation**: Check this README first
- **Issues**: GitHub issues for bug reports
- **Discussions**: GitHub discussions for questions
- **Email**: Contact the development team

### Debug Mode
```bash
# Enable debug logging
DEBUG=nomadpal:* npm run dev

# Enable detailed error logging
NODE_ENV=development LOG_LEVEL=debug npm run dev
```

## 🔮 Roadmap

### Upcoming Features
- **GraphQL API**: Alternative to REST endpoints
- **Real-time Updates**: WebSocket implementation
- **Advanced Analytics**: User behavior tracking
- **Multi-language Support**: Internationalization
- **Advanced Search**: Elasticsearch integration
- **File Management**: Cloud storage integration

### Technical Improvements
- **TypeScript Migration**: Full TypeScript implementation
- **Microservices**: Service decomposition
- **Event Streaming**: Kafka/RabbitMQ integration
- **Advanced Caching**: Multi-level caching strategy
- **API Versioning**: Version management system

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**NomadPal Backend** - Powering the future of digital nomad city discovery! 🚀🌍