module.exports = function (grunt) {
    var AWS = require("aws-sdk");
    
    grunt.registerTask("guests", "Add guests to the RSVP table", function () {
        var done = this.async();
        
        var guestList = grunt.file.readJSON("./guests.json").guests;
        var namesLeft = guestList.length;
        
        var db = new AWS.DynamoDB({
            apiVersion: '2012-08-10',
            region: 'us-west-2',
            params: {
                TableName: 'rsvp'
            }
        });
        
        guestList.forEach(function (guest, i) {
            var name = guest.name.split(",");
            var expr = guest.family ? "set fam = :f, display = :n" : "set display = :n";
            var attr = { ":n": { S: guest.name } };
            if (guest.family) attr[":f"] =  { S: guest.family };
            
            db.updateItem({
                Key: {
                    last: { S: name[0].trim().toUpperCase() },
                    first: { S: name[1].trim().toUpperCase() }
                },
                UpdateExpression: expr,
                ExpressionAttributeValues: attr,
                ReturnValues: "ALL_NEW"
            }, function (err, data) {
                if (err) {
                    grunt.log.error(err);
                    done(err);
                } else {
                    grunt.log.writeln(data.Attributes.display.S);
                    namesLeft--;
                    if (namesLeft === 0) {
                        grunt.log.ok(`Updated ${guestList.length} guests`);
                        done();
                    }
                }
            });
        });
        
        
    });
}