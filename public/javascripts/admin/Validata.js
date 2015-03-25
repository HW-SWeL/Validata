Validata = {

    schemaValid: false,
    callbacks: {
        schemaParsed: function schemaParsedCallback(responseObject)
        {
            Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));
            Validata.schemaValid = true;
            Validata.triggerValidationMessageUpdate(responseObject);
        },

        schemaParseError: function schemaParseErrorCallback(responseObject)
        {
            Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));
            Validata.schemaValid = false;
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

        if( !Validata.schemaValid )
        {
            // Sunil code
            /*UI.checkSubmitButton();
            var errorMessage = 'Line '+responseObject.line+', Column '+responseObject.column+
                ' : '+responseObject.message;
            UI.schemaErrorAlert.find('.sourceText').text(errorMessage);
            UI.schemaErrorAlert.fadeIn('slow');*/
            console.log(this.schema);
        }
        else
        {
            // sunil code
            /*UI.checkSubmitButton();
            UI.schemaErrorAlert.fadeOut('slow').find('.sourceText').empty();
            if(UI.schemaSourceText.val()){
                UI.schemaSuccessAlert.fadeIn('slow').delay(500).fadeOut('slow');
            }*/
            console.log(validator.schema);
        }

    }

};