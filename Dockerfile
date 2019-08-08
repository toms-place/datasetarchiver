# use latest version of node
FROM node:12.4.0-alpine
RUN apk add --no-cache bash

# set working directory
WORKDIR /dist/crawler
COPY package*.json ./
COPY .env ./
COPY ./dist/crawler ./dist/crawler

# install
RUN npm install --only=prod

# expose port 3000
EXPOSE 3000

CMD [ "npm", "run", "server:prod" ]