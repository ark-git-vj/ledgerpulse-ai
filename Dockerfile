# Use a lightweight official Node.js image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package configuration files first to optimize build caching
COPY package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy the rest of the application files (server.js, .env, and public/ folder)
COPY . .

# Expose the internal port our Express app listens on
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
