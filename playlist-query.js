const Promise = require('bluebird');
const _ = require('lodash');

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

function mapVideoId(data) {
  return _.map(data, d => d.contentDetails.videoId);
}

function getPlaylistItems() {
  return request.make(YT_PLAYLIST_API_URI, {
    playlistId: YT_PLAYLIST_ID,
    part: 'contentDetails'
  }).then(mapVideoId)
}

function getVideoData(data) {
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
  }).then(d => _.flatten(result))
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
    .then(getVideoData)
    .then(normalizeData)
    .then(saveToMongo)
    .then(d => {
      console.log('done, closing connection...');
      db.close();
    });
}


start();