/**
 * User: Marius
 * Date: 14.02.2015
 * Time: 15:58
 */
(function ($)
{
    $(document).ready(readyFunction);

    function readyFunction()
    {
        var container = $("#content");
        var domain = document.domain;

        var socket = new WebSocket("ws://" + domain + ":8070/");

        socket.onopen = function ()
        {
            console.log("Connection open!");
        };

        socket.onerror = function (err)
        {
            console.log("Error detected: " + err);
        };

        socket.onmessage = function (msg)
        {
            console.log("Received message: " + msg.data);
            container.text(msg.data);
        };

        socket.onclose = function ()
        {
            console.log("Connection closed!");
        };
    }
})(jQuery);