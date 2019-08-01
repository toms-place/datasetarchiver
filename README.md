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
