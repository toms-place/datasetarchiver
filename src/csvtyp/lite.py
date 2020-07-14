import sys

ntfile = sys.argv[1]

labf = open("lab.csv", "w")
p31f = open("p31.csv", "w")
p279f = open("p279.csv", "w")

lc = 0
for line in open(ntfile, encoding='utf8'):
  line = line.strip()
  i = line.index(' ')
  subj = line[:i]
  subj = subj[subj.rfind('/')+1:-1]
  j = line.index(' ', i+1)
  prop = line[i+1:j]
  obj = line[j+1:-2]
  if prop == '<http://www.wikidata.org/prop/direct/P31>':
    obj = obj[obj.rfind('/')+1:-1]
    p31f.write(subj + ',' + obj + "\n")
  elif prop == '<http://www.w3.org/2000/01/rdf-schema#label>':
    k = obj.rfind('@')
    lab = obj[:k].replace('\\"', '')
    lang = obj[k+1:]
    # ignore language regions
    # if '-' in lang:
    #   lang = lang[:lang.find('-')]
    if lang[:2] == 'en' or lang[:2] == 'de':
      labf.write(subj + ',' + lab + ',' + lang + "\n")
  elif prop == '<http://www.wikidata.org/prop/direct/P279>':
    obj = obj[obj.rfind('/')+1:-1]
    p279f.write(subj + ',' + obj + "\n")
  lc += 1
  # if lc > 10000000: break

labf.close()
p31f.close()
p279f.close()
