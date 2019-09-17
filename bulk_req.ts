import db from './server/common/database';
import FileTypeDetector from './server/utils/fileTypeDetector'
import {
	IDataset
} from './server/api/models/dataset';
import rp from 'request-promise-native'

var OFFSET = 0;
const batchAmount = 100;
var flag = true;

db.conn.on('connected', async () => {

	while (flag == true) {

		let data = JSON.parse(await rp.get(`https://data.wu.ac.at/sparql/?default-graph-uri=&query=SELECT+%3Furl+%3Fformat+%3Fdataset+%3Fportal%0D%0AFROM+%3Chttps%3A%2F%2Fdata.wu.ac.at%2Fportalwatch%2Fld%2F1937%3E+%0D%0AWHERE+%7B+%0D%0A++%7B%3Fportal+dcat%3Adataset+%3Fdataset.+%3Fdataset+dcat%3Adistribution+%3Fdist.+%3Fdist+dcat%3AaccessURL+%3Furl.+%3Fdist+dct%3Aformat+%3Fformat+.+%7D+%0D%0AUNION+%0D%0A++%7B%3Fportal+dcat%3Adataset+%3Fdataset.+%3Fdataset+dcat%3Adistribution+%3Fdist.+%3Fdist+dcat%3AaccessURL+%3Furl.+%3Fdist+dct%3Aformat+%3Fb+.+%3Fb+rdfs%3Alabel+%3Fformat+.+%7D%0D%0AFILTER+%28lcase%28str%28%3Fformat%29%29+%3D+%22csv%22%29%0D%0A%7D%0D%0ALIMIT+10000%0D%0AOFFSET+${OFFSET}%0D%0A&should-sponge=&format=json`))

		if (!data.results.bindings) {
			flag = false
			process.exit()
		} else if (data.results.bindings.length < 1) {
			flag = false
			process.exit()
		}
		let insertedTotal = 0;
		let batches = batch(data.results.bindings)

		for (let batch of batches) {
			let datasets: IDataset[] = []

			for (let i = 0; i < batch.length; i++) {

				try {
					let url = new URL(batch[i].url.value)

					//index key length max = 1024 bytes
					if (Buffer.byteLength(url.href, 'utf8') > 1024) {
						continue;
					}

					let dataset = new db.dataset({
						url: url,
						id: url.href,
						meta: undefined,
						crawl_info: undefined
					});

					if (batch[i].format) {
						let detector = new FileTypeDetector(batch[i].format.value, batch[i].format.value)
						dataset.meta.filetype = detector.mimeType
						dataset.meta.extension = detector.extension
					}

					if (batch[i].dataset) {
						dataset.meta.source.push(new URL(batch[i].dataset.value))
					}

					datasets.push(dataset)

				} catch (error) {
					console.error('mongoose db class', error.message)
				}

			}

			let insertCount = await db.dataset.addMany(datasets)
			insertedTotal += insertCount
			console.log('inserted', insertCount)
		}

		console.log('Total inserted', insertedTotal)
		OFFSET += 10000;

	}

})


function batch(data) {
	let batches = [];
	let count = 0;
	batches[count] = [];
	for (let i = 1; i < data.length; i++) {
		try {
			batches[count].push(data[i])
			if (i % batchAmount == 0) {
				count++;
				batches[count] = [];
			}
			if (i == data.length - 1) {
				batches[count].push(data[0])
			}
		} catch (error) {
			console.log(error)
		}
	}

	return batches
}