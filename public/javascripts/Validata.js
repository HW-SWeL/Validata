Validata = {

    Schema: {
        enabled: false,
        default: false,
        name: "",
        description: "",
        creationDate: 0,
        data: "",
        dataDemos: [],
        parsed: false,
        errors: [],
        rawResponse: {}
    },

    Data: {
        data: "",
        parsed: false,
        errors: [],
        rawResponse: {}
    },

    Validation: {
        passed: false,
        options: {
            closedShapes: true,
            startingNodes: []
        },
        callbacks: {},
        errors: [],
        rawResponse: {}
    },

    initialize: function initialize()
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments));

        // If option is set, add entry for a "Custom" schema which has an empty string as data
        if (ShExValidataConfig.options.allowCustomSchema)
        {
            ShExValidataConfig.schemas.push({
                enabled: true,
                name: "Custom Schema",
                description: "Click the Show Source button and enter your own custom ShEx schema",
                creationDate: Util.getUnixtime(),
                uploadDate: Util.getUnixtime(),
                data: ""
            });
        }

        // If we have defined schemas in config , add all enabled schemas to select dropdown
        if (Util.iterableLength(ShExValidataConfig.schemas))
        {
            // Remove the selected attribute from the placeholder option
            UI.schemaSelector.find('option').removeAttr('selected');

            // Add all enabled schemas, with selected if default set
            $.each(ShExValidataConfig.schemas, function configSchemasIterator(index, schema)
            {
                if (schema['enabled'] && Util.stringIsNotBlank(schema['name']))
                {
                    var selected = "";

                    if (schema['default'])
                    {
                        selected = 'selected="selected"';
                    }

                    UI.schemaSelector.append('<option value="' + index + '" ' + selected + '>' + schema['name'] + '</option>');
                }
            });

            // Trigger the change event to populate schema details table
            UI.schemaSelector.change();
        }

        Validata.Validation.callbacks = {
            schemaParsed: Validata.schemaParsedCallback,
            schemaParseError: Validata.schemaParseErrorCallback,
            dataParsed: Validata.dataParsedCallback,
            dataParseError: Validata.dataParseErrorCallback,
            validationResult: Validata.validationResultCallback
        }
    },

    validate: function validate()
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments));

        Validata.Validation.options.startingNodes = UI.dataStartNodesSelector.val();
        
        Log.i("Validating with schema:");
        Log.i(Validata.Schema.data);
        Log.i("Validating with data:");
        Log.i(Validata.Data.data);
        Log.i("Validating with options:");
        Log.i(Validata.Validation.options);
        
        ShExValidator.validate(Validata.Schema.data, Validata.Data.data, Validata.Validation.callbacks, Validata.Validation.options);
    },

    schemaParsedCallback: function schemaParsedCallback(responseObject)
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments));

        Validata.Schema.rawResponse = responseObject;
        Validata.Schema.parsed = true;

        Validata.triggerValidationMessageUpdate();
    },

    schemaParseErrorCallback: function schemaParseErrorCallback(responseObject)
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments));

        Validata.Schema.rawResponse = responseObject;
        Validata.Schema.parsed = false;

        Validata.triggerValidationMessageUpdate();
    },

    dataParsedCallback: function dataParsedCallback(responseObject)
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments));

        Validata.Data.rawResponse = responseObject;
        Validata.Data.parsed = true;
        
        // Recreate the options selector(s) from the newly parsed data and stored selected options, every time we validate
        // This could be mildly annoying for a user but is necessary to ensure the select has options which still exist in the data
        UI.dataStartNodesSelector.multiselect('destroy');
        UI.dataStartNodesSelector.empty();

        var nodeIndex = 0;
        $.each(Validata.Data.rawResponse['db']['SPO'], function (nodeKey, nodeObject)
        {
            var selected = '';
            var nodeKeyText = nodeKey.replace(/[<>]/g, '');
            
            if( ( $.inArray(nodeKeyText, Validata.Validation.options.startingNodes) > -1 )
                || 
                ( Util.iterableLength(Validata.Validation.options.startingNodes) == 0 && nodeIndex == 0 )
            )
            {
                selected = 'selected'
            }
            
            UI.dataStartNodesSelector.append('<option value="' + nodeKeyText + '" ' + selected + '>' + nodeKeyText + '</option>');
            nodeIndex++;
        });

        UI.dataStartNodesSelector.multiselect();

        var startingNodesLengthBeforeParse = Util.iterableLength( Validata.Validation.options.startingNodes );
        
        Validata.Validation.options.startingNodes = UI.dataStartNodesSelector.val();
        
        if( Util.stringIsNotBlank(Validata.Data.data) && startingNodesLengthBeforeParse == 0 )
        {
            Validata.validate();
        }
        else
        {
            Validata.triggerValidationMessageUpdate();
        }
    },

    dataParseErrorCallback: function dataParseErrorCallback(responseObject)
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments));

        Validata.Data.rawResponse = responseObject;
        Validata.Data.parsed = false;
        
        Validata.triggerValidationMessageUpdate();
    },

    validationResultCallback: function validationResultCallback(resultObject)
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments));

        Validata.Validation.rawResponse = resultObject;
        Validata.Validation.passed = !!Validata.Validation.rawResponse['passed'];

        Validata.triggerValidationMessageUpdate();
    },

    triggerValidationMessageUpdate: function triggerValidationMessageUpdate()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments));

        Util.waitForFinalEvent(function waitForFinalEventCallback()
        {
            Validata.updateValidationMessages();
        }, 1000, "updateValidationMessages");
    },
    
    updateValidationMessages: function updateValidationMessages()
    {
        Log.v("Validation." + Log.getInlineFunctionTrace(arguments));

        var quickSummaryStatusClassesToRemove = 'quickSummaryStatusIncomplete quickSummaryStatusInvalid quickSummaryStatusValid';
        
        var schemaErrorAlertVisible = false;
        var dataErrorAlertVisible = false;
        var validationSuccessAlertVisible = false;
        var validationErrorAlertVisible = false;

        if( Util.iterableLength( Validata.Validation ) )
        {
            if( Validata.Validation.passed )
            {
                validationSuccessAlertVisible = true;
                validationErrorAlertVisible = false;
                
                UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusValid');
            }
            else
            {

                UI.validationErrorsList.empty();
                
                if (Util.iterableLength( Validata.Validation.rawResponse['errors'] ))
                {
                    $.each(Validata.Validation.rawResponse['errors'], function (index, errorObject)
                    {
                        $('<li class="list-group-item">' + errorObject['name'] + ' @ ' + Util.escapeHtml(errorObject['triple'].toString()) + '</li>').appendTo(UI.validationErrorsList);
                    });
                }

                validationSuccessAlertVisible = false;
                validationErrorAlertVisible = true;
                
                UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusInvalid');
            }
        }
        else
        {
            validationSuccessAlertVisible = false;
            validationErrorAlertVisible = false;
            
            UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
        }


        if( Util.iterableLength( Validata.Schema ) )
        {
            if( Util.stringIsNotBlank( Validata.Schema.data ) )
            {

                if( Validata.Schema.parsed )
                {
                    schemaErrorAlertVisible = false;
                    
                    UI.quickSummarySectionSchema.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusValid');
                }
                else
                {
                    UI.schemaErrorAlert.find('.sourceText').text( Validata.Schema.rawResponse );

                    schemaErrorAlertVisible = true;
                    
                    UI.quickSummarySectionSchema.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusInvalid');
                }

            }
            else
            {
                schemaErrorAlertVisible = false;

                validationSuccessAlertVisible = false;
                validationErrorAlertVisible = false;
                
                UI.quickSummarySectionSchema.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
                UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
            }
        }
        else
        {
            UI.schemaErrorAlert.fadeOut('fast');
            
            validationSuccessAlertVisible = false;
            validationErrorAlertVisible = false;
            
            UI.quickSummarySectionSchema.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
            UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
        }


        if( Util.iterableLength( Validata.Data ) )
        {
            if( Util.stringIsNotBlank( Validata.Data.data ) )
            {

                if( Validata.Data.parsed )
                {
                    dataErrorAlertVisible = false;
                    
                    UI.quickSummarySectionData.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusValid');
                }
                else
                {
                    UI.dataErrorAlert.find('.sourceText').text( Validata.Data.rawResponse );

                    dataErrorAlertVisible = true;
                    
                    UI.quickSummarySectionData.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusInvalid');
                }

            }
            else
            {
                dataErrorAlertVisible = false;
                
                validationSuccessAlertVisible = false;
                validationErrorAlertVisible = false;
                
                UI.quickSummarySectionData.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
                UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
            }
        }
        else
        {
            dataErrorAlertVisible = false;

            validationSuccessAlertVisible = false;
            validationErrorAlertVisible = false;
            
            UI.quickSummarySectionData.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
            UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
        }
        
        
        if( validationSuccessAlertVisible )
        {
            UI.validationSuccessAlert.fadeIn('fast');
        }
        else
        {
            UI.validationSuccessAlert.fadeOut('fast');
        }
        
        if( validationErrorAlertVisible )
        {
            UI.validationErrorAlert.fadeIn('fast');
        }
        else
        {
            UI.validationErrorAlert.fadeOut('fast');
            UI.validationErrorsList.empty();
        }
        
        if( schemaErrorAlertVisible )
        {
            UI.schemaErrorAlert.fadeIn('fast');
        }
        else
        {
            UI.schemaErrorAlert.fadeOut('fast').find('.sourceText').empty();
        }
        
        if( dataErrorAlertVisible )
        {
            UI.dataErrorAlert.fadeIn('fast');
        }
        else
        {
            UI.dataErrorAlert.fadeOut('fast').find('.sourceText').empty();
        }
        
        if ( Util.stringIsNotBlank( Validata.Data.data ) && ! Util.iterableLength( Validata.Validation.options.startingNodes ) )
        {
            UI.optionsErrorAlert.fadeIn('slow')
                .find('.sourceText')
                .text("At least one starting node must be selected!");
        }
        else
        {
            UI.optionsErrorAlert.fadeOut('fast');
        }
        
    }

};
