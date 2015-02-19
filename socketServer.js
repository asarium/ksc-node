SocketServer = (function ()
{
    var log = require("./logging");
    var WebSocketServer = require("ws").Server;

    function Server()
    {
        this.lastData = null;
    }

    Server.prototype.open = function (httpServer, serverPath)
    {
        log.info("Starting WebSocketServer...");
        this.wss = new WebSocketServer({
                                           server: httpServer,
                                           path  : serverPath
                                       });

        var that = this;
        this.wss.broadcast = function (data)
        {
            that.wss.clients.forEach(function (client)
                                     {
                                         client.send(data);
                                     });
        };

        this.wss.on("connection", function (ws)
        {
            if (that.lastData != null)
            {
                // If we already have data, send the client the last data
                ws.send(JSON.stringify(that.lastData));
            }
        });
    };

    Server.prototype.sendToAll = function (data)
    {
        this.lastData = data;
        this.wss.broadcast(JSON.stringify(data));
    };

    Server.prototype.close = function ()
    {
        this.wss.close();
    };

    return Server;
})();

module.exports = SocketServer;
