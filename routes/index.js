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
    doc.scan({
        ProjectionExpression: "#l, #f, #fam, #rsvp",
        FilterExpression: "#fam = :f",
        ExpressionAttributeNames: {
            "#l": "last",
            "#f": "first",
            "#fam": "family",
            "#rsvp": "rsvp",
        },
        ExpressionAttributeValues: {
            ":f": family
        }
    }, function (err, data) {
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
        if (err) {
            response.error = err;
        }
        
        if (data.Item) {
            function getFamilyCallback(familyItems) {
                // Put the RSVP-er first
                var rsvper;
                familyItems = familyItems.filter(function (el, i) {
                    return !(el.first === req.query.first && el.last === req.query.last);
                });
                
                familyItems.splice(0, 0, {
                    first: data.Item.first.S,
                    last: data.Item.last.S,
                    family: data.Item.family ? data.Item.family.S : null,
                    rsvp: data.Item.rsvp ? data.Item.rsvp.BOOL : null
                });
                
                // build a simpler guest object
                response.guests = familyItems;

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
            
            if (data.Item.family && data.Item.family.S) {
                getFamily(data.Item.family.S, getFamilyCallback);
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
    var updatesLeft = req.body.rsvps.length;
    var familyRSVP = false;
    req.body.rsvps.forEach(function (el, i) {
        var response = {
            error: null,
            rsvp: null
        };
        
        var rsvpVal = el.rsvp ? el.rsvp === 'yes' : false;
        familyRSVP = familyRSVP || rsvpVal;
        
        var updateExpression = "set rsvp = :r",
            expressionAttr = {
                ":r": { BOOL: rsvpVal },
            };
        
        if (i === 0 && req.body.diet) {
            updateExpression += ", diet = :d";
            expressionAttr[":d"] = { S: req.body.diet };
        }
        
        if (i === 0 && req.body.note) {
            updateExpression += ", note = :n";
            expressionAttr[":n"] = { S: req.body.note };
        }

        db.updateItem({
            Key: {
                first: { S: el.first },
                last: { S: el.last }
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttr,
            ReturnValues: "ALL_NEW"
        }, function (err, data) {
            if (err) {
                response.error = err;
            }

            response.rsvp = familyRSVP;
            
            updatesLeft--;
            if (updatesLeft === 0) {
                res.end(JSON.stringify(response));
            }
        });
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