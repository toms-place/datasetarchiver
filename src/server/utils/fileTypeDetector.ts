import mime from 'mime';
import FileType from 'stream-file-type';

/**
 * Parses mime-type and file extension name, giving mime type more weight
 */
export default class fileTypeDetector extends FileType{
	mimeType: string;
	extension: string;
	stackCount: number;

	constructor(mimeType ? : string, extension ? : string) {
		super()
		this.mimeType = mimeType;
		this.extension = extension;
		this.stackCount = 0;
		if (extension) this.setExtension(extension);
		if (mimeType) this.setMimeType(mimeType);
	}

	setMimeType(mimeType ? : string) {
		//try to parse extension of mimeType
		let extension = mime.getExtension(mimeType)
		if (extension) {
			this.extension = extension
			this.mimeType = mimeType
		} else {
			//try to parse mime type of extension
			let mimeTypeNew = mime.getType(mimeType)
			if (mimeTypeNew) {
				this.mimeType = mimeTypeNew
				this.extension = mime.getExtension(mimeTypeNew)
			} else {
				this.extension = ''
				this.mimeType = ''
			}
		}
	}

	setExtension(extension ? : string) {
		//try to parse mime type of extension
		let mimeType = mime.getType(extension)
		if (mimeType) {
			this.mimeType = mimeType
			this.extension = extension
		} else {
			//try to parse extension of extension
			let extensionNew = mime.getExtension(extension)
			if (extensionNew) {
				this.extension = extensionNew
				this.mimeType = mime.getType(extensionNew)
			} else {
				this.extension = ''
				this.mimeType = ''
			}
		}
	}
}