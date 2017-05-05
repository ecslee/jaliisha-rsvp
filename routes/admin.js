var express = require('express');
var router = express.Router();
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
    var response = {
        yes: [],
        no: [],
        na: []
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
        
        res.render('admin', response);
    });
});

module.exports = router;