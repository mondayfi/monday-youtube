const _ = require('lodash');
const express = require('express');
const cors = require('cors');
const db = require('./db');
const port = 3000;
const app = express();

app.use(cors());

app.get('/videos/', (req, res) => db.find().then(d => res.json(d)));

app.get('/videos/:id', (req, res) => db.find({_id: req.params.id}).then(d => res.json(d)));

app.get('/videos/:lng/:slug', (req, res) => db.find({[`slug.${req.params.lng}`]: req.params.slug}).then(d => res.json(d)));

app.listen(port, () => console.log(`Listening on port ${port} !`));