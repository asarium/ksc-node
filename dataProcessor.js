/**
 * User: Marius
 * Date: 15.02.2015
 * Time: 11:04
 */

module.exports = function (ksc, vafb, socketServer)
{
    // This object will be sent to the clients whenever one of the listeners has new data
    // ksc and vafb are initialized with empty data
    var outputObject = {
        ksc : {},
        vafb: {}
    };

    ksc.onData(function (data)
               {
                   outputObject.ksc = data;

                   socketServer.sendToAll(outputObject);
               });

    vafb.onData(function (data)
                {
                    outputObject.vafb = data;
                    socketServer.sendToAll(outputObject);
                })
};
