# Archives Crawls

* crawls dataset urls and archives them

## prerequisits

* a running mongodb

## how to start production

* npm install
* npm start

## TODO

* kubernetes divide services:
  * Master service
    * initiating the crawls via requests to loadbalancer
  * Multiply Server Pods
    * load balanced by kubernetes
    * crawl on request from master
* mongodb
  * url schema? dataportals?
  * in kubernetes
  * files in sharded db?
