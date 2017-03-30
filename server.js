var express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser');

var port = process.env.PORT || 3000;

var app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

var index = require('./routes/index');
app.use('/', index);

var admin = require('./routes/admin');
app.use('/admin', admin);

app.listen(port, function () {
    console.log(`Server running at :${port}`);
});

module.exports = app;
