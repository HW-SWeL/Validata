var pageInitialized = false;
$(function documentReady()
{

    if (pageInitialized)
    {
        return;
    }
    pageInitialized = true;

    window.onerror = function onerror(message, file, line, col, e)
    {
        // Only Chrome & Opera (Blink engine) pass the error object, which we need to get a stack trace
        if (typeof(e) != "undefined")
        {
            ShExLog.exception(e);
        }
    };

    // TODO: Write generator code to execute on document ready, e.g. set up event handlers

});