# BUILD
# use latest version of node
FROM node:12.4.0-alpine AS builder

# python for bcrypt
RUN apk add --update python
RUN apk --no-cache add --virtual builds-deps build-base python
RUN npm config set python /usr/bin/python
RUN npm i -g npm
RUN npm install
RUN npm rebuild bcrypt --build-from-source
RUN apk del builds-deps

# set working directory
WORKDIR /
COPY ./server ./server
COPY ./master ./master
COPY ./public ./public
COPY ./templates ./templates
COPY ./build.ts ./
COPY ./tsconfig.json ./
COPY ./package*.json ./
COPY ./.env ./

# install
RUN npm install
RUN npm run compile

# SERVICE
# use latest version of node
FROM node:12.4.0-alpine

# python for bcrypt
RUN apk add --update python
RUN apk --no-cache add --virtual builds-deps build-base python
RUN npm config set python /usr/bin/python
RUN npm i -g npm
RUN npm install
RUN npm rebuild bcrypt --build-from-source
RUN apk del builds-deps

RUN apk add --no-cache bash
RUN apk add --no-cache curl

# set working directory
WORKDIR /
COPY --from=builder ./dist ./dist
COPY ./package*.json ./
COPY ./.env ./

# install
RUN npm install pm2 -g
RUN npm install --only=prod

# expose port 3000
EXPOSE 3000

CMD [ "pm2-runtime", "start", "--name", "crawler", "npm", "--", "start" ]