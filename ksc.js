const KSC_PATTERN = 10;
const KSC_VERSION = 1;
const KSC_KEY_LEN = 10;

var KSC = (function ()
{
    var log = require("./logging");
    var entries = require("./ksc-entries");

    var dgram = require("dgram");
    var config = require("config");
    var util = require("util");

    function KSC(type)
    {
        if (typeof type === "undefined")
        {
            type = "ksc";
        }

        this.type = type;
        switch (type)
        {
            case "vafb":
                this.primaryPort = config.get("Countdown.VAFB.Ports.primary");
                this.secondaryPort = config.get("Countdown.VAFB.Ports.secondary");
                this.host = config.get("Countdown.VAFB.host");
                break;
            default:
                this.primaryPort = config.get("Countdown.KSC.Ports.primary");
                this.secondaryPort = config.get("Countdown.KSC.Ports.secondary");
                this.host = config.get("Countdown.KSC.host");
                break;
        }
        this.portSwitchInterval = config.get("Countdown.portSwitchInterval");
        this.lastValidMessageTime = Date.now();
        this.useSecondaryPort = false;
        this.port = this.primaryPort;

        this.socket = null;
        this.messageInterval = config.get("Countdown.messageInterval");
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

        var lastMsgDiff = Date.now() - this.lastValidMessageTime;
        if (lastMsgDiff > this.portSwitchInterval)
        {
            // No answer from this port maybe the other is more cooperative...
            log.info("[" + this.type + "] No answer received, switching ports...");

            this.useSecondaryPort = !this.useSecondaryPort;
            this.port = this.useSecondaryPort ? this.secondaryPort : this.primaryPort;
            this.lastValidMessageTime = Date.now();
        }

        var that = this;
        this.socket.send(message, 0, message.length, this.port, this.host, function (err)
        {
            if (err)
            {
                log.error("[" + that.type + "] Failed to send: " + err);
            }
        });
    };

    KSC.prototype.start = function ()
    {
        log.info("[" + this.type + "] Starting listener for " + this.host + ":" + this.port);

        var that = this;

        this.socket = dgram.createSocket("udp4");
        this.socket.on("message", function (msg, rinfo)
        {
            try
            {
                var parsed = that.processBuffer(msg);

                if (parsed != null)
                {
                    that.dataCallback(parsed);
                }
                // Reset this even if there was no valid data
                that.lastValidMessageTime = Date.now();
            }
            catch (e)
            {
                log.info("[" + that.type + "] Processing error: " + e);
            }
        });
        this.socket.on("error", function (err)
        {
            log.error("[" + that.type + "] Error occurred: " + err.stack);
        });

        this.intervalCancel = setInterval(function ()
                                          {
                                              that.sendNextMessage();
                                          }, this.messageInterval);
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

        var pattern, version, changes;

        if (buffer.length > 0)
        {
            pattern = buffer.readUInt8(0);
        }
        else
        {
            // Not enough data
            return null;
        }

        if (buffer.length > 1)
        {
            version = buffer.readUInt8(1);
        }
        else
        {
            // Not enough data
            return null;
        }

        if (buffer.length > 2)
        {
            changes = buffer.readUInt8(2);
        }
        else
        {
            // Not enough data
            return null;
        }

        if (pattern != KSC_PATTERN)
        {
            throw "Pattern doesn't match!";
        }

        if (version != KSC_VERSION)
        {
            throw "Version doesn't match!";
        }

        if (changes > entries.length)
        {
            throw "Got too many keys!";
        }

        var key_offs = 3;
        var val_offs = key_offs + changes * KSC_KEY_LEN;

        var output = {
            raw      : {}
        };

        for (var i = 0; i < changes; ++i, key_offs += KSC_KEY_LEN)
        {
            var currentKey = buffer.toString("ascii", key_offs, key_offs + KSC_KEY_LEN);
            for (var j = 0; j < entries.length; ++j)
            {
                if (entries[j].key == currentKey)
                {
                    output.raw[entries[j].key] =
                            endOnNull(buffer.toString("ascii", val_offs, val_offs + entries[j].len)).trim();
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
