var express = require('express');
var router = express.Router();
var EJS = require('ejs');

var AWS = require('aws-sdk');

var db = new AWS.DynamoDB({
    apiVersion: '2012-08-10',
    region: 'us-west-2',
    params: {
        TableName: 'rsvp'
    }
});

var doc = new AWS.DynamoDB.DocumentClient({
    apiVersion: '2012-08-10',
    region: 'us-west-2',
    params: {
        TableName: 'rsvp'
    }
});

router.get('/', function (req, res) {
    res.render('admin-password');
});

router.get('/rsvps', function (req, res) {
    var response = {
        yes: [],
        no: [],
        na: [],
        error: null
    };
    
    doc.scan({
        ProjectionExpression: "#l, #f, #d, #fam, #rsvp, #diet, #song, #note",
        ExpressionAttributeNames: {
            "#l": "last",
            "#f": "first",
            "#d": "display",
            "#fam": "fam",
            "#rsvp": "rsvp",
            "#diet": "diet",
            "#song": "song",
            "#note": "note"
        },
    }, function (err, data) {
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
        
        res.render('admin', response);
    });
});

router.post('/auth', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    var password = req.body.password;
    
    db.getItem({
        Key: {
            first: { S: 'ALEKSI' },
            last: { S: 'LEE' }
        }
    }, function (err, data) {
        var response = {
            error: null,
            auth: false
        }
        
        if (err) {
            response.error = err
        }
        
        if (data.Item && data.Item.fam && data.Item.fam.S === password) {
            response.auth = true;
        }
        
        res.end(JSON.stringify(response));
    });
    
});

module.exports = router;