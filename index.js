const { Router } = require('express');
const express = require('express');
const { instruments } = require('music-instruments');
const { updateDB } = require('./server-functions/db-updates');
const { DB } = require('./server-functions/databases');
const path = require('path');

updateDB();

const router = Router();


router.use('/static', express.static('static'));

router.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'templates', 'index.html'));
});

router.post('/instruments', (req, res) => {
    res.json(instruments);
});

module.exports = router;