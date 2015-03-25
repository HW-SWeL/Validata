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
            resourceShapeMap: {}
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

    updateValidatorInstance: function updateValidatorInstance()
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Log.i("Creating new validator instance");

        Validata.validator = new ShExValidator.Validator(Validata.Schema.data, Validata.Data.data, Validata.Validation.callbacks, Validata.Validation.options);

    },
    
    findShapes: function findShapes()
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Validata.validator.findShapes().done(function findShapesDone()
        {
            Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));
        });
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

        if(Validata.Schema.parsed)
        {
            Validata.findShapes();
        }
    },

    dataParseErrorCallback: function dataParseErrorCallback(responseObject)
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Validata.Data.rawResponse = responseObject;
        Validata.Data.parsed = false;
        
        Validata.triggerValidationMessageUpdate();
    },

    findShapesResultCallback: function findShapesResultCallback(shapesResponse)
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Validata.Data.shapesResponse = shapesResponse;

        UI.initializeResourceShapeMapTable();

        Validata.validator.validate(Validata.Validation.options.resourceShapeMap);
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

        var quickSummaryStatusClassesToRemove = 'quickSummaryStatusIncomplete quickSummaryStatusInvalid quickSummaryStatusValid quickSummaryStatusWarning';
        
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
						var reqLev = UI.reqLevelSelector.val();
						if(UI.reqLevelSelector.val() != null && 
							UI.reqLevelSelector.val() != "DEFAULT" && 
							errorObject.req_lev !=null &&
							UI.reqLevels.indexOf(reqLev) > -1){
								if(UI.reqLevels.indexOf(reqLev) > UI.reqLevels.indexOf(errorObject.req_lev.toUpperCase()))
								{
									$('<li class="list-group-item">' + errorObject.description.replace("contact someone", "blame johnny") /* errorObject['name'] + ': ' + Util.escapeHtml(errorObject['triple'].toString())*/ + '</li>').appendTo(UI.validationWarningsList);
								}
								else{
									$('<li class="list-group-item">' + errorObject.description.replace("contact someone", "blame johnny") /* errorObject['name'] + ': ' + Util.escapeHtml(errorObject['triple'].toString())*/ + '</li>').appendTo(UI.validationErrorsList);
								}
						}
						else{
							$('<li class="list-group-item">' + errorObject.description.replace("contact someone", "blame johnny") /* errorObject['name'] + ': ' + Util.escapeHtml(errorObject['triple'].toString())*/ + '</li>').appendTo(UI.validationErrorsList);
						}
                        
                    });
                }

                validationSuccessAlertVisible = false;
                
				if(UI.validationErrorsList.children().length > 0)
				{
					UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusInvalid');
					validationErrorAlertVisible = true;
				}
				else if (UI.validationWarningsList.children().length > 0)
				{
					UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusWarning');
					validationWarningAlertVisible = true;
				}
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
                    
                    validationSuccessAlertVisible = false;
                    validationErrorAlertVisible = false;
                    validationWarningAlertVisible = false;

                    UI.quickSummarySectionSchema.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusInvalid');
                    UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
                    
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

                    validationSuccessAlertVisible = false;
                    validationErrorAlertVisible = false;
                    validationWarningAlertVisible = false;
                    
                    UI.quickSummarySectionData.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusInvalid');
                    UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
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

        UI.quickSummaryPanelLoader.addClass('hidden');

        UI.schemaSelector.removeAttr('disabled');
    }

};
