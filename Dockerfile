# BUILD
# use latest version of node
FROM node:alpine AS builder

RUN apk add bash curl python3

# set working directory
WORKDIR /
COPY ./src ./src
COPY ./public ./public
COPY ./templates ./templates
COPY ./build.ts ./
COPY ./tsconfig.json ./
COPY ./react.tsconfig.json ./
COPY ./webpack.config.js ./
COPY ./package*.json ./

# install
RUN npm install
# build
RUN npm run build

CMD [ "npm", "start"]
