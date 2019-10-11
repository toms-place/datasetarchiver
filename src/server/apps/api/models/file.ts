import {
	Document,
	DocumentQuery,
	Model,
	Schema,
	SchemaTypes,
	model
} from 'mongoose';
import {  ObjectID } from 'mongodb'


interface IFile extends Document {
	_id: ObjectID,
	length: number,
	chunkSize: number,
	uploadDate: Date,
	filename: string,
	md5: string,
	metadata: {
		dataset_ref_id: ObjectID,
		version: number
	}
}

export interface IFileModel extends Model < IFile, typeof fileQueryHelpers > {}

let fileSchema = new Schema({
	length: Number,
	chunkSize: Number,
	uploadDate: Date,
	filename: String,
	md5: String,
	metadata: {
		dataset_ref_id: SchemaTypes.ObjectId,
		version: Number
	}
})

let fileQueryHelpers = {
	getFiles(this: DocumentQuery < any, IFile > ) {
		return this.find({})
	},
	getFilesByDataset(this: DocumentQuery < any, IFile > , dataset_ref_id: number) {
		return this.find({
			'metadata.dataset_ref_id': dataset_ref_id
		})
	},
	getFileById(this: DocumentQuery < any, IFile > , id: string) {
		return this.findOne({
			'_id': id
		})
	},
	getFileByVersion(this: DocumentQuery < any, IFile > , dataset_ref_id: number, version: number) {
		return this.findOne({
			$and: [{
				'metadata.dataset_ref_id': dataset_ref_id
			}, {
				'metadata.version': version
			}]
		})
	},
	getLastTwoFileVersionsBy_dataset_ref_id(this: DocumentQuery < any, IFile > , dataset_ref_id:number, version1:number, version2:number) {
		return this.find({
			'metadata.dataset_ref_id': dataset_ref_id
		}).or([{
			'metadata.version': version1
		}, {
			'metadata.version': version2
		}])
	}
};

fileSchema.query = fileQueryHelpers

export default model < IFile, IFileModel > ('datasets.files', fileSchema)