/**
 * User: Marius
 * Date: 15.02.2015
 * Time: 11:04
 */

var log = require("./logging");

var fs = require("fs");
var config = require("config");

module.exports = function (ksc, vafb, socketServer)
{
    // This object will be sent to the clients whenever one of the listeners has new data
    // ksc and vafb are initialized with empty data
    var outputObject = {
        ksc : {},
        vafb: {}
    };

    var writeToLegacy = function() {
        fs.writeFile(
            config.get("Countdown.legacyFile"),
            JSON.stringify(outputObject),
            function(e) {
                if (e) {
                    log.info("Error writing legacy file: " + e.toString());
                } else {
                    log.info("Written legacy file");
                }
            }
        );
    }

    ksc.onData(function (data)
               {
                   outputObject.ksc = data;

                   socketServer.sendToAll(outputObject);
                   writeToLegacy();
               });

    vafb.onData(function (data)
                {
                    outputObject.vafb = data;
                    socketServer.sendToAll(outputObject);
                    writeToLegacy();
                })
};
