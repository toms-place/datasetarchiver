#!/bin/bash

docker container prune --filter "label=datasetarchiver"
docker rmi datasetarchiver/crawler datasetarchiver/master --force
docker build --no-cache=true --rm -t datasetarchiver/crawler .
docker build --no-cache=true --rm -t datasetarchiver/master -f Dockerfile_master .
docker run --network="host" -l datasetarchiver -d datasetarchiver/crawler
docker run --network="host" -l datasetarchiver -d datasetarchiver/master