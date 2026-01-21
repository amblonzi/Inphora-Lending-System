# Stage 1: Build the React application
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve the React application with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built files from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration if needed (we will use a volume for the main gateway nginx, 
# but this container needs to just serve files on port 80)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
