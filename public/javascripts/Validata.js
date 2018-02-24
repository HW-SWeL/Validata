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
        options: {
            closedShapes: true,
            resourceShapeMap: {}
        },
        callbacks: {},
        rawResponses: []
    },

    initialize: function initialize()
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        // If option is set, add entry for a "Custom" schema which has an empty string as data
        if (ValidataConfig.options.allowCustomSchema)
        {
            ValidataConfig.schemas.push({
                enabled: true,
                name: "Custom Schema",
                description: "Click the Show Source button and enter your own custom ShEx schema",
                creationDate: Util.getUnixtime(),
                uploadDate: Util.getUnixtime(),
                data: ""
            });
        }

        // If we have defined schemas in config , add all enabled schemas to select dropdown
        if (Util.iterableLength(ValidataConfig.schemas))
        {
            // Remove the selected attribute from the placeholder option
            UI.schemaSelector.find('option').removeAttr('selected');

            // Add all enabled schemas, with selected if default set
            $.each(ValidataConfig.schemas, function configSchemasIterator(index, schema)
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

        if (Validata.Schema.parsed)
        {
            // Validata.findShapes();
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

        UI.updateResourceShapeMapTable();

        Validata.Validation.rawResponses = [];

        Validata.validator.validate(Validata.Validation.options.resourceShapeMap);
    },

    validationResultCallback: function validationResultCallback(resultObject)
    {
        Log.v("Validata." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Validata.Validation.rawResponses.push(resultObject);

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

        var schemaErrorAlertVisible = false;
        var dataErrorAlertVisible = false;
        var validationMessagesVisible = true;

        var quickSummaryStatusSchema = "Incomplete";
        var quickSummaryStatusData = "Incomplete";
        var quickSummaryStatusResults = "Incomplete";

        if (Util.iterableLength(Validata.Validation))
        {
            // Iterate through validation responses and build array of messages arranged by resource and error level
            var validationMessagesByResourceShape = {};
            var errorCount = 0;
            var warningCount = 0;
            var matchesCount = 0;

            if (Util.iterableLength(Validata.Validation.rawResponses))
            {
                $.each(Validata.Validation.rawResponses, function (rawResponseIndex, rawResponse)
                {
                    var rawResponseStartingResourceString = Util.stringValue(rawResponse['startingResource'].toString());

                    validationMessagesByResourceShape[rawResponseStartingResourceString] = {
                        'errors': [],
                        'warnings': [],
                        'matches': []
                    };

                    if (Util.iterableLength(rawResponse['errors']))
                    {
                        $.each(rawResponse['errors'], function (index, rawError)
                        {
                            rawError['startingResource'] = rawResponse['startingResource'];

                            var errorLevel = "error";

                            var selectedReqLevel = Util.stringValue(UI.reqLevelSelector.val()).toUpperCase();
                            var errorReqLevel = Util.stringValue(rawError.req_lev).toUpperCase().replace(' NOT', '');

                            if (
                                Util.stringIsNotBlank(selectedReqLevel) &&
                                Util.stringIsNotBlank(errorReqLevel) &&
                                selectedReqLevel != "DEFAULT" &&
                                UI.reqLevels.indexOf(errorReqLevel) > -1
                            )
                            {
                                if (UI.reqLevels.indexOf(selectedReqLevel) > UI.reqLevels.indexOf(errorReqLevel))
                                {
                                    errorLevel = "warning";
                                }
                            }

                            if (errorLevel == "error")
                            {
                                validationMessagesByResourceShape[rawResponseStartingResourceString]['errors'].push(rawError);
                                errorCount++;
                            }
                            else if (errorLevel == "warning")
                            {
                                validationMessagesByResourceShape[rawResponseStartingResourceString]['warnings'].push(rawError);
                                warningCount++;
                            }

                        });
                    }

                    if (Util.iterableLength(rawResponse['matches']))
                    {
                        $.each(rawResponse['matches'], function (index, rawMatch)
                        {
                            rawMatch['startingResource'] = rawResponse['startingResource'];
                            validationMessagesByResourceShape[rawResponseStartingResourceString]['matches'].push(rawMatch);
                            matchesCount++;
                        });
                    }

                    // Add this resource to the errors panel and actually print the errors if we have some
                    if (Util.iterableLength(validationMessagesByResourceShape[rawResponseStartingResourceString]['errors']))
                    {
                        var errorsResourceSectionHTMLString =
                            '<div class="panel-heading">' +
                            '    <a data-toggle="collapse" href="#errorsResourceShape' + rawResponseIndex + '" class="panel-title">' +
                            '        <svg viewBox="0 1416 24 24" class="svg-size-20px " xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
                            '            <use xlink:href="/images/svg-sprite/svg-sprite-action.svg#ic_input_24px"></use>' +
                            '        </svg>' +
                            '        <span class="validationResultsResourceShapeHeading">' + Util.escapeHtml(rawResponseStartingResourceString) + ' as ' + Util.escapeHtml(Validata.Validation.options.resourceShapeMap[rawResponse.startingResource.lex]) + '</span>' +
                            '    </a>' +
                            '</div>' +
                            '<div id="errorsResourceShape' + rawResponseIndex + '" class="panel-collapse collapse in">' +
                            '    <ul class="list-group resourceShapeErrorsListGroup">';

                        $.each(validationMessagesByResourceShape[rawResponseStartingResourceString]['errors'], function (index, rawError)
                        {
                            var line = Util.isDefined(rawError.line) ? rawError.line : "";
                            var clickableClass = Util.stringIsNotBlank(Util.stringValue(line)) ? "clickable" : "";
                            var requirementLevel = Util.isDefined(rawError.req_lev) ? " [" + Util.stringValue(rawError.req_lev) + "] " : "";
                            var messageBody = '<span class="validationResultsErrorMessageBody ' + clickableClass + '" data-linenumber="' + Util.stringValue(line) + '">' + requirementLevel + Util.nl2br( Util.escapeHtml(rawError.description) ) + '</span>';

                            errorsResourceSectionHTMLString +=
                                '        <li class="list-group-item">' +
                                '            <svg viewBox="0 648 24 24" class="svg-size-20px svg-path-danger" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
                                '                <use xlink:href="/images/svg-sprite/svg-sprite-content.svg#ic_report_24px"></use>' +
                                '            </svg>' +
                                messageBody +
                                '        </li>';
                        });

                        errorsResourceSectionHTMLString +=
                            '    </ul>' +
                            '</div>';

                        $(errorsResourceSectionHTMLString).appendTo(UI.validationResultsErrorsResourceShapesPanel);
                    }

                    // Add this resource to the warnings panel and actually print the warnings if we have some
                    if (Util.iterableLength(validationMessagesByResourceShape[rawResponseStartingResourceString]['warnings']))
                    {
                        var warningsResourceSectionHTMLString =
                            '<div class="panel-heading">' +
                            '    <a data-toggle="collapse" href="#warningsResourceShape' + rawResponseIndex + '" class="panel-title">' +
                            '        <svg viewBox="0 1416 24 24" class="svg-size-20px " xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
                            '            <use xlink:href="/images/svg-sprite/svg-sprite-action.svg#ic_input_24px"></use>' +
                            '        </svg>' +
                            '        <span class="validationResultsResourceShapeHeading">' + Util.escapeHtml(rawResponseStartingResourceString) + ' as ' + Util.escapeHtml(Validata.Validation.options.resourceShapeMap[rawResponse.startingResource.lex]) + '</span>' +
                            '    </a>' +
                            '</div>' +
                            '<div id="warningsResourceShape' + rawResponseIndex + '" class="panel-collapse collapse in">' +
                            '    <ul class="list-group resourceShapeWarningsListGroup">';

                        $.each(validationMessagesByResourceShape[rawResponseStartingResourceString]['warnings'], function (index, rawError)
                        {
                            var line = Util.isDefined(rawError.line) ? rawError.line : "";
                            var clickableClass = Util.stringIsNotBlank(Util.stringValue(line)) ? "clickable" : "";
                            var requirementLevel = Util.isDefined(rawError.req_lev) ? " [" + Util.stringValue(rawError.req_lev) + "] " : "";
                            var messageBody = '<span class="validationResultsWarningMessageBody ' + clickableClass + '" data-linenumber="' + Util.stringValue(line) + '">' + requirementLevel + Util.nl2br( Util.escapeHtml(rawError.description) ) + '</span>';

                            warningsResourceSectionHTMLString +=
                                '        <li class="list-group-item">' +
                                '            <svg viewBox="0 24 24 24" class="svg-size-20px svg-path-warning" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
                                '                <use xlink:href="/images/svg-sprite/svg-sprite-alert.svg#ic_warning_24px"></use>' +
                                '            </svg>' +
                                messageBody +
                                '        </li>';
                        });

                        warningsResourceSectionHTMLString +=
                            '    </ul>' +
                            '</div>';

                        $(warningsResourceSectionHTMLString).appendTo(UI.validationResultsWarningsResourceShapesPanel);
                    }

                    // Add this resource to the matches panel and actually print the matched rules if we have some
                    if (Util.iterableLength(validationMessagesByResourceShape[rawResponseStartingResourceString]['matches']))
                    {
                        var matchesResourceSectionHTMLString =
                            '<div class="panel-heading">' +
                            '    <a data-toggle="collapse" href="#matchesResourceShape' + rawResponseIndex + '" class="panel-title">' +
                            '        <svg viewBox="0 1416 24 24" class="svg-size-20px " xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
                            '            <use xlink:href="/images/svg-sprite/svg-sprite-action.svg#ic_input_24px"></use>' +
                            '        </svg>' +
                            '        <span class="validationResultsResourceShapeHeading">' + Util.escapeHtml(rawResponseStartingResourceString) + ' as ' + Util.escapeHtml(Validata.Validation.options.resourceShapeMap[rawResponse.startingResource.lex]) + '</span>' +
                            '    </a>' +
                            '</div>' +
                            '<div id="matchesResourceShape' + rawResponseIndex + '" class="panel-collapse collapse in">' +
                            '    <ul class="list-group resourceShapeMatchesListGroup">';

                        $.each(validationMessagesByResourceShape[rawResponseStartingResourceString]['matches'], function (index, rawMatch)
                        {
                            var line = Util.isDefined(rawMatch.triple) ? rawMatch.triple.line : "";
                            var clickableClass = Util.stringIsNotBlank(Util.stringValue(line)) ? "clickable" : "";
                            var requirementLevel = Util.isDefined(rawMatch.rule.req_lev) ? " [" + Util.stringValue(rawMatch.rule.req_lev) + "] " : "";
                            var messageBody = '<span class="validationResultsMatchMessageBody ' + clickableClass + '" data-linenumber="' + Util.stringValue(line) + '">' + requirementLevel + Util.nl2br( Util.escapeHtml(rawMatch.toString()) ) + '</span>';

                            matchesResourceSectionHTMLString +=
                                '        <li class="list-group-item">' +
                                '            <svg viewBox="0 1368 24 24" class="svg-size-20px svg-path-success" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
                                '                <use xlink:href="/images/svg-sprite/svg-sprite-action.svg#ic_info_24px"></use>' +
                                '            </svg>' +
                                messageBody +
                                '        </li>';
                        });

                        matchesResourceSectionHTMLString +=
                            '    </ul>' +
                            '</div>';

                        $(matchesResourceSectionHTMLString).appendTo(UI.validationResultsMatchesResourceShapesPanel);
                    }

                });
            }

            // Add event handlers to errors if they have line numbers
            UI.validationResultsByErrorLevelAccordion.find('.validationResultsErrorMessageBody').on('click', function ()
            {
                var lineNumber = $(this).data('linenumber');
                if (Util.stringIsNotBlank(lineNumber))
                {
                    if (UI.highlightedLineNumber)
                    {
                        UI.dataSourceText.removeLineClass(UI.highlightedLineNumber, 'background', 'line-error');
                        UI.dataSourceText.removeLineClass(UI.highlightedLineNumber, 'background', 'line-warning');
                        UI.dataSourceText.removeLineClass(UI.highlightedLineNumber, 'background', 'line-match');
                        UI.highlightedLineNumber = false;
                    }

                    UI.dataSourceText.addLineClass(lineNumber - 1, 'background', 'line-error');
                    UI.highlightedLineNumber = lineNumber - 1;

                    var lineCoords = UI.dataSourceText.charCoords({line: lineNumber, ch: 0}, "local").top;
                    var middleHeight = UI.dataSourceText.getScrollerElement().offsetHeight / 2;
                    UI.dataSourceText.scrollTo(null, lineCoords - middleHeight - 5);

                    UI.activateWizardStep("Data", true);
                }
            });
            
            UI.validationResultsByErrorLevelAccordion.find('.validationResultsMatchMessageBody').on('click', function ()
            {
                var lineNumber = $(this).data('linenumber');
                if (Util.stringIsNotBlank(lineNumber))
                {
                    if (UI.highlightedLineNumber)
                    {
                        UI.dataSourceText.removeLineClass(UI.highlightedLineNumber, 'background', 'line-error');
                        UI.dataSourceText.removeLineClass(UI.highlightedLineNumber, 'background', 'line-warning');
                        UI.dataSourceText.removeLineClass(UI.highlightedLineNumber, 'background', 'line-match');
                        UI.highlightedLineNumber = false;
                    }

                    UI.dataSourceText.addLineClass(lineNumber - 1, 'background', 'line-match');
                    UI.highlightedLineNumber = lineNumber - 1;

                    var lineCoords = UI.dataSourceText.charCoords({line: lineNumber, ch: 0}, "local").top;
                    var middleHeight = UI.dataSourceText.getScrollerElement().offsetHeight / 2;
                    UI.dataSourceText.scrollTo(null, lineCoords - middleHeight - 5);

                    UI.activateWizardStep("Data", true);
                }
            });
            
            UI.validationResultsByErrorLevelAccordion.find('.validationResultsWarningMessageBody').on('click', function ()
            {
                var lineNumber = $(this).data('linenumber');
                if (Util.stringIsNotBlank(lineNumber))
                {
                    if (UI.highlightedLineNumber)
                    {
                        UI.dataSourceText.removeLineClass(UI.highlightedLineNumber, 'background', 'line-error');
                        UI.dataSourceText.removeLineClass(UI.highlightedLineNumber, 'background', 'line-warning');
                        UI.dataSourceText.removeLineClass(UI.highlightedLineNumber, 'background', 'line-match');
                        UI.highlightedLineNumber = false;
                    }

                    UI.dataSourceText.addLineClass(lineNumber - 1, 'background', 'line-warning');
                    UI.highlightedLineNumber = lineNumber - 1;

                    var lineCoords = UI.dataSourceText.charCoords({line: lineNumber, ch: 0}, "local").top;
                    var middleHeight = UI.dataSourceText.getScrollerElement().offsetHeight / 2;
                    UI.dataSourceText.scrollTo(null, lineCoords - middleHeight - 5);

                    UI.activateWizardStep("Data", true);
                }
            });

            UI.validationResultsErrorsCount.text(errorCount);
            UI.validationResultsWarningsCount.text(warningCount);
            UI.validationResultsMatchesCount.text(matchesCount);

            if (errorCount)
            {
                quickSummaryStatusResults = "Invalid";
            }
            else if (warningCount)
            {
                quickSummaryStatusResults = "Warning";
            }
            else if (matchesCount == 0)
            {
                quickSummaryStatusResults = "Incomplete";
            }
            else
            {
                quickSummaryStatusResults = "Valid";
            }

        }
        else
        {
            validationMessagesVisible = false;
            quickSummaryStatusResults = "Incomplete";
        }

        if (Util.iterableLength(Validata.Schema))
        {
            if (Util.stringIsNotBlank(Validata.Schema.data))
            {

                if (Validata.Schema.parsed)
                {
                    schemaErrorAlertVisible = false;
                    quickSummaryStatusSchema = "Valid";
                }
                else
                {
                    UI.schemaErrorAlert.find('.sourceText').text(Validata.Schema.rawResponse);

                    schemaErrorAlertVisible = true;
                    validationMessagesVisible = false;

                    quickSummaryStatusSchema = "Invalid";
                    quickSummaryStatusResults = "Incomplete";
                }

            }
            else
            {
                schemaErrorAlertVisible = false;
                validationMessagesVisible = false;

                quickSummaryStatusSchema = "Incomplete";
                quickSummaryStatusResults = "Incomplete";
            }
        }
        else
        {
            schemaErrorAlertVisible = false;
            validationMessagesVisible = false;

            quickSummaryStatusSchema = "Incomplete";
            quickSummaryStatusResults = "Incomplete";
        }

        if (Util.iterableLength(Validata.Data))
        {
            if (Util.stringIsNotBlank(Validata.Data.data))
            {

                if (Validata.Data.parsed)
                {
                    dataErrorAlertVisible = false;
                    quickSummaryStatusData = "Valid";
                }
                else
                {
                    UI.dataErrorAlert.find('.sourceText').text(Validata.Data.rawResponse.message);

                    UI.dataSourceText.addLineClass(Validata.Data.rawResponse.line - 1, 'background', 'line-error');
                    UI.highlightedLineNumber = Validata.Data.rawResponse.line - 1;

                    var lineCoords = UI.dataSourceText.charCoords({
                        line: Validata.Data.rawResponse.line,
                        ch: 0
                    }, "local").top;
                    var middleHeight = UI.dataSourceText.getScrollerElement().offsetHeight / 2;
                    UI.dataSourceText.scrollTo(null, lineCoords - middleHeight - 5);

                    UI.activateWizardStep("Data", true);

                    dataErrorAlertVisible = true;
                    validationMessagesVisible = false;

                    quickSummaryStatusData = "Invalid";
                    quickSummaryStatusResults = "Incomplete";
                }

            }
            else
            {
                dataErrorAlertVisible = false;
                validationMessagesVisible = false;

                quickSummaryStatusData = "Incomplete";
                quickSummaryStatusResults = "Incomplete";
            }
        }
        else
        {
            dataErrorAlertVisible = false;
            validationMessagesVisible = false;

            quickSummaryStatusData = "Incomplete";
            quickSummaryStatusResults = "Incomplete";
        }

        if (validationMessagesVisible)
        {
            UI.validationResultsByErrorLevelAccordion.fadeIn('fast');
        }
        else
        {
            UI.validationResultsByErrorLevelAccordion.fadeOut('fast');
        }

        if (schemaErrorAlertVisible)
        {
            UI.schemaErrorAlert.fadeIn('fast');
        }
        else
        {
            UI.schemaErrorAlert.fadeOut('fast').find('.sourceText').empty();
        }

        if (dataErrorAlertVisible)
        {
            UI.dataErrorAlert.fadeIn('fast');
        }
        else
        {
            UI.dataErrorAlert.fadeOut('fast').find('.sourceText').empty();
        }

        var quickSummaryStatusClassesToRemove = 'quickSummaryStatusIncomplete quickSummaryStatusInvalid quickSummaryStatusValid quickSummaryStatusWarning';

        UI.quickSummarySectionSchema.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatus' + quickSummaryStatusSchema);
        UI.quickSummarySectionData.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatus' + quickSummaryStatusData);
        UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatus' + quickSummaryStatusResults);

        UI.quickSummaryPanelLoader.addClass('hidden');

        UI.schemaSelector.removeAttr('disabled');
    }

};
