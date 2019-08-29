#!/bin/bash

docker container stop --filter "label=datasetarchiver"
docker rmi datasetarchiver/crawler datasetarchiver/master --force
docker build --no-cache=true -t datasetarchiver/crawler .
docker build --no-cache=true -t datasetarchiver/master -f Dockerfile_master .
docker rmi (docker images -f “dangling=true” -q )
docker run --network="host" -l datasetarchiver -d datasetarchiver/crawler
docker run --network="host" -l datasetarchiver -d datasetarchiver/master