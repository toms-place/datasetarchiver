#!/bin/bash

cd /data/truthy

# python3 $HOME/lite.py latest-truthy.nt
rm -f types.db

echo import ...
sqlite3 types.db < $HOME/liteimp.sql 

echo select and convert unicode ...
sqlite3 types.db < $HOME/litesel.sql | ~/uniconv.pl > lite.types.csv

head -30 lite.types.csv
# head p279.csv
