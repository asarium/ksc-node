/**
 * User: Marius
 * Date: 14.02.2015
 * Time: 15:58
 */
(function ($)
{
    $(document).ready(readyFunction);

    function setData(data, contentEl, timestampEl)
    {
        timestampEl.text(data.generated);

        contentEl.text(JSON.stringify(data.raw));
    }

    function readyFunction()
    {
        var kscSpan = $("#ksc-content");
        var kscTimestamp = $("#ksc-timestamp");

        var vafbSpan = $("#vafb-content");
        var vafbTimestamp = $("#vafb-timestamp");

        var domain = window.location.host;

        var socket = new WebSocket("ws://" + domain + "/ws");

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
            console.log("Received message...");

            var data = JSON.parse(msg.data);

            setData(data.ksc, kscSpan, kscTimestamp);
            setData(data.vafb, vafbSpan, vafbTimestamp);
        };

        socket.onclose = function ()
        {
            console.log("Connection closed!");
        };
    }
})(jQuery);
