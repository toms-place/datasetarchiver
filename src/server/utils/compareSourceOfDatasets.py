import json
obj = input()
obj = json.loads(obj)

resp = {}

for oldDataset in obj["old"]:
	for newDataset in obj["new"]:
		if (len(newDataset['meta']['source']) > 0):
			if (oldDataset['id'] == newDataset['id']):

				#union on unique href key
				list_of_dicts = oldDataset['meta']['source'] + newDataset['meta']['source']
				dicts = list({v['href']:v for v in list_of_dicts}.values())

				#just add if new sources
				if (len(dicts) > len(oldDataset['meta']['source'])):

					#search for key to have unique entries
					if oldDataset['_id'] in resp:

						#union on unique href key
						list_of_dicts = resp[oldDataset['_id']] + dicts
						newdicts = list({v['href']:v for v in list_of_dicts}.values())

						#just add if new sources
						if (len(newdicts) > len(resp[oldDataset['_id']])):
							resp[oldDataset['_id']] = newdicts

					#first key entry
					else:
						resp[oldDataset['_id']] = dicts


print(json.dumps(resp))