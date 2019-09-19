#!/bin/bash

sudo git pull
docker rmi datasetarchiver/master --force
docker build --no-cache=true --force-rm -t datasetarchiver/master -f Dockerfile_master .