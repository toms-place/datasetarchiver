import L from '../utils/logger'
import db from '../utils/database'
import {
	ISource,
	IMeta
} from '../models/source'

export default class SourceService {

	static async updateSource(href: URL['href'], meta: IMeta): Promise < ISource > {
		try {

			const source = await db.source.findOne({
				href: href
			})
			if (source) {

				let flag = false
				if (source.meta.title != meta.title) {
					flag = true
					source.meta.title = meta.title
				}
				if (source.meta.desc != meta.desc) {
					flag = true
					source.meta.desc = meta.desc
				}
				if (flag) return await source.save()
				else return

			} else {
				const url = new URL(href)
				return await new db.source({
					href: url.href,
					origin: url.origin,
					protocol: url.protocol,
					username: url.username,
					password: url.password,
					host: url.host,
					hostname: url.hostname,
					port: url.port,
					pathname: url.pathname,
					search: url.search,
					hash: url.hash,
					meta
				}).save()
			}

		} catch (error) {
			L.error(error)
			return
		}

	}
}

/*
function union_arrays(x, y) {
  var obj = {};
  for (var i = x.length - 1; i >= 0; --i)
    obj[x[i]] = x[i];
  for (var i = y.length - 1; i >= 0; --i)
    obj[y[i]] = y[i];
  var res = []
  for (var k in obj) {
    if (obj.hasOwnProperty(k)) // <-- optional
      res.push(obj[k]);
  }
  return res;
}
*/