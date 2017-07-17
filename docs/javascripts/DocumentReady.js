var pageInitialized = false;
$(function globalDocumentReady() {
    // This works around crosswalk occasionally firing the onPageLoadStarted and onPageLoadStopped events after a login(?!) and therefore the document ready event gets fired when the document is already ready
    if (pageInitialized) {
        return;
    }
    pageInitialized = true;

    window.onerror = function onerror(message, file, line, col, e) {
        // Only Chrome & Opera (Blink engine) pass the error object, which we need to get a stack trace
        if (typeof(e) != "undefined") {
            Log.exception(e);
        }
    };

    // Loads in json object which contains all the schema data
    $.get("javascripts/ValidataConfig.json", "", function (data) {
        ValidataConfig = JSON.parse(data);

        if (Util.isDefined(ValidataConfig)) {
            UI.documentReady();
        }
        else {
            $('body').html('<div class="alert alert-danger" role="alert">' +
            '<h4>ShExValidataConfig could not be loaded</h4>' +
            '<h5>Please ensure ShExValidataConfig.js exists and is readable in the javascripts directory.</h5>' +
            '</div>');
        }
    },"text");

});
