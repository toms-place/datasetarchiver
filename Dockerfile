# BUILD
# use latest version of node
FROM node:12.4.0-alpine AS builder

# set working directory
COPY ./src ./src
COPY package*.json ./

# install
RUN npm install
RUN npm run build

# SERVICE
# use latest version of node
FROM node:12.4.0-alpine
RUN apk add --no-cache bash

# set working directory
WORKDIR /dist/crawler
COPY --from=builder ./dist/crawler ./dist/crawler
COPY package*.json ./
COPY .env ./

# install
RUN npm install --only=prod

# expose port 3000
EXPOSE 3000

CMD [ "npm", "run", "server:prod" ]