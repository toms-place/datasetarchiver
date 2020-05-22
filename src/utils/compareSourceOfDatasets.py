import json
obj = input()
obj = json.loads(obj)

resp = {}

for oldDataset in obj["old"]:
	for newDataset in obj["new"]:
		if (len(newDataset['meta']['source']) > 0):
			if (oldDataset['id'] == newDataset['id']):

				uniqueSourceIDs = list(set(oldDataset['meta']['source']) | set(newDataset['meta']['source']))

				#just add if new sources
				if (len(uniqueSourceIDs) > len(oldDataset['meta']['source'])):

					#search for key to have unique entries
					if oldDataset['_id'] in resp:

						#union on unique href key
						combinedUniqueSourceIDs = list(set(resp[oldDataset['_id']]) | set(uniqueSourceIDs))

						#just add if new sources
						if (len(combinedUniqueSourceIDs) > len(resp[oldDataset['_id']])):
							resp[oldDataset['_id']] = combinedUniqueSourceIDs

					#first key entry
					else:
						resp[oldDataset['_id']] = uniqueSourceIDs


print(json.dumps(resp))