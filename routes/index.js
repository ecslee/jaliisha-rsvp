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

function getFamily(familyName, callback) {
    doc.scan({
        ProjectionExpression: "#l, #f, #d, #fam, #rsvp, #diet, #note",
        FilterExpression: "#fam = :f",
        ExpressionAttributeNames: {
            "#l": "last",
            "#f": "first",
            "#d": "display",
            "#fam": "fam",
            "#rsvp": "rsvp",
            "#diet": "diet",
            "#note": "note"
        },
        ExpressionAttributeValues: {
            ":f": familyName
        }
    }, function (err, data) {
        if (err) {
            callback(familyName, err);
        } else {
            callback(familyName, data.Items);
        }
        
        return;
    });
}

router.get('/invite', function (req, res, next) {
    console.log(`RSVP CALL    [find name] ${req.query.last}, ${req.query.first}`);
    
    res.setHeader('Content-Type', 'application/json');
    var response = {
        error: null,
        guest: null
    };
    
    var findFirst = req.query.first,
        findLast = req.query.last;
    
    db.getItem({
        Key: {
            first: { S: findFirst },
            last: { S: findLast }
        }
    }, function (err, data) {
        if (err) {
            console.log(`RSVP ERROR   [find name] ${req.query.last}, ${req.query.first} - ${err}`);
            response.error = err;
        }
        
        if (data.Item) {
            function getFamilyCallback(familyName, familyItems) {
                console.log(`RSVP SUCCESS [find name] ${req.query.last}, ${req.query.first} - get family: ${familyName}`);
                
                // Put the RSVP-er first
                var rsvper;
                familyItems = familyItems.filter(function (el, i) {
                    if (el.first === findFirst && el.last === findLast) {
                        rsvper = el;
                        return false;
                    }
                    
                    return true;
                });
                
                familyItems.splice(0, 0, rsvper);
                
                // title case
                familyItems.forEach(function (el, i) {
                    var displayName = el.display.split(',');
                    el.display = displayName[1].trim() + ' ' + displayName[0].trim();
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
                        
                        console.log(`RSVP SUCCESS [find name] ${req.query.last}, ${req.query.first} - display family: ${familyName}`);
                        res.end(JSON.stringify(response));
                });
            }
            
            if (data.Item.fam && data.Item.fam.S) {
                getFamily(data.Item.fam.S, getFamilyCallback);
            } else {
                getFamilyCallback('', [{
                    first: data.Item.first.S,
                    last: data.Item.last.S,
                    display: data.Item.display.S,
                    rsvp: data.Item.rsvp.BOOL,
                    diet: data.Item.diet ? data.Item.diet.S : '',
                    note: data.Item.note ? data.Item.note.S : ''
                }]);
            }
        } else {
            console.log(`RSVP WARNING [find name] ${req.query.last}, ${req.query.first} - not found`);
            response.guests = null;
            res.end(JSON.stringify(response));
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
        console.log(`RSVP CALL    [rsvp done] ${el.last}, ${el.first} - ${el.rsvp}`);
        
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
            console.log(`RSVP CALL    [rsvp done] ${el.last}, ${el.first} - diet: ${req.body.diet}`);
            updateExpression += ", diet = :d";
            expressionAttr[":d"] = { S: req.body.diet };
        }
        
        if (i === 0 && req.body.note) {
            console.log(`RSVP CALL    [rsvp done] ${el.last}, ${el.first} - note: ${req.body.note}`);
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
                console.log(`RSVP ERROR   [rsvp done] ${el.last}, ${el.first} - error: ${err}`);
                response.error = err;
            }

            response.rsvp = familyRSVP;
            
            updatesLeft--;
            if (updatesLeft === 0) {
                console.log(`RSVP SUCCESS [rsvp done] familyRSVP: ${familyRSVP}`);
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