import mongoose, {
	Document,
	DocumentQuery,
	Model
} from 'mongoose';

export interface ISource extends Document {
	id: string,
	url: string,
	datasets: number[]
}

export interface ISourceModel extends Model < ISource, typeof hostQueryHelpers > {
}

let sourceSchema = new mongoose.Schema({
	id: {
		type: String,
		required: true,
		unique: true
	},
	url: {
		type: mongoose.Schema.Types.Mixed,
		required: true,
	},
	datasets: [{
		type: mongoose.SchemaTypes.ObjectId,
	}]
})

let hostQueryHelpers = {
	
};

sourceSchema.query = hostQueryHelpers

export default mongoose.model < ISource, ISourceModel > ('source', sourceSchema)