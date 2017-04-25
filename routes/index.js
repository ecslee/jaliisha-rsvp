var express = require('express');
var router = express.Router();
var EJS = require('EJS');

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

function parseFamily(itemFamily) {
    var family = [];

    if (itemFamily && itemFamily.L) {
        for (var n = 0; n < itemFamily.L.length; n++) {
            var name = itemFamily.L[n].S.split(', ');
            family.push({
                first: name[1],
                last: name[0]
            });
        }
    }
    
    return family;
}

function getFamily(family, callback) {
    var familyList = parseFamily(family);
    
    var filterExp = '',
        attributeVals = {},
        lastNames = [];
    for (var f = 0; f < familyList.length; f++) {
        if (lastNames.indexOf(familyList[f].last) === -1) {
            lastNames.push(familyList[f].last);
            attributeVals[':l' + (lastNames.length - 1)] = familyList[f].last;
        }
        
        attributeVals[':f' + f] = familyList[f].first;
        filterExp += '(#l = :l' + lastNames.indexOf(familyList[f].last)
                   + ' and #f = :f' + f + ') or ';
    }
    filterExp = filterExp.slice(0, -4);
    
    doc.scan({
        ProjectionExpression: "#l, #f, #rsvp",
        FilterExpression: filterExp,
        ExpressionAttributeNames: {
            "#l": "last",
            "#f": "first",
            "#rsvp": "rsvp",
        },
        ExpressionAttributeValues: attributeVals
    }, function (err, data) {
        console.log('err', err);
        console.log('data', data);
        
        if (err) {
            callback(err);
        } else {
            callback(data.Items);
        }
        
        return;
    });
}

router.get('/invite', function (req, res, next) {
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
            function getFamilyCallback(familyItems) {
                familyItems.splice(0, 0, {
                    first: data.Item.first.S,
                    last: data.Item.last.S,
                    rsvp: data.Item.rsvp ? data.Item.rsvp.BOOL : null
                });
                
                // build a simpler guest object
                response.guest = {
                    first: data.Item.first.S,
                    last: data.Item.last.S,
                    rsvp: data.Item.rsvp ? data.Item.rsvp.BOOL : null,
                    family: familyItems
                };

                var rsvpList = EJS.renderFile(
                    'views/rsvp-list.ejs',
                    { family: familyItems },
                    function (err, str) {
                        if (err) {
                            response.error = err;
                        }
                        response.rsvpList = str;
                        res.end(JSON.stringify(response));
                });
            }
            
            if (data.Item.family && data.Item.family.L && data.Item.family.L.length > 0) {
                getFamily(data.Item.family, getFamilyCallback);
            } else {
                getFamilyCallback([]);
            }
        }
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