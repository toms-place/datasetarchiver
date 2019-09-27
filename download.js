const https = require('https')
const http = require('http')
const fs = require('fs')
const extension = process.env.ext || 'csv'
let agent = 'https'
const server = 'https://k8s.ai.wu.ac.at/crawler/api/v1'
//const server = 'http://localhost:3000/crawler/api/v1'
const targetDir = process.env.dir || __dirname
const targetFilesDir = '/files'

let metaString = "";

let getVersions = () => {
	return new Promise((resolve, reject) => {
		let chunks = '';
		agent.get(server + '/getVersions?byType=' + extension, (res) => {
			res.on('data', (chunk) => {
				chunks += chunk
			});

			res.on('end', () => {
				if (res.complete) {
					resolve(chunks)
				}
			});
		})
	})
}

let checkForFile = async (id) => {
	let promise = new Promise((resolve, reject) => {
		fs.readFile(`${targetDir + targetFilesDir}/${id}.${extension}`, (err, data) => {
			if (err) {
				resolve(false);
			} else {
				resolve(true);
			}
		});
	})
	return promise
}

let saveFile = async (versions, iterator, last) => {

	let meta;
	let file_id = versions.file_ids[versions.file_ids.length - 1]

	let fileExists = await checkForFile(file_id)

	if (!fileExists) {

		let data = await new Promise((resolve, reject) => {
			agent.get(`${server}/getFile?id=${file_id}`, (res) => {
				let chunks = '';

				res.on('data', (chunk) => {
					chunks += chunk
				});

				res.on('end', () => {
					if (res.complete) {
						resolve(chunks)
					}
				});
			})
		})

		//save file name=file.dataset_id
		await new Promise((resolve, reject) => {
			fs.writeFile(`${targetDir + targetFilesDir}/${file_id}.${extension}`, data, function (err) {
				if (err) {
					reject(console.log(err));
				}
				resolve(console.log("The file was saved!"));
			});
		})

	}

	//produce meta
	meta = new Object()
	meta.filename_ref = `${file_id}.${extension}`
	meta.file_id = file_id
	meta.dataset_id = versions.dataset_id
	meta.dataset_url = versions.dataset_url
	meta.meta = versions.meta

	if (iterator == last - 1) {
		metaString += JSON.stringify(meta) + ']';
	} else if (iterator == 0) {
		metaString += '[' + JSON.stringify(meta) + ',\n';
	} else {
		metaString += JSON.stringify(meta) + ',\n';
	}

}

let saveMeta = () => {
	fs.writeFile(`${targetDir}/meta.json`, metaString, function (err) {
		if (err) {
			return console.log(err);
		}
		console.log("The meta was saved!");
	});
}

let clearFS = async (versions) => {

	let newFiles = [];

	for (let i = 0; i < versions.length; i++) {
		newFiles.push(`${versions[i].file_ids[versions[i].file_ids.length - 1]}.${extension}`)
	}

	await new Promise((resolve, reject) => {
		fs.readdir(targetDir + targetFilesDir, function (err, files) {
			//handling error
			if (err) {
				reject('Unable to scan directory: ' + err);
			}
			//listing all files using forEach
			files.forEach(async function (file) {
				// Do whatever you want to do with the file
				if (!newFiles.includes(file)) {
					console.log('old file', file)
					//fs.unlinkSync(`${targetDir + targetFilesDir}/${file}`)
					let fn = await new Promise((resolve, reject) => {
						fs.unlink(`${targetDir + targetFilesDir}/${file}`, function (err) {
							if (err) throw err;
							// if no error, file has been deleted successfully
							resolve('File deleted!');
						});
					})
					console.log(fn)
				}
			});
			resolve()
		});
	})

}

let setAgent = () => {
	switch (agent) {
		case 'http':
			agent = http
			break;
		case 'https':
			agent = https
			break;
		default:
			agent = https
			break;
	}
}

let main = async () => {
	try {
		fs.mkdirSync(targetDir + targetFilesDir, {
			recursive: true
		});
		setAgent()
		let versions = JSON.parse(await getVersions())
		clearFS(versions)

		for (let i = 0; i < versions.length; i++) {
			await saveFile(versions[i], i, versions.length)
		}
		saveMeta()

	} catch (error) {
		console.log(error)
	}
}

main()