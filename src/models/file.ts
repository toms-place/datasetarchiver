import mongoose, {
	Document,
	DocumentQuery,
	Model,
	Schema,
	SchemaTypes,
	model,
} from 'mongoose'
import {
	ObjectId
} from 'mongodb'


export interface IFile extends Document {
	_id: string;
	length: number;
	chunkSize: number;
	uploadDate: Date;
	filename: string;
	md5: string;
	metadata: {
		dataset_ref_id: ObjectId;
		dataset_ref_url: string;
		version: number;
		filetype: string;
	};
}

const fileQueryHelpers = {
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
	getFileByVersion(this: DocumentQuery < any, IFile > , dataset_ref_id: ObjectId, version: number) {
		return this.findOne({
			$and: [{
				'metadata.dataset_ref_id': dataset_ref_id
			}, {
				'metadata.version': version
			}]
		})
	},
	getLastTwoFileVersionsBy_dataset_ref_id(this: DocumentQuery < any, IFile > , dataset_ref_id: ObjectId, version1: number, version2: number) {
		return this.find({
			'metadata.dataset_ref_id': dataset_ref_id
		}).or([{
			'metadata.version': version1
		}, {
			'metadata.version': version2
		}])
	}
}
export type IFileModel = Model < IFile, typeof fileQueryHelpers >

const fileSchema = new Schema({
	_id: String,
	length: Number,
	chunkSize: Number,
	uploadDate: Date,
	filename: String,
	md5: String,
	metadata: {
		dataset_ref_id: {
			type: SchemaTypes.ObjectId,
			index: true
		},
		dataset_ref_url: {
			type: String,
			default: '',
			index: true
		},
		version: {
			type: Number,
			index: true
		},
		filetype: {
			type: String,
			default: '',
			index: true
		}

	}
})


fileSchema.query = fileQueryHelpers

export default model < IFile, IFileModel > ('datasets.files', fileSchema)