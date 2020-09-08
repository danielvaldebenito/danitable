import express from 'express';
const app = express();

app.use('/', express.static(__dirname + '/src'));

app.listen(3000, () => console.log('Example app listening on port 3000!'));