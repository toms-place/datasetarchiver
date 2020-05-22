import {
	PythonShell
} from 'python-shell'
import { IDataset } from '../models/dataset'
import path from 'path'

export default async function compareSourceOfDatasets(oldDS: IDataset[], newDS: IDataset[]): Promise <any> {
	return new Promise((resolve, reject) => {
		const pyshell = new PythonShell(path.join(__dirname, '/compareSourceOfDatasets.py'), {
			mode: 'text'
		})

		const js = {
			old: oldDS,
			new: newDS
		}

		let returnMessage: unknown

		// sends a message to the Python script via stdin
		pyshell.send(JSON.stringify(js))

		pyshell.on('message', function (message) {
			// received a message sent from the Python script (a simple "print" statement)
			returnMessage = JSON.parse(message)
		})

		pyshell.on('stderr', function (stderr) {
			// handle stderr (a line of text from stderr)
			console.log(stderr)
		})

		// end the input stream and allow the process to exit
		pyshell.end(function (err, code, signal) {
			if (err) reject(err)
			resolve(returnMessage)
		})

	})
}