# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.15.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Environment variables for the application
ENV PORT=8000
ENV DB_HOST="shuttle.proxy.rlwy.net"
ENV DB_USER="root"
ENV DB_PASSWORD="KpzlJjcyOhlHvBLmLkjnIMsFnDmzFZPM"
ENV DB_NAME="nomadpal_db"
ENV DB_PORT=19877
ENV JWT_SECRET="your_super_secret_jwt_key_here"
ENV JWT_EXPIRES_IN="7d"
ENV PYTHON_SERVICE_URL="https://nomadpal-model.fly.dev"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install node modules
COPY package-lock.json package.json ./
RUN npm ci

# Copy application code
COPY . .


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 8000
CMD [ "npm", "run", "start" ]
