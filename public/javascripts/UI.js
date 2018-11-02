UI = {

    documentReady: function documentReady()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        UI.selectCommonElements();
        UI.setupEventHandlers();
        UI.setupCodeInputs();

        Validata.initialize();
    },

    selectCommonElements: function selectCommonElements()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        UI.wizardSidebarStepsList = $('#wizardSidebarStepsList');
        UI.wizardSidebarSteps = UI.wizardSidebarStepsList.find('li.wizardSidebarStep');

        UI.wizardSidebarStepSchema = $('#wizardSidebarStepSchema');
        UI.wizardSidebarStepData = $('#wizardSidebarStepData');
        UI.wizardSidebarStepOptions = $('#wizardSidebarStepOptions');
        UI.wizardSidebarStepResults = $('#wizardSidebarStepResults');

        UI.quickSummaryPanelLoader = $('#quickSummaryPanelLoader');
        UI.quickSummarySectionsTable = $('#quickSummarySectionsTable');
        UI.quickSummarySections = UI.quickSummarySectionsTable.find('tr.quickSummarySection');

        UI.quickSummarySectionSchema = $('#quickSummarySectionSchema');
        UI.quickSummarySectionData = $('#quickSummarySectionData');
        UI.quickSummarySectionResults = $('#quickSummarySectionResults');

        UI.demoPanel = $('#demoPanel');
        UI.demoPanelButtonGroup = $('#demoPanelButtonGroup');
        UI.reqLevelSelector = $('#reqLevelSelector');
        UI.reqLevelPanel = $('#reqLevelPanel');

        UI.wizardStepsPanelGroup = $('#wizardStepsPanelGroup');
        UI.wizardStepPanels = UI.wizardStepsPanelGroup.find('div.wizardStepPanel');

        UI.wizardStepPanelSchema = $('#wizardStepPanelSchema');
        UI.wizardStepPanelData = $('#wizardStepPanelData');
        UI.wizardStepPanelOptions = $('#wizardStepPanelOptions');
        UI.wizardStepPanelResults = $('#wizardStepPanelResults');

        UI.schemaSelector = $('#schemaSelector');
        UI.schemaDescription = $('#schemaDescription');
        UI.schemaCreationDate = $('#schemaCreationDate');

        UI.schemaSourceModal = $('#schemaSourceModal');

        UI.dataSourceFile = $('#dataSourceFile');

        UI.resourceShapeMapTableBody = $('#resourceShapeMapTableBody');//use
        UI.addNewResourceShapeButton = $('#addNewResourceShapeButton');
        UI.removeResourceShapeButton = $('#removeResourceShapeButton');
        UI.closedShapesOption = $('#closedShapesOption');

        UI.schemaErrorAlert = $('#schemaErrorAlert');
        UI.dataErrorAlert = $('#dataErrorAlert');

        UI.validationResultsByErrorLevelAccordion = $('#validationResultsByErrorLevelAccordion');

        UI.validationResultsErrorsResourceShapesPanel = $('#validationResultsErrorsResourceShapesPanel');
        UI.validationResultsWarningsResourceShapesPanel = $('#validationResultsWarningsResourceShapesPanel');
        UI.validationResultsMatchesResourceShapesPanel = $('#validationResultsMatchesResourceShapesPanel');

        UI.validationResultsErrorsCount = $('#validationResultsErrorsCount');
        UI.validationResultsWarningsCount = $('#validationResultsWarningsCount');
        UI.validationResultsMatchesCount = $('#validationResultsMatchesCount');

    },

    setupEventHandlers: function setupEventHandlers()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        // When the Schema Source modal pops up, set it's height based on the window size
        UI.schemaSourceModal.on("show.bs.modal", function modalShow()
        {
            $(this).find(".modal-body").css("max-height", ( $(window).height() - 200 ));
        });
        UI.schemaSourceModal.on("shown.bs.modal", function modalShow()
        {
            UI.schemaSourceText.refresh();
        });

        // Clicking anywhere inside a step panel triggers the staggered update
        UI.wizardStepPanels.on('click', function wizardStepPanelsClick()
        {
            UI.activateWizardStep($(this).attr('id').replace("wizardStepPanel", ""));
        });

        // Clicking a Wizard Sidebar step takes the user to that section immediately
        UI.wizardSidebarSteps.on('click', function wizardSidebarStepsClick()
        {
            UI.activateWizardStep($(this).attr('id').replace("wizardSidebarStep", ""), true);
        });

        // Clicking a Quick Summary row takes the user to that section immediately so they can easily view errors
        UI.quickSummarySections.on('click', function quickSummarySectionsClick()
        {
            UI.activateWizardStep($(this).attr('id').replace("quickSummarySection", ""), true);
        });

        // Pressing any key inside or changing the value of any input or editable source text field inside a step panel triggers the staggered update
        UI.wizardStepPanels
            .find('select, input, div.editableSourceText')
            .on('change keyup', function wizardStepPanelsInputChange()
            {
                UI.triggerStaggeredContentChange();
            });

        UI.schemaSelector.on('change keyup', function schemaSelectorChange()
        {
            UI.updateSelectedSchema();

            UI.triggerStaggeredContentChange();
        });

        // Selecting a file using the file chooser should cause the content of that file to be loaded into the data source div as text
        UI.dataSourceFile.on('change', function dataSourceFileChange()
        {
            Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

            var inputFiles = this.files;

            if (inputFiles == undefined || inputFiles.length == 0)
            {
                return;
            }
            var inputFile = inputFiles[0];

            var reader = new FileReader();

            reader.onload = function (event)
            {
                UI.dataSourceText.setValue(event.target.result);
            };

            reader.onerror = function (event)
            {
                var errorMessage = "Selected file could not be uploaded. Error: " + event.target.error.code;
                UI.dataSourceText.setValue(errorMessage);
            };

            reader.readAsText(inputFile);
        });

        var $window = $(window);
        var body = $("body");
        var sidebarContentWrapper = $("#sidebarContentWrapper");

        $window.scroll(function ()
        {
            if ($window.scrollTop() > 125)
            {
                body.removeClass("topNavbarVisible").addClass("topNavbarInvisible");
            }
            else
            {
                sidebarContentWrapper.css('max-height', body.height() - 360 + $window.scrollTop());
                body.removeClass("topNavbarInvisible").addClass("topNavbarVisible");
            }
        });

    },

    setupCodeInputs: function ()
    {
        var dataSourceTextarea = $('#dataSourceText');
        var schemaSourceTextarea = $('#schemaSourceText');

        UI.dataSourceText = CodeMirror.fromTextArea(dataSourceTextarea[0], {
            lineNumbers: true,
            mode:"turtle"
        });

        UI.dataSourceText.on('change', function schemaSelectorChange()
        {
            UI.triggerStaggeredContentChange();
        });

        dataSourceTextarea.siblings(".CodeMirror-resize-sub-100").click(function (e)
        {
            var old_height = $(UI.dataSourceText.getWrapperElement()).height();
            if (old_height > 100)
            {
                UI.dataSourceText.setSize("100%", old_height - 100);
            }
        });
        dataSourceTextarea.siblings(".CodeMirror-resize-inc-100").click(function (e)
        {
            var old_height = $(UI.dataSourceText.getWrapperElement()).height();
            UI.dataSourceText.setSize("100%", old_height + 100);
        });



        UI.schemaSourceText = CodeMirror.fromTextArea(schemaSourceTextarea[0], {
            lineNumbers: true
        });

        UI.schemaSourceText.on('change', function schemaSelectorChange()
        {
            UI.triggerStaggeredContentChange();
        });

        schemaSourceTextarea.siblings(".CodeMirror-resize-sub-100").click(function (e)
        {
            var old_height = $(UI.schemaSourceText.getWrapperElement()).height();
            if (old_height > 100)
            {
                UI.schemaSourceText.setSize("100%", old_height - 100);
            }
        });
        schemaSourceTextarea.siblings(".CodeMirror-resize-inc-100").click(function (e)
        {
            var old_height = $(UI.schemaSourceText.getWrapperElement()).height();
            UI.schemaSourceText.setSize("100%", old_height + 100);
        });
    },

    triggerStaggeredContentChange: function triggerStaggeredContentChange()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        UI.quickSummaryPanelLoader.removeClass('hidden');

        var quickSummaryStatusClassesToRemove = 'quickSummaryStatusIncomplete quickSummaryStatusInvalid quickSummaryStatusValid quickSummaryStatusWarning';

        UI.quickSummarySectionSchema.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
        UI.quickSummarySectionData.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');
        UI.quickSummarySectionResults.removeClass(quickSummaryStatusClassesToRemove).addClass('quickSummaryStatusIncomplete');

        UI.validationResultsByErrorLevelAccordion.fadeOut('fast');

        UI.validationResultsErrorsResourceShapesPanel.empty().addClass('in');
        UI.validationResultsWarningsResourceShapesPanel.empty().addClass('in');
        UI.validationResultsMatchesResourceShapesPanel.empty().removeClass('in');

        UI.schemaErrorAlert.fadeOut('fast').find('.sourceText').empty();
        UI.dataErrorAlert.fadeOut('fast').find('.sourceText').empty();

        if(UI.highlightedLineNumber)
        {
            UI.dataSourceText.removeLineClass(UI.highlightedLineNumber, 'background', 'line-error');
            UI.dataSourceText.removeLineClass(UI.highlightedLineNumber, 'background', 'line-warning');
            UI.dataSourceText.removeLineClass(UI.highlightedLineNumber, 'background', 'line-match');
            UI.highlightedLineNumber = false;
        }

        Util.waitForFinalEvent(function waitForFinalEventCallback()
        {
            UI.staggeredContentChange();
        }, 1000, "staggeredContentChange");
    },

    staggeredContentChange: function staggeredContentChange()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        UI.updateEnteredData();
        UI.updateEnteredSchema();

        Validata.Validation.options.resourceShapeMap = UI.buildResourceShapeMapFromTable();
        Validata.Validation.options.closedShapes = UI.closedShapesOption.prop('checked');

        Validata.updateValidatorInstance();
    },

    activateWizardStep: function activateWizardStep(newStepName, scrollToPanel)
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        // Only change classes if the new step is not already the active step
        if (UI["wizardStepPanel" + newStepName].hasClass('panel-info'))
        {
            Log.d("Changing sidebar step and panel classes to activate new step: " + newStepName);

            // Make any active panel inactive and make sidebar icons inactive
            UI.wizardSidebarSteps.removeClass('wizard-active');
            UI.wizardStepPanels.removeClass('panel-primary').addClass('panel-info');

            // Make new step panel active and make sidebar step active
            UI["wizardSidebarStep" + newStepName].addClass('wizard-active');
            UI["wizardStepPanel" + newStepName].removeClass('panel-info').addClass('panel-primary');
        }

        // Scroll the user to show this panel if it's useful in this situation
        if (Util.isDefined(scrollToPanel) && scrollToPanel)
        {
            UI["wizardStepPanel" + newStepName][0].scrollIntoView();
        }
    },

    updateEnteredData: function updateEnteredData()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Validata.Data = {
            data: UI.dataSourceText.getValue(),
            parsed: false,
            errors: [],
            rawResponse: {}
        }
    },

    updateEnteredSchema: function updateEnteredSchema()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Validata.Schema.data = UI.schemaSourceText.getValue();
    },

    updateSelectedSchema: function updateSelectedSchema()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        // Clear any demo buttons which were previously shown
        UI.demoPanelButtonGroup.empty();

        // Disable clicking the schema change again immediately
        UI.schemaSelector.attr('disabled', 'disabled');

        // Clear any resource / shape mappings which were set
        UI.resourceShapeMapTableBody.empty();
        Validata.Validation.options.resourceShapeMap = {};

        var selectedSchemaIndex = UI.schemaSelector.val();

        Validata.Schema = ValidataConfig['schemas'][selectedSchemaIndex];
        UI.reqLevels = ValidataConfig['schemas'][selectedSchemaIndex]['reqLevels'];

        if ( Util.iterableLength( UI.reqLevels ) )
        {
            UI.reqLevelSelector.empty();

            UI.reqLevels.forEach(function (reqLevel)
            {
                UI.reqLevelSelector.append('<option>' + Util.stringValue(reqLevel).toUpperCase() + '</option>');
                $('#reqLevelSelector').val(Util.stringValue(reqLevel).toUpperCase());
            });
            UI.reqLevelPanel.show();
        }
        else
        {
            UI.reqLevelPanel.hide();
        }

        if (!Util.iterableLength(Validata.Schema))
        {
            Validata.Schema = {
                enabled: false,
                default: false,
                name: "Invalid schema selected",
                description: "Invalid schema selected",
                creationDate: Util.getUnixtime(),
                data: "Invalid schema selected",
                dataDemos: []
            };
        }

        $.extend(Validata.Schema, {
            parsed: false,
            errors: []
        });

        UI.schemaDescription.text(
            Util.stringValueNoBlank(Validata.Schema['description'], "No description available for this schema")
        );

        UI.schemaCreationDate.text(
            Util.stringValueNoBlank(moment.unix(Validata.Schema['creationDate']).format("DD/MM/YYYY HH:mm"), "No creation date available for this schema")
        );

        UI.schemaSourceText.setValue(
            Util.stringValueNoBlank(Validata.Schema['data'], "No source code for this schema")
        );

        // If any demo data exists for this schema, add a button to insert it
        if (Util.iterableLength(Validata.Schema.dataDemos))
        {
            UI.demoPanelButtonGroup.empty();

            $.each(Validata.Schema.dataDemos, function schemaDataDemosIterator(index, dataDemoObject)
            {
                var demoButtonIcon = '<svg viewBox="0 552 24 24" class="demoButtonIcon svg-path-white svg-size-24px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="images/svg-sprite/svg-sprite-av.svg#ic_play_arrow_24px"></use></svg>';

                $('<button type="button" class="btn btn-block btn-success demoButton">' + demoButtonIcon + dataDemoObject['name'] + '</button>').on('click', function dataDemoButtonClick()
                {
                    Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

                    UI.activateWizardStep("Data", true);
                    UI.dataSourceText.setValue(dataDemoObject['data']);
                }).appendTo(UI.demoPanelButtonGroup);
            });

            UI.demoPanel.removeClass('hidden');
        }
        else
        {
            UI.demoPanel.addClass('hidden');
        }
    },

    buildResourceShapeMapFromTable: function buildResourceShapeMapFromTable()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        var resourceShapeMap = {};

        UI.resourceShapeMapTableBody.find('tr').each(function resourceShapeMapTableBodyRowIterator(index)
        {
            var row = $(this);
            var resource = row.find('select.resourceSelector').val();

            resourceShapeMap[resource] = row.find('select.shapeSelector').val();
        });

        return resourceShapeMap;
    },

    generateResourceShapeSelectorRow: function generateResourceShapeSelectorRow()
    {
        // if (Util.iterableLength(Validata.Data.rawResponse['db']) &&
        //     Util.iterableLength(Validata.Data.rawResponse['db']['SPO']) &&
        //     Util.iterableLength(Validata.Schema.rawResponse.shapes)
        // )

        if (Util.iterableLength(Validata.Data.rawResponse.triples) &&
            Util.iterableLength(Validata.Schema.rawResponse.shapes)
        )


        {
            // console.log('gen resources');
            var resources = Validata.Data.rawResponse.db.getSubjectsByIRI()
            var resourceShapeRow = $('<tr></tr>').addClass('resourceShapeRow');
            var resourceSelector = $('<select></select>').addClass('resourceSelector form-control');
            var shapeSelector = $('<select></select>').addClass('shapeSelector form-control');
            // console.log('resources',resources);
            $.each(resources, function rawDataResponseIterator(nodeKey, nodeObject)
            {
                // Blank nodes can't be validated yet due to a bug (?) in the validator which changes the name on every instance so we're just hiding them for now
                // if (nodeKey.indexOf("_:") >= 0)
                // {
                //     return true;
                // }
                // console.log('nodeKey',nodeKey)
                var nodeKeyText = nodeObject.replace(/[<>]/g, '');

                resourceSelector.append('<option value="' + nodeKeyText + '">' + nodeKeyText + '</option>');
            });

            var resourceSelectorCell = $('<td></td>').append(resourceSelector);
            resourceShapeRow.append(resourceSelectorCell);

            $.each(Validata.Schema.rawResponse.shapes, function schemaResponseIterator(index, shape)
            {
                // console.log('index, shape',shape);
                shapeSelector.append('<option value="' + index + '">' + Util.escapeHtml(index) + '</option>');
            });

            var shapeSelectorCell = $('<td></td>').append(shapeSelector);
            resourceShapeRow.append(shapeSelectorCell);

            return resourceShapeRow;
        }
        else
        {
            return false;
        }
    },

    generateResourceDropdown: function generateResourceDropdown(){
        console.log('updating resources');
        if (Util.iterableLength(Validata.Schema.rawResponse.shapes)) {

            var resourceShapeRow = $('<tr></tr>').addClass('resourceShapeRow');
            var resourceSelector = $('<select></select>').addClass('resourceSelector form-control');
            var shapeSelector = $('<select></select>').addClass('shapeSelector form-control');
            var resourceSelectorCell = $('<td></td>').append(resourceSelector);
            resourceShapeRow.append(resourceSelectorCell);

            $.each(Validata.Schema.rawResponse.shapes,function (shape){
                shapeSelector.append('<option value="' + shape + '">' + Util.escapeHtml(shape) + '</option>');
            });
            var shapeSelectorCell = $('<td></td>').append(shapeSelector);
            resourceShapeRow.append(shapeSelectorCell);
            return resourceShapeRow;
        }
    },

    updateResourceShapeMapTable: function updateResourceShapeMapTable()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        UI.resourceShapeMapTableBody.empty();

        if (Util.iterableLength(Validata.Validation.options.resourceShapeMap))
        {
            console.log('if in updateResourceShapeMapTable')
            $.each(Validata.Validation.options.resourceShapeMap, function (resource, shape)
            {
                // Blank nodes can't be validated yet due to a bug (?) in the validator which changes the name on every instance so we're just hiding them for now
                if (resource.indexOf("_:") >= 0)
                {
                    return true;
                }

                var resourceShapeSelectorRow = UI.generateResourceShapeSelectorRow();

                resourceShapeSelectorRow
                    .find('select.resourceSelector')
                    .find('option')
                    .prop('selected', false)
                    .filter(function ()
                    {
                        return $(this).val() == resource;
                    })
                    .prop('selected', true);

                resourceShapeSelectorRow
                    .find('select.shapeSelector')
                    .find('option')
                    .prop('selected', false)
                    .filter(function ()
                    {
                        return $(this).val() == shape;
                    })
                    .prop('selected', true);

                UI.resourceShapeMapTableBody.append(resourceShapeSelectorRow);
            });
        }
        else
        {
            console.log('else in updateResourceShapeMapTable');

            var resourceShapeSelectorRow = UI.generateResourceShapeSelectorRow();
            // resourceShapeSelectorRow
            //             .find('select.resourceSelector')
            //             .find('option')
            //             .prop('selected', false)
            //             .filter(function ()
            //             {
            //                 return $(this).val() == resource;
            //             })
            //             .prop('selected', true);
            UI.resourceShapeMapTableBody.append(resourceShapeSelectorRow);
            // $.each(Validata.Data.rawResponse.db.getSubjectsByIRI(), function findShapesResponseIterator(resource)
            // {

            //     // if( Util.stringIsNotBlank(shape) )
            //     // {
            //         // Log.i("Iterating through Validata.Data.shapesResponse, found non-blank shape match with resource: " + resource + " and shape: " + shape);

            //         // resource = resource.replace(/[<>]/g, '');

            //         var resourceShapeSelectorRow = UI.generateResourceShapeSelectorRow();

            //         resourceShapeSelectorRow
            //             .find('select.resourceSelector')
            //             .find('option')
            //             .prop('selected', false)
            //             .filter(function ()
            //             {
            //                 return $(this).val() == resource;
            //             })
            //             .prop('selected', true);

            //         // resourceShapeSelectorRow
            //         //     .find('select.shapeSelector')
            //         //     .find('option')
            //         //     .prop('selected', false)
            //         //     .filter(function ()
            //         //     {
            //         //         return $(this).val() == shape;
            //         //     })
            //         //     .prop('selected', true);

            //         UI.resourceShapeMapTableBody.append(resourceShapeSelectorRow);
            //     // }
            // });
        }

        Validata.Validation.options.resourceShapeMap = UI.buildResourceShapeMapFromTable();

        $('select.resourceSelector, select.shapeSelector').on('change', function resourceSelectorChange()
        {
            UI.triggerStaggeredContentChange();
        });

        UI.addNewResourceShapeButton.off().on('click', function addNewResourceShapeButtonClick()
        {
            var resourceShapeSelectorRow = UI.generateResourceShapeSelectorRow();

            resourceShapeSelectorRow.find('select.resourceSelector').find('option').each(function ()
            {
                var $this = $(this);

                if ($('select.resourceSelector')
                        .find('option:selected')
                        .filter(function ()
                        {
                            return $(this).val() == $this.val();
                        })
                        .length == 0)
                {
                    $this.prop('selected', true);
                    return false;
                }
            });

            UI.resourceShapeMapTableBody.append(resourceShapeSelectorRow);
            Validata.Validation.options.resourceShapeMap = UI.buildResourceShapeMapFromTable();

            UI.triggerStaggeredContentChange();

            return false;
        });

        UI.removeResourceShapeButton.off().on('click', function removeResourceShapeButtonClick()
        {
            UI.resourceShapeMapTableBody.find('tr').last().remove();
            Validata.Validation.options.resourceShapeMap = UI.buildResourceShapeMapFromTable();

            UI.triggerStaggeredContentChange();

            return false;
        });

    }

};
