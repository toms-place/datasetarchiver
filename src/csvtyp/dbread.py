import bz2
import re
import sys
import random
import os
import csv
import re
import pickle   
import gzip
from collections import defaultdict, Counter

types, labels = defaultdict(set), defaultdict(set)
datadir = '../dl/' # '/home/hugo/data/'
testing = '--test' in sys.argv

# DB Pedia
if '--dbpedia' in sys.argv:
  fnames = ['instance_types_transitive_en.ttl.gz', 'instance_types_transitive_de.ttl.gz']
  # <http://dbpedia.org/resource/Abraham_Lincoln> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://dbpedia.org/ontology/Person> .
  # <http://dbpedia.org/resource/Abraham_Lincoln> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.wikidata.org/entity/Q5> .
  # <http://dbpedia.org/resource/Abraham_Lincoln> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://xmlns.com/foaf/0.1/Person> .
  for fn in fnames:
    print('reading DB pedia', datadir + fn)
    ln = 0
    for line in gzip.open(datadir + fn):
      line = line.decode('utf8')
      line = line.strip() 
      if line.startswith('#'): continue
      if line.endswith('owl#Thing> .'): continue
      lab = line.split()[0]
      i = lab.rfind('/')
      lab = lab[i+1:-1].replace('_', ' ')
      typ = line.split()[2]
      typ = typ[1:-1] # ommit < and >
      # if re.match(r'.*Q\d+$', typ): continue
      types[lab].add(typ)
      labels[typ].add(lab)
      ln += 1
      if testing and ln > 1000*1000: break
      # if ln % 1000000 == 0: print(ln/1000000)
  fnames = ['redirects_en.ttl.gz', 'redirects_de.ttl.gz']
  # <http://dbpedia.org/resource/Abe_Lincoln> <http://dbpedia.org/ontology/wikiPageRedirects> <http://dbpedia.org/resource/Abraham_Lincoln> .
  # <http://dbpedia.org/resource/Honest_Abe> <http://dbpedia.org/ontology/wikiPageRedirects> <http://dbpedia.org/resource/Abraham_Lincoln> .
  for fn in fnames:
    print('reading', datadir + fn)
    ln = 0
    for line in gzip.open(datadir + fn):
      line = line.decode('utf8')
      line = line.strip()
      if line.startswith('#'): continue
      src = line.split()[0]
      i = src.rfind('/')
      src = src[i+1:-1].replace('_', ' ')
      dest = line.split()[2]
      j = dest.rfind('/')
      dest = dest[j+1:-1].replace('_', ' ')
      if dest in types:
        types[src] = types[dest]
      ln += 1
      if testing and ln > 1000*1000: break
      # if ln % 1000000 == 0: print(ln/1000000)
  
# Wikidata labels and types 
if '--wikidata' in sys.argv:
  print('reading wikidata')
  ln = 0
  fn = sys.argv[ sys.argv.index('--wikidata')+1 ]
  # for line in gzip.open(fn):
  for line in open(fn, 'r', encoding='utf-8'):
    # line = line.decode('utf8')
    lst = line.strip().split(',')
    if len(lst) != 3: continue
    if len(lst[1]) < 2: continue
    # instance entity, type entity, and their labels
    inst_lab, typ_ent, typ_lab = [ s.strip() for  s in lst ]
    t = typ_ent + ' ' + typ_lab # wikidata type entity plus type label
    types[inst_lab].add(t)
    labels[t].add(inst_lab)
    ln += 1
    if testing and ln > 1000*1000: break
    # if ln % 1000000 == 0: print(ln/1000000)

print('labels:', len(types))
print('types:', len(labels))
for l in ('Abraham Lincoln', 'Alaska', 'Kimono'):
  print(l, types[l])
# for t in ('dbpedia.org/ontology/Person', 'schema.org/Place'):
#   print(t, labels[t])

print('writing pickle file..')
f = open('types.pkl', 'wb')  
pickle.dump(types, f)   
f.close()  
f = open('labels.pkl', 'wb')      
pickle.dump(labels, f)        
f.close()

