const mongoose = require('mongoose');
const Promise = require('bluebird');
const _ = require('lodash');
const moment = require('momentjs');
const Schema = mongoose.Schema;
const args = require('minimist')(process.argv.slice(2));
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/monday-youtube'; 

mongoose.connect(mongoUri, err => {
	if(err) {
		throw new Error(err);
	}
});

const VideoSchema = new Schema(
	{
	  _id: { type: String, required: true },
	  thumb: { type: String, required: true},
	  time: Date,
	  title: Schema.Types.Mixed,
	  description: Schema.Types.Mixed,
	  slug: Schema.Types.Mixed,
	  tags: Array
	},
	{
		timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
	}
);

const Video = mongoose.model('Video', VideoSchema);

Promise.promisifyAll(Video);

function find(query, options) {
 	return Video.findAsync(query, options);
}

function findOne(query, options) {
 	return Video.findOneAsync(query, options);
}

function findLatest() {
	const query = Video.find({}).sort({time: -1}).limit(1);
	return query.exec()
		.then(d => _.head(d));
}

function update(query, data) {
	return Video.updateAsync(query, _.omit(data, '_id'), { upsert: true });
}

function close() {
	mongoose.connection.close();
}

module.exports = {
	find,
	findOne,
	findLatest,
	update,
	close
};