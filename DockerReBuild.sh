#!/bin/bash

git pull
docker rmi datasetarchiver/crawler
docker build --no-cache=true --force-rm -t datasetarchiver/crawler .
docker rmi $(docker images -f dangling=true -q)