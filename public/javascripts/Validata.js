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
        rawResponse: {},
        shapesResponse: {}            
    },

    Validation: {
        passed: false,
        options: {
            closedShapes: true,
            resourceSelection: [],
            shapeSelection: []
        },
        callbacks: {},
        errors: [],
        rawResponse: {}
    },

    initialize: function initialize()
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));

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
            findShapesResult: Validata.findShapesResultCallback,
            validationResult: Validata.validationResultCallback
        };
    },

    validate: function validate()
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Log.i("Validating with options:");
        Log.i(Validata.Validation.options);

        Validata.validator = new ShExValidator.Validator(Validata.Schema.data, Validata.Data.data, Validata.Validation.callbacks, Validata.Validation.options);

        if( Validata.Validation.options.shapeSelection.length == 0 )
        { 
            Log.i("shapeSelection is empty; calling findShapes");
            
            Validata.validator.findShapes().done(function findShapesDone()
            {
                Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));
            });
        }
        else
        {
            var resourceShapeMap = {};
            resourceShapeMap[Validata.Validation.options.resourceSelection[0]] = Validata.Validation.options.shapeSelection[0];
            
            Validata.validator.validate(resourceShapeMap);
        }
        
    },

    schemaParsedCallback: function schemaParsedCallback(responseObject)
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Validata.Schema.rawResponse = responseObject;
        Validata.Schema.parsed = true;
        

        Validata.triggerValidationMessageUpdate();
    },

    schemaParseErrorCallback: function schemaParseErrorCallback(responseObject)
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Validata.Schema.rawResponse = responseObject;
        Validata.Schema.parsed = false;

        Validata.triggerValidationMessageUpdate();
    },

    dataParsedCallback: function dataParsedCallback(responseObject)
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Validata.Data.rawResponse = responseObject;
        Validata.Data.parsed = true;
        
        // Recreate the options selector(s) from the newly parsed data and stored selected options, every time we validate
        // This could be mildly annoying for a user but is necessary to ensure the select has options which still exist in the data
        UI.resourceSelector.multiselect('destroy');
        UI.resourceSelector.empty();

        var nodeIndex = 0;
        $.each(Validata.Data.rawResponse['db']['SPO'], function (nodeKey, nodeObject)
        {
            var selected = '';
            var nodeKeyText = nodeKey.replace(/[<>]/g, '');
            
            if( ( $.inArray(nodeKeyText, Validata.Validation.options.resourceSelection) > -1 )
                || 
                ( Util.iterableLength(Validata.Validation.options.resourceSelection) == 0 && nodeIndex == 0 )
            )
            {
                selected = 'selected'
            }
            
            UI.resourceSelector.append('<option value="' + nodeKeyText + '" ' + selected + '>' + nodeKeyText + '</option>');
            nodeIndex++;
        });

        UI.resourceSelector.multiselect();

        var resourceSelectionLengthBeforeParse = Util.iterableLength( Validata.Validation.options.resourceSelection );

        UI.updateResourceShapeMap();
        
        if( Util.stringIsNotBlank(Validata.Data.data) && resourceSelectionLengthBeforeParse == 0 )
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
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Validata.Data.rawResponse = responseObject;
        Validata.Data.parsed = false;
        Validata.Validation.options.resourceSelection = [];
        
        Validata.triggerValidationMessageUpdate();
    },

    findShapesResultCallback: function findShapesResultCallback(shapesResponse)
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Validata.Data.shapesResponse = shapesResponse;

        // Recreate the options selector(s) from the newly parsed data and stored selected options, every time we validate
        // This could be mildly annoying for a user but is necessary to ensure the select has options which still exist in the data
        UI.shapeSelector.empty();

        $.each(Validata.Schema.rawResponse.shapes, function shapesResponseIterator(index, shape)
        {
            var selected = '';
            
            if( $.inArray(shape, Validata.Validation.options.shapeSelection) !== -1 )
            {
                selected = 'selected'
            }
            
            UI.shapeSelector.append('<option value="' + shape + '" ' + selected + '>' + Util.escapeHtml(shape) + '</option>');
        });

        UI.updateResourceShapeMap();
        
        var resourceSelectionLength = Util.iterableLength( Validata.Validation.options.resourceSelection );
        var shapeSelectionLength = Util.iterableLength( Validata.Validation.options.shapeSelection );
        if( Util.stringIsNotBlank(Validata.Data.data) && resourceSelectionLength > 0 && shapeSelectionLength > 0 )
        {
            Validata.validate();
        }
        else
        {
            Validata.triggerValidationMessageUpdate();
        }
    },

    validationResultCallback: function validationResultCallback(resultObject)
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Validata.Validation.rawResponse = resultObject;
        
        if( Validata.Validation.rawResponse['passed'] || Validata.Validation.rawResponse.errors.length == 0 )
        {
            Validata.Validation.passed = true;
        }
        else
        {
            Validata.Validation.passed = false;
        }

        Validata.triggerValidationMessageUpdate();
    },

    triggerValidationMessageUpdate: function triggerValidationMessageUpdate()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Util.waitForFinalEvent(function waitForFinalEventCallback()
        {
            Validata.updateValidationMessages();
        }, 1000, "updateValidationMessages");
    },
    
    updateValidationMessages: function updateValidationMessages()
    {
        Log.v("Validation." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        var quickSummaryStatusClassesToRemove = 'quickSummaryStatusIncomplete quickSummaryStatusInvalid quickSummaryStatusValid';
        
        var schemaErrorAlertVisible = false;
        var dataErrorAlertVisible = false;
        var validationSuccessAlertVisible = false;
        var validationErrorAlertVisible = false;
		var validationWarningAlertVisible = false;

        if( Util.iterableLength( Validata.Validation ) )
        {
            if( Validata.Validation.passed )
            {
                validationSuccessAlertVisible = true;
                validationErrorAlertVisible = false;
				validationWarningAlertVisible = false;
                
                UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusValid');
            }
            else
            {

                UI.validationErrorsList.empty();
				UI.validationWarningsList.empty();
				
                if (Util.iterableLength( Validata.Validation.rawResponse['errors'] ))
                {
                    $.each(Validata.Validation.rawResponse['errors'], function (index, errorObject)
                    {
						//is validation strict?
						//warning or error?
                        $('<li class="list-group-item">' + errorObject['name'] + ' @ ' + Util.escapeHtml(errorObject['triple'].toString()) + '</li>').appendTo(UI.validationErrorsList);
                    });
                }

                validationSuccessAlertVisible = false;
                validationErrorAlertVisible = true;
				//if warnings not empty 
				// validationWarningAlertVisible = true;
				//else
				// validationWarningAlertVisible = false;
                
                UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusInvalid');
            }
        }
        else
        {
            validationSuccessAlertVisible = false;
            validationErrorAlertVisible = false;
			validationWarningAlertVisible = false;
            
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
				validationWarningAlertVisible = false;
                
                UI.quickSummarySectionSchema.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
                UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
            }
        }
        else
        {
            UI.schemaErrorAlert.fadeOut('fast');
            
            validationSuccessAlertVisible = false;
            validationErrorAlertVisible = false;
			validationWarningAlertVisible = false;
            
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
                    
                    UI.resourceSelector.empty();
                }

            }
            else
            {
                dataErrorAlertVisible = false;
                
                validationSuccessAlertVisible = false;
                validationErrorAlertVisible = false;
				validationWarningAlertVisible = false;
                
                UI.quickSummarySectionData.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
                UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');

                UI.resourceSelector.empty();
            }
        }
        else
        {
            dataErrorAlertVisible = false;

            validationSuccessAlertVisible = false;
            validationErrorAlertVisible = false;
			validationWarningAlertVisible = false;
            
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
		
		if( validationWarningAlertVisible )
        {
            UI.validationWarningAlert.fadeIn('fast');
        }
        else
        {
            UI.validationWarningAlert.fadeOut('fast');
            UI.validationWarningsList.empty();
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
        
        if ( Util.stringIsNotBlank( Validata.Data.data ) && ! Util.iterableLength( Validata.Validation.options.resourceSelection ) )
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
