var express = require('express');
var router = express.Router();

var AWS = require('aws-sdk');

var db = new AWS.DynamoDB({
    apiVersion: '2012-08-10',
    region: 'us-west-2',
    params: {
        TableName: 'jaliisha-rsvp'
    }
});

var doc = new AWS.DynamoDB.DocumentClient({
    apiVersion: '2012-08-10',
    region: 'us-west-2',
    params: {
        TableName: 'jaliisha-rsvp'
    }
});

router.get('/', function (req, res) {
    res.render('index');
});

router.get('/name', function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    var response = {
        error: null,
        guest: null
    };
    
    db.getItem({
        Key: {
            first: { S: req.query.first },
            last: { S: req.query.last }
        }
    }, function (err, data) {
        console.log(data);
        if (err) {
            response.error = err;
        }
        
        if (data.Item) {
            // build a simpler guest object
            response.guest = {
                first: data.Item.first.S,
                last: data.Item.last.S,
                rsvp: data.Item.rsvp ? data.Item.rsvp.BOOL : null,
                data: data.Item.data
            };
        }
        
        res.end(JSON.stringify(response));
    });
});

router.post('/edit-rsvp', function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    var val = (req.query && req.query.rsvp) ? (req.query.rsvp === 'yes') : false;
    var response = {
        error: null,
        rsvp: null
    };
    
    db.putItem({
        Item: {
            first: { S: req.query.first },
            last: { S: req.query.last },
            rsvp: { BOOL: val }
        }
    }, function (err, data) {
        if (err) {
            response.error = err;
        }
        
        response.rsvp = val;
        res.end(JSON.stringify(response));
    });
});

router.post('/submit', function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    var val = (req.body && req.body.rsvp) ? (req.body.rsvp === 'yes') : false;
    var response = {
        error: null,
        rsvp: null
    };
    
    var item = {
        first: { S: req.body.first },
        last: { S: req.body.last },
        rsvp: { BOOL: val }
    };
    
    if (req.body.diet) {
        item.diet = { S: req.body.diet }
    }
    
    if (req.body.note) {
        item.note = { S: req.body.note }
    }
    
    db.putItem({
        Item: item
    }, function (err, data) {
        if (err) {
            response.error = err;
        }
        
        response.rsvp = val;
        res.end(JSON.stringify(response));
    });
});

router.get('/rsvp-all', function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    var response = {
        yes: [],
        no: [],
        na: []
    };
    
    doc.scan({
        ProjectionExpression: "#l, #f, #rsvp",
        ExpressionAttributeNames: {
            "#l": "last",
            "#f": "first",
            "#rsvp": "rsvp",
        },
    }, function (err, data) {
        console.log('err', err);
        console.log('data', data);
        
        if (err) {
            response.error = err;
        }
        
        data.Items.forEach(function (item, i) {
            if (typeof item.rsvp === 'boolean' && item.rsvp === true) {
                response.yes.push(item);
            } else if (typeof item.rsvp === 'boolean' && item.rsvp === false) {
                response.no.push(item);
            } else {
                response.na.push(item);
            }
        });
        
        res.end(JSON.stringify(response));
    });
});

router.get('/rsvp-yes', function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    doc.scan({
        ProjectionExpression: "#l, #f, #rsvp",
        FilterExpression: "#rsvp = :val",
        ExpressionAttributeNames: {
            "#l": "last",
            "#f": "first",
            "#rsvp": "rsvp",
        },
        ExpressionAttributeValues: {
             ":val": true,
        }
    }, function (err, data) {
        var response = {};
        console.log('err', err);
        console.log('data', data);
        
        if (err) {
            response.error = err;
        }
        
        response.guests = data;
        res.end(JSON.stringify(response));
    });
});

router.get('/rsvp-no', function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    doc.scan({
        ProjectionExpression: "#l, #f, #rsvp",
        FilterExpression: "#rsvp = :val",
        ExpressionAttributeNames: {
            "#l": "last",
            "#f": "first",
            "#rsvp": "rsvp",
        },
        ExpressionAttributeValues: {
             ":val": false,
        }
    }, function (err, data) {
        var response = {};
        console.log('err', err);
        console.log('data', data);
        
        if (err) {
            response.error = err;
        }
        
        response.guests = data;
        res.end(JSON.stringify(response));
    });
});

router.get('/rsvp-reply', function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    doc.scan({
        ProjectionExpression: "#l, #f, #rsvp",
        FilterExpression: "#rsvp = :t or #rsvp = :f",
        ExpressionAttributeNames: {
            "#l": "last",
            "#f": "first",
            "#rsvp": "rsvp",
        },
        ExpressionAttributeValues: {
             ":t": true,
             ":f": false,
        }
    }, function (err, data) {
        var response = {};
        console.log('err', err);
        console.log('data', data);
        
        if (err) {
            response.error = err;
        }
        
        response.guests = data;
        res.end(JSON.stringify(response));
    });
});

router.get('/rsvp-null', function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    doc.scan({
        ProjectionExpression: "#l, #f, #rsvp",
        FilterExpression: "not (#rsvp = :t or #rsvp = :f)",
        ExpressionAttributeNames: {
            "#l": "last",
            "#f": "first",
            "#rsvp": "rsvp",
        },
        ExpressionAttributeValues: {
             ":t": true,
             ":f": false,
        }
    }, function (err, data) {
        var response = {};
        console.log('err', err);
        console.log('data', data);
        
        if (err) {
            response.error = err;
        }
        
        response.guests = data;
        res.end(JSON.stringify(response));
    });
});

module.exports = router;