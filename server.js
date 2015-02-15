/**
 * User: Marius
 * Date: 14.02.2015
 * Time: 10:59
 */

var KSC = require("./ksc");
var processor = require("./dataProcessor");
var WebSocketServer = require("./socketServer");

var config = require("config");
var finalhandler = require('finalhandler');
var serveStatic = require("serve-static");
var http = require("http");

var serve = serveStatic(__dirname + "/web_root", {
    "index": ["index.html"]
});

var socketServer = new WebSocketServer();

var kscListener = new KSC("ksc");
var vafbListener = new KSC("vafb");

// This handles generating the final JavaScript object and sending it to the socket server
processor(kscListener, vafbListener, socketServer);

var server = http.createServer(function (req, res)
                               {
                                   var done = finalhandler(req, res);
                                   serve(req, res, done);
                               });

var httpPort = process.env.PORT || config.get("Server.port");

// Start the various servers and listeners
kscListener.start();
vafbListener.start();

socketServer.open(server, config.get("Server.webSocketPath"));
server.listen(httpPort);

process.on('SIGINT', function ()
{
    console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");

    server.close();
    socketServer.close();
    kscListener.stop();
    vafbListener.stop();

    process.exit();
});
