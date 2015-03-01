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

            tripleValidated: function (validation) {
                ShExLog.i("callback: tripleValidated");
                ShExLog.i(validation);

                rawValidationResults.append("callback: tripleValidated\n");
                rawValidationResults.append( JSON.stringify(validation) + "\n\n" );
            },

            validationError: function (validationError) {
                ShExLog.i("callback: validationError");
                ShExLog.i(validationError);

                rawValidationResults.append("callback: validationError\n");
                rawValidationResults.append( JSON.stringify(validationError) + "\n\n" );
            }
        };

        var options = {
            closedShapes: true,
            startingNodes: []
        };

        ShExValidator.validate(schemaText, dataText, callbacks, options);
    });

    function onNext(parent, panel) {
        hash = "#" + panel.id;
        $(".acc-wizard-sidebar",$(parent))
            .children("li")
            .children("a[href='" + hash + "']")
            .parent("li")
            .removeClass("acc-wizard-todo")
            .addClass("acc-wizard-completed");
    }
    
    $(".acc-wizard").accwizard({
        onNext: onNext
    });
    
});