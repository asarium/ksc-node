(function ($)
{
    $(document).ready(readyFunction);

    function setData(data, rawEl, contentEl, timestampEl)
    {
        timestampEl.text(data.generated);

        rawEl.text(JSON.stringify(data.raw));

        delete data.raw;
        contentEl.text(JSON.stringify(data));
    }

    function readyFunction()
    {
        var kscRaw = $("#ksc-raw");
        var kscSpan = $('#ksc-content');
        var kscTimestamp = $("#ksc-timestamp");

        var vafbRaw = $("#vafb-raw");
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

            setData(data.ksc, kscRaw, kscSpan, kscTimestamp);
            setData(data.vafb, vafbRaw, vafbSpan, vafbTimestamp);
        };

        socket.onclose = function ()
        {
            console.log("Connection closed!");
        };
    }
})(jQuery);
