import json
obj = input()
obj = json.loads(obj)

resp = {}

for ds in obj["old"]:
	resp[ds["_id"]] = []
	for ds2 in obj["new"]:
		if (ds['id'] == ds2['id']):
			for src in ds['meta']['source']:
				for src2 in ds2['meta']['source']:
					if (src['href'] == src2['href'] ):
						resp[ds["_id"]].append(src2['href'])
	if (len(resp[ds["_id"]]) == 0):
		del resp[ds["_id"]]

print(json.dumps(resp))