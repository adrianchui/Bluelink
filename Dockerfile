# Use Node.js LTS image from Docker Hub
FROM node:18

# Create and set working directory
WORKDIR /usr/src/app

# Copy dependency files and install
COPY package*.json ./
RUN npm install --only=production

# Copy all other source code
COPY . .

# Expose the port Cloud Run expects
EXPOSE 8080

# Start your app
CMD ["npm", "start"]
