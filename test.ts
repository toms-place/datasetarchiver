import db from "./src/server/common/database"
import compareSourceOfDatasets from "./src/server/utils/compareSourceOfDatasets"

let main = async () => {
	let oldDatasets = await db.dataset.find().limit(10000)
	let datasets = await db.dataset.find().limit(10000)

	console.log(new Date())
	let datasetsToSave;
	try {
		datasetsToSave = await compareSourceOfDatasets(oldDatasets, datasets)
	} catch (error) {
		console.log(error)
	}

	for (let _id in datasetsToSave) {
		let srcArray = []
		for (let src of datasetsToSave[_id]) {
			try {
				srcArray.push(new URL(src))
			} catch (error) {
				continue;
			}
		}

		let res = await db.dataset.findOneAndUpdate({
			_id: _id
		}, {
			"$push": {
				"meta.source": {
					"$each": srcArray
				}
			}
		});
		console.log(res)
	}
	console.log(new Date())
	process.exit()
}

main()