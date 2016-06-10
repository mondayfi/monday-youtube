const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const Memcached = require('memcached');
const schedule = require('node-schedule');
const _ = require('lodash');
const express = require('express');

const app = express();

const YT_API_KEY = 'AIzaSyAFT6QJL1Cc4IQKwFU0g6IG8PSjaSUKRJY';
const PLAYLIST_ID = 'PLdREOGO0CSCoQsE2bQKTUo5pTOwlPUcO2';
const API_URI = 'https://www.googleapis.com/youtube/v3/playlistItems';
const MAX_RESULTS = 10;

const EXPIRATION_TIME = 86400; // one day in secs

const memcached = new Memcached('localhost:11211', { maxExpiration: EXPIRATION_TIME, retries:10,retry:10000,remove:true });
const set = Promise.promisify(memcached.set);

function normalizeData(videos) {
	return _.map(videos, v => {
		const { title, description, thumbnails, resourceId, publishedAt } = v.snippet;
		return {
			id: resourceId.videoId,
			thumb: v.snippet.thumbnails.standard ? v.snippet.thumbnails.standard.url : v.snippet.thumbnails.high.url,
			time: publishedAt,
			title,
			description
		};
	})
}

function saveDataToMemcached(videos) {
	return new Promise((resolve, reject) => {
		memcached.set('monday-videos', JSON.stringify(videos), EXPIRATION_TIME, err => {
			if(err) {
				reject(err);
			} else {
				resolve(videos);
			}
		});
	});
}

function makeRequest() {
	let results = [];

	function recursive(pageToken) {
		return request({
			url: API_URI,
			qs: {
				part:'snippet',
				maxResults: MAX_RESULTS,
				playlistId: PLAYLIST_ID,
				key: YT_API_KEY,
				hl: 'en',
				pageToken
			}
		})
		.then(response => {
			if(response.statusCode != 200) {
				throw new Error('request failed');
			}
			const data = JSON.parse(response.body);
			const videos = normalizeData(data.items);
			const pageToken = data.nextPageToken;
			results = results.concat(videos);
			if(pageToken) {
				return recursive(pageToken);
			}
			return results;
		})
	}

	return recursive();
}

function fetchData() {
	return makeRequest()
		.then(saveDataToMemcached)
}

function checkMemCached() {
	return new Promise((resolve, reject) => {
		memcached.get('monday-videos', (err, d) => {
			if(err) {
				reject(err);
			} else {
				resolve(d);
			}
		});
	});
}

function getData() {
	return checkMemCached()
		.then(d => {
			if(d) {
				return d;
			}
			return fetchData();
		});
}

app.get('/', (req, res) => getData().then(d => res.json(JSON.parse(d))));

app.listen(3000, () => console.log('Example app listening on port 3000!'));

fetchData();
// schedule.scheduleJob('*/1 * * * *', () => {
// 	fetchData()
// });