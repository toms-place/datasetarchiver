# Archives Crawls

* crawls dataset urls and archives them

## prerequisits

* npm
* a running mongodb

## Quick Start

Get started developing...

```shell
# install deps
npm install

# run in development mode
npm run dev

# run tests
npm run test
```

---

### Run in *production* mode

* provide .env file

Compiles the application and starts it in production production mode.

```shell
npm run compile
npm start
```


## TODO

* kubernetes divide services:
  * Master service
    * initiating the crawls via requests to loadbalancer
  * Multiply Server Pods
    * load balanced by Ingress
    * crawl on request from master
* mongodb
  * in kubernetes
  * files in sharded db?
* dynamic crawlrate tresholds
  * comparising sampling for pull based changes
  * change crawlrate after specific amount of crawls
* politeness!
  * robots.txt of host
  * db with host robots
  * library to parse
* file extension
  * header mime-type and filename=contentdispostions
  * dictionary
  * parsing
  * <https://www.npmjs.com/package/file-type>
