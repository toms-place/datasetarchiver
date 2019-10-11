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

Compiles the application and starts it in production mode.

```shell
npm run compile
npm start
```

## TODO

* API:
  * JSON addHrefs
* MASTER:
  * connect fail, release hosts
* CRAWLER:
  * sometimes get header is forbidden
  * politeness:
    * robots.txt of host
    * db with host robots

* mongodb
  * in kubernetes
  * files in sharded db?
* dynamic crawlrate tresholds
  * comparising sampling for pull based changes
  * change crawlrate after specific amount of crawls

* file extension
  * header mime-type and filename=contentdispostions
  * dictionary
  * parsing
  * <https://www.npmjs.com/package/file-type>

## Infos

* first unique url count
  * 265.203 of 1.241.161
* second unique url count (csvs from sparql)
  * 318.925 of 358.300
* Crawler total csvs
  * 278.686
