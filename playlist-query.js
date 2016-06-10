const Promise = require('bluebird');
const _ = require('lodash');
const args = require('minimist')(process.argv.slice(2));

const request = require('./request');
const db = require('./db');
const { YT_PLAYLIST_API_URI, YT_VIDEO_API_URI, YT_PLAYLIST_ID } = require('./constants');
require('log-timestamp');

function normalizeData(videos) {
  return _.map(videos, v => {
    const { title, description, thumbnails, resourceId, publishedAt, localized, tags } = v.snippet;
    thumbnails.maxres = thumbnails.maxres || {};
    const titleObj = {
      en: localized.title, 
      fi: title
    };
    const descriptionObj = {
      en: localized.description, 
      fi: description
    }
    return {
      _id: v.id,
      thumb: thumbnails.maxres.url ? thumbnails.maxres.url : v.snippet.thumbnails.high.url,
      time: publishedAt,
      title: titleObj,
      description: descriptionObj,
      tags
    };
  })
}

function filterVideosToQuery(foundIds) {
  if(args['update-all']) {
    return Promise.resolve(foundIds);
  }
  return db.find({})
    .then(foundVideos => {
      const storedIds = _.map(foundVideos, v => v._id);
      const newIds = _.difference(foundIds, storedIds);
      return newIds;
    });
}

function mapVideoId(data) {
  return _.map(data, d => d.contentDetails.videoId);
}

function getPlaylistItems() {
  console.log('Getting playlist data...')
  return request.make(YT_PLAYLIST_API_URI, {
    playlistId: YT_PLAYLIST_ID,
    part: 'contentDetails'
  })
  .then(d => {
    console.log('Playlist data query finished.')
    return d;
  })
  .then(mapVideoId)
}

function getVideoData(data) {
  console.log('Getting video datas...');
  let result = [];
  return Promise.each(data, (d, i) => {
    return request.make(YT_VIDEO_API_URI, {
      id: d,
      part: 'snippet',
      hl: 'en'
    })
    .then(d => result.push(d))
    .catch(err => {
      console.error(d, err)
    })
  })
  .then(d => {
    console.log('Video data query finished');
    return d;
  })
  .then(d => _.flatten(result))
}

function saveToMongo(data) {
  return Promise.each(data, d => {
    return db.update({_id: d._id}, d)
      .then(mess => {
        console.log(`video id updated: ${d._id}`, mess);
      })
      .catch(err => {
        console.error(d._id, err)
      })
  }).then(() => console.log('all videos updated'));
}

function start() {
  getPlaylistItems()
    .then(filterVideosToQuery)
    .then(getVideoData)
    .then(normalizeData)
    .then(saveToMongo)
    .then(d => {
      console.log('done, closing connection...');
      db.close();
    })
    .catch(e => {
      console.error(e);
      db.close();
    })
    .error(e => {
      console.error(e);
      db.close();
    })
}


start();