default:
	date
	# find /data/csvs_05-12-2020/ -type f -size -200k  > obd.lst # 100k crawler limit!??
	find /data/obd_data2/ -type f -size -500k > obd.lst
	# python3 sam.py obd.lst 0000 --obd > sample.lst
	wc -l obd.lst
	python3 rayner.py 000 obd.lst  # --refs # --lsh # --timing
	# mv typesets.csv typesets.2016.csv
	# rm csv.db
	# ./sqlite csv.db < raydata.sql
	# ./sqlite csv.db < query.sql > results.2020c.txt
	# python3 tables.py > tabs.2020.200k.tex
	date

semtab2020:
	python3 coltyp.py /data/truthy/types.en-de.txt semtab.lst > cta.csv
	# find ~/semtab2020_tables -type f > semtab.lst
	# wc -l semtab.lst
	# python3 rayner.py 0 semtab.lst --refs --lsh
	# rm csv.db
	# ./sqlite csv.db < raydata.sql
	# python3 tables.py > semtab.tex

subset:
	zcat ../dl/wikidata_en_de_labels.ttl.gz | head -50000 > wdlab.txt
	zcat ../dl/wikidata_types.ttl.gz | head -50000 > wdtyp.txt
	zcat ../dl/wikidata_subclasses.ttl.gz | head -50000 > wdsub.txt
	python3 spa.py 

para:
	find /data/obd_data2/ -type f -size -500k > obd.lst
	wc -l obd.lst
	python3  rayner.py 0 obd.lst # --timing
	./sqlite csv.db < raydata.sql
	# ./sqlite csv.db < query.sql > results.obd.txt
	python3 tables.py

sizes:
	echo "-500k" > sizes.lst
	find /data/obd_data2/ -type f -size -500k  |  xargs ls -l | awk '{ s += $$5 } END { print s/(1024*1024*1024), NR }' >> sizes.lst
	echo "+500k -1000k" >> sizes.lst
	find /data/obd_data2/ -type f -size +500k -size -1000k |  xargs ls -l | awk '{ s += $$5 } END { print s/(1024*1024*1024), NR }' >> sizes.lst
	echo "+1000k" >> sizes.lst
	find /data/obd_data2/ -type f -size +1000k |  xargs ls -l | awk '{ s += $$5 } END { print s/(1024*1024*1024), NR }' >> sizes.lst

tst:
	python3 rayner.py 10000 obd.lst --timing
	echo ref tabs: ` awk '/insert into sub/ { print $$17 }' raydata.sql | sort -u | wc -l`
	python3 rayner.py 10000 obd.lst --timing --break
	echo ref tabs: ` awk '/insert into sub/ { print $$17 }' raydata.sql | sort -u | wc -l`

other:
	gunzip -c ../dl/2018-03-08-wikidata_labels.ttl.gz | head -500000 > ../dl/wdlabels.ttl
	gunzip -c ../dl/2018-03-08-wikidata_types.ttl.gz  | head -500000 > ../dl/wdtypes.ttl
	time python3 spa.py 

backup:
	tar zcf ../bakner.tgz *.py makefile *.sql readme.txt todo.txt

lst:
	# number of files per directory
	# du -a /data/obd_data2 | cut -d/ -f4 | sort | uniq -c | sort -n
	# find /data/obd_data2/opendata.socrata.com/ -type f -size -500k > files.socrata.500k.lst
	# find /data/obd_data2/opendata.socrata.com/ -type f > files.socrata.lst
	# find /data/obd_data2/data.cityofnewyork.us -type f -size -500k > files.cityofnewyork.500k.lst
	# ls /data/obd_data2/opendata.socrata.com/ | wc -l
	# wc -l files.socrata.lst
	find /data/obd_data2/ -type f -size -1000k                 > files.lst  # content all csv here, but many fn not .csv
	find /data/kaggle/    -type f -size -1000k -iname '*.csv' >> files.lst # kaggle dirs contain many other files
	find /data/webtables2015/ -type f -iname '*.json.gz'     >> files.lst # web tables, thousands per file
	wc -l files.lst

allfiles:
	find /data/obd_data2/ -type f                         >  allfiles.lst  
	find /data/kaggle/    -type f -iname '*.csv'          >> allfiles.lst
	find /data/webtables2015/ -type f -iname '*.json.gz'  >> allfiles.lst 
	wc -l allfiles.lst

cy:
	python3 setup.py build_ext --inplace
	python3 ner.py 2000 files.100k.lst --timing --no-nerctools
	python3 ner.py 2000 files.100k.lst --timing --nerctools
