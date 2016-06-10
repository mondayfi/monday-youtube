const Promise = require('bluebird');
const _ = require('lodash');
const request = Promise.promisify(require('request'));
const { MAX_RESULTS, YT_API_KEY } = require('./constants');

function make(uri, qs) {
	let results = [];

	function recursive(pageToken) {
		return request({
			url: uri,
			qs: _.assign({}, qs, {
				maxResults: MAX_RESULTS,
				key: YT_API_KEY,
				pageToken
			})
		})
		.then(response => {
			if(response.statusCode != 200) {
					throw new Error('request failed');
			}
			const body = JSON.parse(response.body);
			const result = body.items;
			const pageToken = body.nextPageToken;
			results = results.concat(result);
			if(pageToken) {
					return recursive(pageToken);
			}
			return results;
		})
	}
	return recursive();
}

module.exports = {
	make
};
