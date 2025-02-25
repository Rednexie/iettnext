# Use a smaller base image
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install
# Copy the rest of the application code
COPY . .

# Use a non-root user for security
USER node

# Command to run the application
CMD ["npm", "start"]
