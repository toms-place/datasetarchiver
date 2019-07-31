# use latest version of node
FROM node:12.4.0-alpine

# set working directory
WORKDIR /src
COPY package*.json ./
COPY .env ./

# install
RUN npm install
RUN npm audit fix

# expose port 3000
EXPOSE 3000

CMD [ "npm", "run prod" ]
