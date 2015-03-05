var pageInitialized = false;
$(function documentReady()
{

    // This works around crosswalk occasionally firing the onPageLoadStarted and onPageLoadStopped events after a login(?!) and therefore the document ready event gets fired when the document is already ready
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
            Log.exception(e);
        }
    };

    if( ! Util.isDefined(ShExValidataConfig) )
    {
        $('body').html('<div class="alert alert-danger" role="alert">' +
            '<h4>ShExValidataConfig could not be loaded</h4>' +
            '<h5>Please ensure ShExValidataConfig.js exists and is readable in the javascripts directory.</h5>' +
            '</div>');
    }
    else
    {
        Validata.initializePageOnDocumentReady();
    }

});