#!/bin/bash

#sudo git pull
docker container stop $(docker ps -f name=datasetarchiver -q)
docker rmi datasetarchiver/crawler datasetarchiver/master --force
docker build --no-cache=true --force-rm -t datasetarchiver/crawler .
docker build --no-cache=true --force-rm -t datasetarchiver/master -f Dockerfile_master .
docker rmi $(docker images -f dangling=true -q) --force
docker run --network="host" --rm -l datasetarchiver --name datasetarchiver_crawler -d datasetarchiver/crawler
docker run --network="host" --rm -l datasetarchiver --name datasetarchiver_master -d datasetarchiver/master