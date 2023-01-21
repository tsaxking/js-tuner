const express = require('express');



const app = express();
const port = 5555;

app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});

app.get('/', (req, res) => res.redirect('/tuner'));

app.use('/tuner', require('./index'));

app.listen(port, () => console.log(`Example app listening on port ${port}...`));