import bz2
import re
import sys
import random
import os
import csv
import json
import gzip
import re
from collections import defaultdict, Counter
import pickle         
import numpy as np
import psutil
import ray
from datasketch import MinHash, MinHashLSH, MinHashLSHEnsemble

# my own my own C/cython implementation, actually slower than pure Python
if '--nerctools' in sys.argv:
  from nerctools import cntainb

if '--profile' in sys.argv:
  from line_profiler import LineProfiler
from time import time

# output file for SQL statements describing table and column properties
fout = open('raydata.sql', 'w')
brk = 0

# TODO: most specific types; for now, remove Thing from type sets with more than one element
def refine(ts):
  res = []
  u = set()
  for s in ts:
    if s is None: continue
    if len(s) > 1: s = s.discard('www.w3.org/2002/07/owl#Thing')
    if s is None: continue
    res.append(s)
    for x in s: u.add(x)
  return res, u

# numbers and prices, also '...', '-'
def isnumber(word):
  return all([ c in '1234567890.,-$' for c in word ])

def cleanfn(fn):
  return fn.replace("'", "SINGLEQUOTE").replace('"', 'DOUBLEQUOTE')

# read file from disk and return columns
def readf(fn, ftyp):
  global brk
  if ftyp == 'csv':
    rows = []
    # encodings unknown
    for enc in ('utf-8', 'iso-8859-1', 'utf-16'):
      try:
        f = open(fn, encoding=enc, newline='')
        # hd = f.read(1024*4) #  no performance gain with partial reading schemes, just limit file size
        rows = [ row for row in csv.reader(f, delimiter=',', quoting=csv.QUOTE_ALL) ]
        f.close()
        success = True
        break
      except:
        success = False
    if not success:
      # print("readf: error", fn)
      err('tab', 'csv reader error', fn, -1)
      return -1
    if len(rows) == 0: 
      err('tab', 'no rows in table', fn, -1)
      return -1
    ncols = len(rows[0])
    h = 0
    try:
      if csv.Sniffer().has_header('\n'.join(str(v) for v in rows[:10])):
        h = 1
        rows = rows[1:]
        if len(rows) == 0: 
          err('tab', 'header only', fn, -1)
          return -1
    except:
      err('tab', 'csv sniffer error', fn, -1)
      return -1
    cols = list(map(list, zip(*rows)))
    return cols, h, len(rows), ncols
  # for  webtables corpus
  if ftyp == 'json':
    try:
      # webtables archive file contains thousands of tables, one per line
      lines = gzip.open(fn).readlines()
      while True:
        data = json.loads(random.choice(lines))
        if data['tableType'] == 'RELATION': break
      rel = data['relation']
      ncols = len(rel)
      h = data['hasHeader']
    except Exception as e: 
      print(e, file=sys.stderr)
      err('tab', 'json reader error', fn, -1)
      return -1
    cols = []
    for i in range(len(rel)):
      col = rel[i]
      if h: col = col[1:]
      nrows = len(col)
      cols.append(col)
    return cols, h, nrows, ncols

# not too many errors since we are reading prepared files
def err(typ, msg, fn, col):
    fout.write("insert into err (typ, msg, fn, col, src) values ('%s', '%s', '%s', %d, '%s');\n" % (typ, msg, cleanfn(fn), col, fn[6:9]))

# fraction of elements in a contained in b
def fracsubset(a, b):
  if '--nerctools' in sys.argv:
    # cython version
    return cntainb(a, b) / len(a)
  else: 
    # construct intersection and immediately throw it away, just keep the length
    # somehow calculating length directly should be faster..but isnt
    # pure Python still best performance. not surprsing since most a and b very small
    return len(a.intersection(b)) / len(a)
  # return sum([ 1 for x in a if x in b ]) / len(a)
  # improve performance: try with small subset of a first
  # n = 20
  # if len(a) <= n:
  #   return sum([ 1 for x in a if x in b ]) / len(a)
  # f = sum([ 1 for x in random.sample(a, n) if x in b ]) / n
  # if f < lim: 
  #   return f
  # return sum([ 1 for x in a if x in b ]) / len(a)

# find case of elements in string set: U all upper, L all lower, M mixed
def getcase(st):
  if all([ x.isupper() for x in st ]): return 'U'
  if all([ x.islower() for x in st ]): return 'L'
  return 'M'

# find sets all alpha or all not alpha
def getalph(st):
  if all([ x.isalpha() for x in st ]): return 'A'
  if all([ not x.isalpha() for x in st ]): return 'N'
  return 'M'

# find reference columns (and therefore reference tables)
@ray.remote
def refcols(tabs, nval, stats, typsets, sam, tabkeys):
  sql = ''
  # tables allocated to this (parallel) instance
  # note that each instance still needs to check ALL other tables
  for k in tabkeys:
    # cannot use range() here: some i can be missing !!
    for i in tabs[k].keys(): 
      x = tabs[k][i] # set!
      # check conditions for reference column
      # minimum 10 distinct values
      if len(x) < 10: continue
      # selectivity must be 1
      if len(x) != nval[k][i]: continue
      # check all other tables
      for l in tabs.keys():
        if l == k: continue
        for j in tabs[l].keys():
          # check stats, maybe save some work? #  no performance gain
          if '--stats' in sys.argv:
            if stats[l][j]['lmax'] < stats[k][i]['lmin']: continue #  all shorter
            if stats[l][j]['lmin'] > stats[k][i]['lmax']: continue #  all longer
            if stats[l][j]['case'] == 'U' and stats[k][i]['case'] == 'L': continue 
            if stats[l][j]['case'] == 'L' and stats[k][i]['case'] == 'U': continue 
            if stats[l][j]['alph'] == 'A' and stats[k][i]['alph'] == 'N': continue 
            if stats[l][j]['alph'] == 'N' and stats[k][i]['alph'] == 'A': continue 
          y = tabs[l][j]
          lim = 0.9
          if len(y) * lim > len(x): continue
          # common types
          comtyp = typsets[k][i] & typsets[l][j]
          # if len(comtyp) == 0: continue # not good, miss most refs
          # if y <= x: # (strict) subset # instead: 90% subset
          fracsubs = fracsubset(y, x)
          if fracsubs >= lim:
            # table l, column j is subset of table k, column i: table l references table k ?
            sql += "insert into sub (l, j, k, i, comtyp, fracsubset, nchild, nparent, fnchild, fnparent)" \
              + " values (%d, %d, %d, %d, '%s', %f, %d, %d, '%s', '%s');\n" \
              % (l, j, k, i, len(comtyp), fracsubs, len(y), len(x), cleanfn(sam[l]), cleanfn(sam[k]))
  return sql

# read files, perform NER, look for reference tables, write results as SQL statements
def main():
  ss = int(sys.argv[1])
  filelist = sys.argv[2]
  GB = 1024*1024*1024
  t0 = time()
  if '--profile' in sys.argv or '--timing' in sys.argv:
    types, labels = defaultdict(set), defaultdict(set) # save time for profiling test
  else:
    print('reading typeslabels.pkl ..', file=sys.stderr)
    f = open('typeslabels.pkl', 'rb')
    types, labels = pickle.load(f)
    f.close()  
  t1 = time()
  print('labels in dbpedia and wikidata:', len(types), file=sys.stderr)
  print('labels read in %.1f seconds or %.1f minutes' % (t1-t0, (t1-t0)/60), file=sys.stderr)
  # sys.getsizeof does not work correctly, and pympler is WAY too slow
  # print('sizeof types %.3f GB  sizeof labels %.3f GB' % (sys.getsizeof(types)/GB, sys.getsizeof(labels)/GB,), file=sys.stderr)
  files = [ f.strip() for f in open(filelist).readlines() ]
  # process all files instead of sample?
  if ss == 0: ss = len(files)
  nrows = np.zeros(ss)
  ncols = np.zeros(ss)
  cols = {}
  svals = 0
  ne = 0
  rels = {}
  titles = {}
  typcnt = defaultdict(int)
  usecnt = defaultdict(int)
  vcnt = defaultdict(int)
  typsets = {}
  tabs = {}
  nval = {}
  stats = {}
  hdr = 0
  rtyp = defaultdict(int) # consistent row types
  # pat = re.compile("^[0-9\.,/Q_-]*$")
  print('reading', ss, 'out of total', len(files), 'files from', filelist, file=sys.stderr)
  # random.seed(4713)
  sam = random.sample(files, ss)
  # sqlite default autocommit, even when scripted
  # we need one big transaction 
  # otherwise autocommit --> each statement a separate transaction, VERY slow
  fout.write("begin transaction;\n")
  fout.write('DROP TABLE IF EXISTS val;\n')
  fout.write('DROP TABLE IF EXISTS tab;\n')
  fout.write('DROP TABLE IF EXISTS col;\n')
  fout.write('DROP TABLE IF EXISTS err;\n')
  fout.write('DROP TABLE IF EXISTS sel;\n')
  fout.write('DROP TABLE IF EXISTS sub;\n')
  fout.write('DROP TABLE IF EXISTS vcnt;\n')
  fout.write('DROP TABLE IF EXISTS lsh;\n')
  fout.write('DROP TABLE IF EXISTS cnts;\n')
  fout.write('CREATE TABLE val (desc varchar, nvals int, wtyp int, frac float);\n')
  fout.write('CREATE TABLE vcnt (val varchar, nv int, nt int, typs varchar);\n')
  fout.write('CREATE TABLE tab (id int, rows int, cols int, head int, fn varchar, src varchar);\n')
  fout.write('CREATE TABLE col (tab int, col int, typ varchar(255), frac float, cov float);\n')
  fout.write('CREATE TABLE err (typ varchar, msg varchar, fn varchar, col int, src varchar);\n')
  fout.write('CREATE TABLE sel (tab int, col int, nval int, ndist int, sel int);\n')
  fout.write('CREATE TABLE sub (l int, j int, k int, i int, comtyp int, fracsubset float, nchild int, nparent int, fnchild varchar, fnparent varchar);\n')
  fout.write('CREATE TABLE lsh (k int, i int, l int, j int);\n')
  fout.write('CREATE TABLE cnts (desc varchar, cnt int);\n')
  # file for writing types of columns
  tsfile = open('typesets.csv', 'w', encoding='utf8', errors='ignore')
  tsfile.write('filename,column,fraction,type\n')
  fout.write("insert into cnts (desc, cnt) values ('%s', %d);\n" % ('CSV Files:', ss))
  ne = 0
  nallcols = 0 # number of all columns
  # go through the files in the sample
  for k in range(ss):
    fn = sam[k]
    src = 'obd' # fn[6:9]
 #  if src in ['kag', 'obd']: ftyp = 'csv'
 #  else: ftyp = 'json'
    res = readf(fn, 'csv') # ftyp)
    if res == -1: 
      ne += 1
      continue # error reading file
    cols, h, nrows, ncols = res
    nallcols += len(cols)
    #
    # kaggle filenames contain ' !!!
    fout.write("insert into tab values (%d, %d, %d, %d, '%s', '%s');\n" % (k, nrows, ncols, h, cleanfn(fn), src));
    nval[k] = {} # lengths of columns as lists, after removing ignored elements
    tabs[k] = {} # sets of col values, after removing ignored
    typsets[k] = {}
    stats[k] = {}
    ign = ('null', 'true', 'false', 't', 'f', 'yes', 'no', 'y', 'n', 'none', 'na', 'n/a', 'nan', 'n.a.', 'male', 'female', 'm', 'f', 'e')
    for i in range(len(cols)):
      # remove numeric and null-like
      lst = [ x.strip() for x in cols[i] if len(x.strip()) > 0 and not isnumber(x.strip()) and not x.strip().lower() in ign ]
      if len(lst) == 0:
        err('col', 'all num or null', fn, i)
        continue
      # log value counts
      for x in lst: vcnt[x] += 1
      # only need list length and set for finding reference cols, not whole list: save lots of memory
      nval[k][i] = len(lst) 
      tabs[k][i] = set(lst) 
      # selectivity 
      sel = len(tabs[k][i]) / len(lst)
      fout.write("insert into sel (tab, col, nval, ndist, sel) values(%d, %d, %d, %d, %f);\n" % (k, i, len(lst), len(tabs[k][i]), sel))
      # None types
      tsets = [ types[x] for x in lst ]
      ts = set.union(*tsets)
      typsets[k][i] = set()
      # all stats useless, performance worse
      if '--stats' in sys.argv:
        stats[k][i] = {}
        lens = [ len(x) for x in slst ]
        stats[k][i]['lmin'] = min(lens)
        stats[k][i]['lmax'] = max(lens)
        stats[k][i]['case'] = getcase(slst)
        stats[k][i]['alph'] = getalph(slst)
      for t in ts:
        # for more than one known value of type t: fraction of column values that are of type t
        if len(labels[t]) < 2: continue
        f = sum([ int(t in s) for s in tsets ]) / len(lst)
        # type coverage: fraction of col values of type t in relation to all known values of this type
        tset = set([ x for x in lst if t in types[x] ]) # col vals of type t
        cov = len(tset) / len(labels[t]) 
        fout.write("insert into col (tab, col, typ, frac, cov) values (%d, %d, '%s', %f, %f);\n" % 
          (k, i, t.replace("'", "").replace('"', ''), f, cov))
        if f >= 0.5:
          typsets[k][i].add(t)
          if t != 'www.w3.org/2002/07/owl#Thing': 
            # column i in file fn has type t for at least fraction f of elements (set)
            tsfile.write("%s,%d,%.3f,%s\n" % (fn, i, f, t))
      typsets[k][i].discard('www.w3.org/2002/07/owl#Thing') # messes up results. its always a thing
  t2 = time()
  print('files read in %.1f seconds or %.1f minutes' % (t2-t1, (t2-t1)/60), file=sys.stderr)
  # some statistics on columns and values (in the sets): number columns, number of values, length of values
  nc = sum([ len(tabs[k]) for k in tabs ]) 
  nv = sum([ len(tabs[k][i]) for k in tabs for i in tabs[k] ]) 
  lv = sum([ len(s) for k in tabs for i in tabs[k] for s in tabs[k][i] ])
  print('number of tables: %d  cols: %d  avg col size (set): %.1f  avg item len: %.1f' % (len(tabs), nc, nv/nc, lv/nv))
  fout.write("insert into cnts (desc, cnt) values ('%s', %d);\n" % ('Import Errors:', ne))
  fout.write("insert into cnts (desc, cnt) values ('%s', %d);\n" % ('All Tables:', len(tabs)))
  fout.write("insert into cnts (desc, cnt) values ('%s', %d);\n" % ('All Columns:', nallcols))
  # print("brk:", brk) # no gain
  # print('sizeof tabs %.3f GB  sizeof typsets %.3f GB' % (sys.getsizeof(tabs)/GB, sys.getsizeof(typsets)/GB,), file=sys.stderr)
  # value and type counts, most frequent only
  for k in sorted(vcnt, key=vcnt.get, reverse=True)[:100]:
    fout.write("insert into vcnt (val, nv, nt, typs) values ('%s', %d, %d, '%s');\n" % (k.replace("'", ""), vcnt[k], len(types[k]), ', '.join(list(types[k])[:5])))
  # overall statistics on values and types
  nv, wt = sum([vcnt[k] for k in vcnt]), sum([vcnt[k] * int(len(types[k]) > 0) for k in vcnt])
  fout.write("insert into val (desc, nvals, wtyp, frac) values ('%s', %d, %d, %f);\n" % ('Values', nv, wt, wt/nv))
  uv, wt = len(vcnt), sum([ int(len(types[k]) > 0) for k in vcnt])
  fout.write("insert into val (desc, nvals, wtyp, frac) values ('%s', %d, %d, %f);\n" % ('Unique', uv, wt, wt/uv))
  #
  if '--refs' in sys.argv:
    print("finding reference columns..", file=sys.stderr)
    num_cpus = 8 # psutil.cpu_count(logical=False) # weird problems with that
    print("cpus:", num_cpus)
    print("init ray..", file=sys.stderr)
    # Starting Ray with .. GiB memory available for workers and up to .. GiB for objects. 
    # ray.init(memory=<bytes>, object_store_memory=<bytes>).
    ray.init(num_cpus=num_cpus, memory=9*1024*1024*1024, object_store_memory=45*1024*1024*1024)
    print("put data into shared mem..", file=sys.stderr)
    tabs_id = ray.put(tabs)
    nval_id = ray.put(nval)
    stats_id = ray.put(stats)
    typsets_id = ray.put(typsets)
    sam_id = ray.put(sam)
    print("start parallel..", file=sys.stderr)
    # split task by assigning lists of keys in tabs to check. this will block until all are ready.
    sql = ray.get([ refcols.remote(tabs_id, nval_id, stats_id, typsets_id, sam_id, tx) for tx in np.array_split(list(tabs.keys()), num_cpus) ])
    print("parallel section done.", file=sys.stderr)
    # write to file here, NOT in individual tasks 
    for s in sql: fout.write(s)
    t3 = time()
    print('references done in %.1f seconds or %.1f minutes' % (t3-t2, (t3-t2)/60), file=sys.stderr)
  #
  if '--lsh' in sys.argv:
    # locality sensitive hashing for minHashes of column value sets
    print('build hashes..', file=sys.stderr)
  # lsh = MinHashLSH(threshold=0.75, num_perm=128) 
    lsh = MinHashLSHEnsemble(threshold=0.9, num_perm=128, num_part=32) 
    mh = {}
    for k in tabs:
      mh[k] = {}
      for i in tabs[k]:
        mh[k][i] = MinHash(num_perm=128)
        for d in tabs[k][i]:
          mh[k][i].update(d.encode('utf8'))
    #   lsh.insert((k,i), mh[k][i])
    lsh.index([ ((k,i), mh[k][i], len(tabs[k][i]))  for k in tabs for i in tabs[k] ]) 
    t4 = time()
    print('hashes built in %.1f seconds or %.1f minutes' % (t4-t3, (t4-t3)/60), file=sys.stderr)
    # similar cols according to lsh
    print("query lsh..")
    for k in tabs:
      for i in tabs[k]:
  #     for l, j in lsh.query(mh[k][i]):
        for l, j in lsh.query(mh[k][i], len(tabs[k][i])):
          if l == k: continue # same table
          # l,j is the parent!
          # min size for ref tab
          if len(tabs[l][j]) < 10: continue 
          # selectivity must be 1
          if len(tabs[l][j]) != nval[l][j]: continue
          if len(tabs[k][i]) < 10 and len(tabs[l][j]) < 10:
            print("TABS", k, i, tabs[k][i])
            print("SIMT", l, j, tabs[l][j])
          fout.write("insert into lsh (k, i, l, j) values (%d, %d, %d, %d);\n" % (l, j, k, i))
  else:
    t4 = time()
    # need content for query?
    # fout.write("insert into lsh (k, i, l, j) values (%d, %d, %d, %d);\n" % (0, 0, 0, 0))
  t5 = time()
  print('hash queries done in %.1f seconds or %.1f minutes' % (t5-t4, (t5-t4)/60), file=sys.stderr)
  #
  fout.write("commit;\n")
  fout.close()
  tsfile.close()
  print('total run time     %.1f seconds or %.1f minutes' % (t5-t0, (t5-t0)/60), file=sys.stderr)
  sys.exit(0)

if '--profile' in sys.argv:
  print('profiling..', file=sys.stderr)
  prof = LineProfiler(main)
  prof.run('main()')
  prof.print_stats()
else:
  main()

