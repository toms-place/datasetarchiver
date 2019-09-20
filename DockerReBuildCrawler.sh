#!/bin/bash

sudo git pull
docker rmi datasetarchiver/crawler --force
docker build --no-cache=true --force-rm -t datasetarchiver/crawler .