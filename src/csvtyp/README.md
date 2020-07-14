# Reference Tables and How to Find Them

rayner.py

- Args: sample size (0 for all), list of filenames (e.g. obd.lst)
- named entity recognition with DBPedia and Wikidata gazetteer
- check for references via subset, O(n^2) where n is number of text columns
- use ray package for parallel processing
- results are SQL statements in raydata.sql for input to Sqlite (see makefile)



tables.py

- run SQL queries on csv.db and create nice Latex tabular code
- write to file tabs.tex 
- each table is assigned a macro name starting with \tabs 


dbread.py - import labels and types and pickle.dump

make para - full run about 4 hours 

csv.db - not part of git repo, everything is created in rayner

nerctools -  cython version of subset check.  nice try, epic fail. slower than pure python.


# Column typing only: Extracting types and labels from Wikidata dump, apply to list of CSV files

lite.sh - bash script for the whole process

lite.py - go through wikidata truthy dump and write labels, types, and subclasses to lab.csv, p31.csv, and p279.csv

liteimp.sql - import files from previous step into sqlite3

litesel.sql - execute join on lab and p31

uniconv.pl - Perl script to convert Unicode sequences from wikidata truthy dump to utf8 file with labels and types

coltyp.py - contains only the code for CSV file column typing; uses the type file from previous step
