var pageInitialized = false;

function addSchema(){
    var schemaObject = {
        title: titleInput.val(),
        description: descInput.val(),
        schema: schemaSourceText.text()
    };





    //move schema to json
    // update schema list
    // reset form
    //animation
}

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
            ShExLog.exception(e);
        }
    };

    // TODO: Write admin code to execute on document ready, e.g. set up event handlers

});