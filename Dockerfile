# Use official Node.js image as base
FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build TypeScript code into JavaScript
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Command to run the app
CMD ["npm", "start"]
