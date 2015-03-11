Validata = {

    schemaErrorAlertVisible: false,
    callbacks: {
        schemaParsed: function schemaParsedCallback(responseObject)
        {
            Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));
            Validata.schemaErrorAlertVisible = false;
            Validata.triggerValidationMessageUpdate(responseObject);
        },

        schemaParseError: function schemaParseErrorCallback(responseObject)
        {
            Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));
            Validata.schemaErrorAlertVisible = true;
            Validata.triggerValidationMessageUpdate(responseObject);
        }
    },

    triggerValidationMessageUpdate: function triggerValidationMessageUpdate(responseObject)
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Util.waitForFinalEvent(function waitForFinalEventCallback()
        {
            Validata.updateValidationMessages(responseObject);
        }, 1000, "updateValidationMessages");
    },

    updateValidationMessages: function updateValidationMessages(responseObject)
    {
        Log.v("Validation." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        if( Validata.schemaErrorAlertVisible )
        {
            var errorMessage = responseObject.message;
            UI.schemaErrorAlert.find('.sourceText').text(errorMessage);
            UI.schemaErrorAlert.fadeIn('slow');
        }
        else
        {
            UI.schemaErrorAlert.fadeOut('slow').find('.sourceText').empty();
            if(UI.schemaSourceText.val()){
                UI.schemaSuccessAlert.fadeIn('slow').delay(1000).fadeOut('slow');
            }
        }

    }

};