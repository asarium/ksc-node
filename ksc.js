/**
 * User: Marius
 * Date: 14.02.2015
 * Time: 10:11
 */
const HOST = "countdown.ksc.nasa.gov";
const KSC_PORT = 11142;
const KSC_PORT_VAFB = 11144;

const KSC_PATTERN = 10;
const KSC_VERSION = 1;
const KSC_KEY_LEN = 10;

const INTERVAL_DELAY = 2000;

var KSC = (function ()
{

    var log = require("./logging");
    var dgram = require("dgram");
    var entries = require("./ksc-entries");

    function KSC(type)
    {
        if (typeof type === "undefined")
        {
            type = "ksc";
        }

        switch (type)
        {
            case "vafb":
                this.port = KSC_PORT_VAFB;
                break;
            default:
                this.port = KSC_PORT;
                break;
        }

        this.socket = null;
    }

    function endOnNull(string)
    {
        var pos = string.indexOf("\0");

        if (pos < 0)
        {
            return string;
        }

        return string.substring(0, pos);
    }

    KSC.prototype.sendNextMessage = function ()
    {
        var message = new Buffer("\000");

        log.info("Sending message...");
        this.socket.send(message, 0, message.length, this.port, HOST, function (err)
        {
            if (err)
            {
                log.error("Failed to send: " + err);
            }
        });
    };

    KSC.prototype.start = function ()
    {
        log.info("Starting listener for " + HOST + ":" + this.port);

        var that = this;

        this.socket = dgram.createSocket("udp4");
        this.socket.on("message", function (msg, rinfo)
        {
            log.info("Received message...");
            var parsed = that.processBuffer(msg);

            if (parsed != null)
            {
                that.dataCallback(parsed);
            }
        });

        this.intervalCancel = setInterval(function ()
                                          {
                                              that.sendNextMessage();
                                          }, INTERVAL_DELAY);
        this.sendNextMessage();
    };

    KSC.prototype.stop = function ()
    {
        clearInterval(this.intervalCancel);

        this.socket.close();
    };

    KSC.prototype.onData = function (callback)
    {
        this.dataCallback = callback;
    };

    KSC.prototype.processBuffer = function (buffer)
    {
        // Data format:
        // 0: pattern
        // 1: version
        // 2: number of changes
        // 3 - changes * KEY_LEN: the changed keys
        // rest: the values of the keys

        if (buffer.length < 3)
        {
            log.warn("Message was too small (" + buffer.length + " bytes)...");
            return null;
        }

        var pattern = buffer.readUInt8(0);
        var version = buffer.readUInt8(1);
        var changes = buffer.readUInt8(2);

        if (pattern != KSC_PATTERN)
        {
            log.warn("KSC Pattern doesn't match!");
            return null;
        }

        if (version != KSC_VERSION)
        {
            log.warn("KSC version doesn't match!");
            return null;
        }

        if (changes > entries.length)
        {
            log.warn("KSC delivered too many keys!");
            return null;
        }
        log.info("Processing data...");

        var key_offs = 3;
        var val_offs = key_offs + changes * KSC_KEY_LEN;

        var output = {};

        for (var i = 0; i < changes; ++i, key_offs += KSC_KEY_LEN)
        {
            var currentKey = buffer.toString("ascii", key_offs, key_offs + KSC_KEY_LEN);
            for (var j = 0; j < entries.length; ++j)
            {
                if (entries[j].key == currentKey)
                {
                    output[entries[j].key] = endOnNull(buffer.toString("ascii", val_offs, val_offs + entries[j].len));
                    val_offs += entries[j].len;

                    break;
                }
            }
        }

        return output;
    };

    return KSC;
})();

module.exports = KSC;
