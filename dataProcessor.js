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
        ksc : {raw: {}},
        vafb: {raw: {}}
    };

    var writingFile = false;
    var writeToLegacy = function ()
    {
        if (writingFile)
        {
            // Don't try to write the file again, it will only cause errors...
            return;
        }

        writingFile = true;
        fs.writeFile(
                config.get("Countdown.legacyFile"),
                JSON.stringify(outputObject),
                function (e)
                {
                    writingFile = false;
                    if (e)
                    {
                        log.warn("Error writing legacy file: " + e.toString());
                    }
                }
        );
    };
    var parseDate = function (dateString)
    {
        var parts = dateString.split(':');
        if (!parts) {
            return 0;
        }

        var partMultipliers = [86400, 3600, 60, 1];
        var ts;

        switch (parts.length) {
            case 3:
                parts.unshift('0');
                ts = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000);
                break;
            case 4:
                ts = Math.floor(Date.UTC(new Date().getUTCFullYear(), 0, 1) / 1000);
                break;
            default:
                // Oh gods, what even is this date
                return 0;
        }

        for (var i = 0; i < parts.length; i++) {
            ts += (parseInt(parts[i], 10) * partMultipliers[i]);
        }

        return ts;
    };
    var setKeys = function (pad)
    {
        var i, j, events = [], rawData = outputObject[pad].raw;
        outputObject[pad].times = {};

        if (rawData['GMTTSTRG01']) {
            outputObject[pad].times.gmt = parseDate(rawData['GMTTSTRG01']);
        }
        if (rawData['LOCLSTRG02']) {
            outputObject[pad].tz = rawData['LOCLSTRG02'];
        }
        if (rawData['LOCTSTRG03']) {
            outputObject[pad].times.local = parseDate(rawData['LOCTSTRG03']);
        }
        if (rawData['BIHTSTRG04']) {
            outputObject[pad].hold = rawData['BIHTSTRG04'];
        }
        if (rawData['WOTTSTRG06']) {
            outputObject[pad].times.windowOpens = parseDate(rawData['WOTTSTRG06']);
        }
        if (rawData['ELOTSTRG07']) {
            outputObject[pad].times.expected = parseDate(rawData['ELOTSTRG07']);
        }
        if (rawData['ALOLSTRG08'] && rawData['ALOTSTRG09']) {
            if (!outputObject[pad].times.custom) {
                outputObject[pad].times.custom = [];
            }
            outputObject[pad].times.custom.push({
                label: rawData['ALOLSTRG08'],
                time: parseDate(rawData['ALOTSTRG09'])
            });
        }
        if (rawData['LTMLSTRG10'] && rawData['LMTTSTRG11']) {
            if (!outputObject[pad].times.custom) {
                outputObject[pad].times.custom = [];
            }
            outputObject[pad].times.custom.push({
                label: rawData['LTMLSTRG10'],
                time: parseDate(rawData['LTMTSTRG11'])
            });
        }
        if (rawData['TTMLSTRG12'] && rawData['TTMTSTRG13']) {
            if (!outputObject[pad].times.custom) {
                outputObject[pad].times.custom = [];
            }
            outputObject[pad].times.custom.push({
                label: rawData['TTMLSTRG12'],
                time: parseDate(rawData['TTMTSTRG13'])
            });
        }
        if (rawData['RTMLSTRG14'] && rawData['RTMTSTRG15']) {
            if (!outputObject[pad].times.custom) {
                outputObject[pad].times.custom = [];
            }
            outputObject[pad].times.custom.push({
                label: rawData['RTMLSTRG14'],
                time: parseDate(rawData['RTMTSTRG15'])
            });
        }
        if (rawData['VHCLSTRG16']) {
            outputObject[pad].vehicle = rawData['VHCLSTRG16'];
        }
        if (rawData['SPCFSTRG17']) {
            outputObject[pad].spacecraft = rawData['SPCFSTRG17'];
        }
        for (var i = 1; i < 11; i++) {
            j = ("0" + i).slice(-2);
            if (rawData['EVENTLBL' + j] && rawData['EVENTLBL' + j].length) {
                events.push({
                    label: rawData['EVENTLBL' + j],
                    time: rawData['EVENTTIM' + j]
                });
            }
        }
        if (events.length) {
            outputObject[pad].events = events;
        }

        outputObject[pad].generated = Math.floor(Date.now() / 1000);
    };

    ksc.onData(function (data)
               {
                   for (var i in data.raw) {
                       outputObject.ksc.raw[i] = data.raw[i];
                   }
                   setKeys('ksc');
                   socketServer.sendToAll(outputObject);
                   writeToLegacy();
               });

    vafb.onData(function (data)
                {
                    for (var i in data.raw) {
                        outputObject.vafb.raw[i] = data.raw[i];
                    }
                    setKeys('vafb');
                    socketServer.sendToAll(outputObject);
                    writeToLegacy();
                })
};
