var pageInitialized = false;

$(function documentReady()
{

    if (pageInitialized)
    {
        return;
    }
    pageInitialized = true;


    UI.documentReady();

    window.onerror = function onerror(message, file, line, col, e)
    {
        // Only Chrome & Opera (Blink engine) pass the error object, which we need to get a stack trace
        if (typeof(e) != "undefined")
        {
            Log.exception(e);
        }
    };

    // TODO: Write admin code to execute on document ready, e.g. set up event handlers

});