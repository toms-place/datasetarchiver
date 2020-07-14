# assign Wikidata column types to CSV files
# args: [csv file with labels and types] [text file with names of CSV files to be typed]
import sys
import os
import csv
import json
from collections import defaultdict, Counter
from time import time
import numpy as np

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
  print("insert into err (typ, msg, fn, col, src) values ('%s', '%s', '%s', %d, '%s');\n" % (typ, msg, fn, col, fn[6:9]), file=sys.stderr)

# fraction of elements in a contained in b
def fracsubset(a, b):
  # construct intersection and immediately throw it away, just keep the length
  # somehow calculating length directly should be faster..but isnt
  # pure Python still best performance. not surprsing since most a and b very small
  return len(a.intersection(b)) / len(a)

# read files and assign types
def main():
  typfn = sys.argv[1]
  listfn = sys.argv[2]
  GB = 1024*1024*1024
  # types file
  t0 = time()
  # print('reading types ..', file=sys.stderr)
  types = defaultdict(set)
  # f = open(typfn, encoding='utf-8')
  for row in open(typfn, encoding='utf-8'): # csv.reader(f, delimiter=','):
    i = row.rfind(',')
    lab = row[:i].strip('"') # if quoted
    typ = row[i+1:].strip()
    if typ == 't': continue # header
    types[lab].add(typ)
  # f.close()
  t1 = time()
  # print('labels and types read in %.1f seconds or %.1f minutes' % (t1-t0, (t1-t0)/60), file=sys.stderr)
  # read file list
  files = [ f.strip() for f in open(listfn).readlines() ]
  # typsets = {}
  tabs = {}
  nval = {}
  # stats = {}
  # hdr = 0
  # rtyp = defaultdict(int) # consistent row types
  # go through the files to type
  for fn in files:
    res = readf(fn, 'csv')
    if res == -1: 
      continue # error reading file
    cols, h, nrows, ncols = res
    nval = {} # lengths of columns as lists, after removing ignored elements
    tabs = {} # sets of col values, after removing ignored
    typsets = {}
    ign = ('null', 'true', 'false', 't', 'f', 'yes', 'no', 'y', 'n', 'none', 'na', 'n/a', 'nan', 'n.a.', 'male', 'female', 'm', 'f', 'e')
    for i in (0,): # range(len(cols)):
      lst = [ x.strip() for x in cols[i] if len(x.strip()) > 0 ]
      if len(lst) == 0:
        err('col', 'all empty', fn, i)
        continue
      # only need list length and set for finding reference cols, not whole list: save lots of memory
      nval[i] = len(lst) 
      tabs[i] = set(lst) 
      # selectivity 
      # sel = len(tabs[i]) / len(lst)
      # fout.write("insert into sel (tab, col, nval, ndist, sel) values(%d, %d, %d, %d, %f);\n" % (k, i, len(lst), len(tabs[i]), sel))
      # get all type sets
      tsets = [ types[x] for x in lst ]
      ts = set.union(*tsets)
      for t in ts:
        # for more than one known value of type t: fraction of column values that are of type t
        # if len(labels[t]) < 2: continue
        f = sum([ int(t in s) for s in tsets ]) / len(lst)
        # type coverage: fraction of col values of type t in relation to all known values of this type
        # tset = set([ x for x in lst if t in types[x] ]) # col vals of type t
        # cov = len(tset) / len(labels[t]) 
        # fout.write("insert into col (tab, col, typ, frac, cov) values (%d, %d, '%s', %f, %f);\n" % 
        #   (k, i, t.replace("'", "").replace('"', ''), f, cov))
        if f >= 1.0: # ignore f < 1
          if t != 'www.w3.org/2002/07/owl#Thing': 
            # column i in file fn has type t for at least fraction f of elements (set)
            print("%s,%d,%s" % (fn, i, t))
  t2 = time()
  # print('files processed in %.1f seconds or %.1f minutes' % (t2-t1, (t2-t1)/60), file=sys.stderr)

if __name__ == '__main__':
  main()

