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
            ShExLog.exception(e);
        }
    };

    $('#validateButton').click(function() 
    {    
        var schemaText = $('#schemaText').val();
        var dataText = $('#dataText').val();
        var rawValidationResults = $('#rawValidationResults');
        rawValidationResults.empty();
        
        var callbacks = {
            schemaParsed: function (schema) {
                ShExLog.i("callback: schemaParsed");
                ShExLog.i(schema);

                rawValidationResults.append("callback: schemaParsed\n");
                rawValidationResults.append( JSON.stringify(schema) + "\n\n" );
            },

            schemaParseError: function (errorMessage) {
                ShExLog.i("callback: schemaParseError");
                ShExLog.i(errorMessage);

                rawValidationResults.append("callback: schemaParseError\n");
                rawValidationResults.append( JSON.stringify(errorMessage) + "\n\n" );
            },

            dataParsed: function (data) {
                ShExLog.i("callback: dataParsed");
                ShExLog.i(data);

                rawValidationResults.append("callback: dataParsed\n");
                rawValidationResults.append( JSON.stringify(data) + "\n\n" );
            },

            dataParseError: function (errorMessage) {
                ShExLog.i("callback: dataParseError");
                ShExLog.i(errorMessage);

                rawValidationResults.append("callback: dataParseError\n");
                rawValidationResults.append( JSON.stringify(errorMessage) + "\n\n" );
            },

            validationResult: function (resultObject) {
                ShExLog.i("callback: dataParseError");
                ShExLog.i(resultObject);

                rawValidationResults.append("callback: validationResult\n");
                rawValidationResults.append( JSON.stringify(resultObject) + "\n\n" );
            }
            
        };

        var options = {
            closedShapes: true,
            startingNodes: ['Somebody']
        };

        ShExValidator.validate(schemaText, dataText, callbacks, options);
        
    });
    
    
    $(".accordionwizard").accordionwizard({
        onNext: function onNext(parent, panel) {
            hash = "#" + panel.id;
            $(".accordionwizard-sidebar",$(parent))
                .children("li")
                .children("a[href='" + hash + "']")
                .parent("li")
                .removeClass("accordionwizard-todo")
                .addClass("accordionwizard-completed");
        }
    });
    
});