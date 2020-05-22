import mongoose, {
	Document,
	Model
} from 'mongoose'
import cf from '../config'

export interface IMeta {
	title: string;
	desc: string;
}

export interface ISource extends Document {
	href: URL['href'];
	origin: URL['origin'];
	protocol: URL['protocol'];
	username: URL['username'];
	password: URL['password'];
	host: URL['host'];
	hostname: URL['hostname'];
	port: URL['port'];
	pathname: URL['pathname'];
	search: URL['search'];
	hash: URL['hash'];
	meta: IMeta;
}
const hostQueryHelpers = {}

export type ISourceModel = Model < ISource, typeof hostQueryHelpers >

const sourceSchema = new mongoose.Schema({
	href: {
		type: String,
		unique: true
	},
	origin: String,
	protocol: String,
	username: String,
	password: String,
	host: String,
	hostname: {
		type: String,
		index: true
	},
	port: String,
	pathname: String,
	search: String,
	hash: String,
	meta: {
		type: Object,
		default: {},
		title: {
			type: String,
			default: ''
		},
		desc: {
			type: String,
			default: ''
		},
		keywords: {
			type: Array,
			default: []
		}
	}
})


if (cf.PRODUCTION) sourceSchema.set('shardKey', {href:1})

export default mongoose.model < ISource, ISourceModel > ('sources', sourceSchema)