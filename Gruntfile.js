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
    
    grunt.registerTask("ebdeploy", "Deploy application to Elastic Beanstalk using elasticbeanstalk/config.yml", function () {
        var done = this.async();
        
        if (!grunt.option("label")) {
            grunt.log.error("Version label required (--label)");
            done();
        }
        
        var eb = new AWS.ElasticBeanstalk({
            apiVersion: "2012-08-10",
            region: "us-west-2"
        });
        
        function ebdeploy(version) {
            grunt.util.spawn({
                cmd: "eb",
                args: ["deploy", "--label", "v1.11", "--staged"],
                opts: {stdio: "inherit"}
            }, function (err, result, code) {
                if (err) {
                    grunt.log.error(err);
                    done(err);
                } else {
                    grunt.log.writeln(result.stdout);
                    grunt.log.ok(`Finished with code ${code}`);
                    done();
                }
            });
        }
        
        function ebupdate(version) {
            eb.updateEnvironment({
                EnvironmentName: "jaliisha-rsvp",
                VersionLabel: version
            }, function (err, data) {
                if (err) {
                    grunt.log.error(err);
                    done(err);
                } else {
                    grunt.log.ok(`Environment status: ${data.Status}`);
                    done();
                }
            });
        }
        
        eb.describeApplications({}, function (err, data) {
            if (err) {
                grunt.log.error(err);
                done(err);
            }
            
            if (data.Applications[0].Versions.indexOf(grunt.option("label")) > -1) {
                grunt.log.writeln(`Deploy previous version: ${grunt.option("label")}`);
                ebupdate(grunt.option("label"));
            } else {
                grunt.log.writeln(`Upload and deploy new version: ${grunt.option("label")}`);
                ebdeploy(grunt.option("label"));
            }
        });
        
    });
    
}