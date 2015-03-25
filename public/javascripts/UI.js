UI = {
    
    documentReady: function documentReady()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));
        
        UI.selectCommonElements();
        UI.setupEventHandlers();
        
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
        UI.schemaSourceText = $('#schemaSourceText');

        UI.dataSourceFile = $('#dataSourceFile');
        UI.dataSourceText = $('#dataSourceText');
        
        UI.resourceShapeMapTableBody = $('#resourceShapeMapTableBody');
        UI.addNewResourceShapeButton = $('#addNewResourceShapeButton');
        UI.removeResourceShapeButton = $('#removeResourceShapeButton');
        UI.closedShapesOption = $('#closedShapesOption');
        
        UI.schemaErrorAlert = $('#schemaErrorAlert');
        UI.dataErrorAlert = $('#dataErrorAlert');
        
        UI.validationSuccessAlert = $('#validationSuccessAlert');
        UI.validationErrorAlert = $('#validationErrorAlert');
		UI.validationWarningAlert = $('#validationWarningAlert');
        UI.validationErrorsList = $('#validationErrorsList');
		UI.validationWarningsList = $('#validationWarningsList');
    },
    
    setupEventHandlers: function setupEventHandlers()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        // When the Schema Source modal pops up, set it's height based on the window size
        UI.schemaSourceModal.on("show.bs.modal", function modalShow() {
            $(this).find(".modal-body").css("max-height", ( $(window).height() - 200 ) );
            
        });

        // Clicking anywhere inside a step panel triggers the staggered update
        UI.wizardStepPanels.on('click', function wizardStepPanelsClick()
        {
            UI.activateWizardStep( $(this).attr('id').replace("wizardStepPanel", "") );
        });
        
        // Clicking a Wizard Sidebar step takes the user to that section immediately
        UI.wizardSidebarSteps.on('click', function wizardSidebarStepsClick()
        {
            UI.activateWizardStep( $(this).attr('id').replace("wizardSidebarStep", ""), true );
        });

        // Clicking a Quick Summary row takes the user to that section immediately so they can easily view errors
        UI.quickSummarySections.on('click', function quickSummarySectionsClick()
        {
            UI.activateWizardStep( $(this).attr('id').replace("quickSummarySection", ""), true );
        });
        
        // Pressing any key inside or changing the value of any input or editable source text field inside a step panel triggers the staggered update
        UI.wizardStepPanels
            .find('select, input, div.editableSourceText')
            .add( UI.schemaSourceText )
            .on('change keyup', function wizardStepPanelsInputChange()
        {
            UI.triggerStaggeredContentChange();
        });

        UI.schemaSelector.on('change keyup', function schemaSelectorChange()
        {
            UI.updateSelectedSchema();
            
            UI.triggerStaggeredContentChange();
        });

        UI.dataSourceText.on('change keyup', function dataSourceTextChange()
        {
            // Clear any resource / shape mappings which were set
            UI.resourceShapeMapTableBody.empty();
            Validata.Validation.options.resourceShapeMap = {};
            
            UI.triggerStaggeredContentChange();
        });
        
        // Pasting content into either of the two editable content divs should strip any formatting from the pasted content so it only contains plain text
        $('div.editableSourceText').on('paste', function editableSourceTextPaste(e) 
        {
            Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

            setTimeout(function () {
                console.log(e);

                UI.schemaSourceText.text( UI.schemaSourceText.text() );
                UI.dataSourceText.text( UI.dataSourceText.text() );
            }, 100);
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
                UI.dataSourceText.text(event.target.result).change();
            };
            
            reader.onerror = function (event)
            {
                var errorMessage = "Selected file could not be uploaded. Error: " + event.target.error.code;
                UI.dataSourceText.text(errorMessage).change();
            };
            
            reader.readAsText(inputFile);
        });

        var body = $("body");

        $(window).scroll(function(){
            if (body[0].scrollTop > 125) {
                body.removeClass("topNavbarVisible").addClass("topNavbarInvisible");
            } else {
                body.removeClass("topNavbarInvisible").addClass("topNavbarVisible");
            }
        });
        
    },

    triggerStaggeredContentChange: function triggerStaggeredContentChange()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        UI.quickSummaryPanelLoader.removeClass('hidden');
        
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

        UI.updateResourceShapeMapFromTable();
        Validata.Validation.options.closedShapes = UI.closedShapesOption.prop('checked');

        Validata.updateValidatorInstance();
    },
    
    activateWizardStep: function activateWizardStep(newStepName, scrollToPanel)
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        // Only change classes if the new step is not already the active step
        if( UI["wizardStepPanel" + newStepName].hasClass('panel-info') )
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
        if( Util.isDefined(scrollToPanel) && scrollToPanel )
        {
            UI["wizardStepPanel" + newStepName][0].scrollIntoView();
        }
    },

    updateEnteredData: function updateEnteredData()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Validata.Data = {
            data: UI.dataSourceText.text(),
            parsed: false,
            errors: [],
            rawResponse: {}
        }
    },
    
    updateEnteredSchema: function updateEnteredSchema()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

        Validata.Schema.data = UI.schemaSourceText.text();
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
        
        Validata.Schema = ShExValidataConfig['schemas'][selectedSchemaIndex];
		Validata.ReqLevels = ShExValidataConfig['schemas'][selectedSchemaIndex]['reqLevels'];
        
		if(Validata.ReqLevels){
            UI.reqLevelSelector.empty();
            
			Validata.ReqLevels.forEach(function(req){
				UI.reqLevelSelector.append('<option>'+req+'</option>');
			});
			UI.reqLevelPanel.show();
		}
		else{
			UI.reqLevelPanel.hide();
		}

        if( ! Util.iterableLength(Validata.Schema) )
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
        
        $.extend( Validata.Schema, {
            parsed: false,
            errors: []
        });

        UI.schemaDescription.text(
            Util.stringValueNoBlank( Validata.Schema['description'], "No description available for this schema")
        );

        UI.schemaCreationDate.text(
            Util.stringValueNoBlank( moment.unix( Validata.Schema['creationDate'] ).format("DD/MM/YYYY HH:mm"), "No creation date available for this schema")
        );

        UI.schemaSourceText.text(
            Util.stringValueNoBlank( Validata.Schema['data'], "No source code for this schema")
        );
        
        // If any demo data exists for this schema, add a button to insert it
        if( Util.iterableLength(Validata.Schema.dataDemos) )
        {
            UI.demoPanelButtonGroup.empty();
            
            $.each(Validata.Schema.dataDemos, function schemaDataDemosIterator(index, dataDemoObject)
            {
                $('<button type="button" class="btn btn-block btn-success demoButton"><div class="demoButtonIcon"></div>' + dataDemoObject['name'] + '</button>').on('click', function dataDemoButtonClick() {
                    Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));
                    
                    UI.activateWizardStep("Data", true);
                    UI.dataSourceText.text(dataDemoObject['data']).change();
                }).appendTo( UI.demoPanelButtonGroup );
            });

            UI.demoPanel.removeClass('hidden');
        }
        else
        {
            UI.demoPanel.addClass('hidden');
        }
    },

    updateResourceShapeMapFromTable: function updateResourceShapeMapFromTable()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));
        
        var resourceShapeMap = {};

        UI.resourceShapeMapTableBody.find('tr').each(function resourceShapeMapTableBodyRowIterator( index ) {
            var row = $(this);
            var resource = row.find('select.resourceSelector').val();

            resourceShapeMap[resource] = row.find('select.shapeSelector').val();
        });

        Validata.Validation.options.resourceShapeMap = resourceShapeMap;
    },

    initializeResourceShapeMapTable: function initializeResourceShapeMapTable()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));
        
        if( UI.resourceShapeMapTableBody.is(':empty') )
        {

            var completeResourceShapeRow = true;

            var resourceShapeRow = $('<tr></tr>').addClass('resourceShapeRow');
            var resourceSelector = $('<select></select>').addClass('resourceSelector form-control');
            var shapeSelector = $('<select></select>').addClass('shapeSelector form-control');

            if (Util.iterableLength(Validata.Data.rawResponse['db']) && Util.iterableLength(Validata.Data.rawResponse['db']['SPO']))
            {
                $.each(Validata.Data.rawResponse['db']['SPO'], function rawDataResponseIterator(nodeKey, nodeObject)
                {
                    var selected = '';
                    var nodeKeyText = nodeKey.replace(/[<>]/g, '');

                    resourceSelector.append('<option value="' + nodeKeyText + '" ' + selected + '>' + nodeKeyText + '</option>');
                });

                var resourceSelectorCell = $('<td></td>').append(resourceSelector);
                resourceShapeRow.append(resourceSelectorCell);
            }
            else
            {
                completeResourceShapeRow = false;
            }

            if (Util.iterableLength(Validata.Schema.rawResponse.shapes))
            {
                $.each(Validata.Schema.rawResponse.shapes, function shapesResponseIterator(index, shape)
                {
                    var selected = '';

                    shapeSelector.append('<option value="' + shape + '" ' + selected + '>' + Util.escapeHtml(shape) + '</option>');
                });

                var shapeSelectorCell = $('<td></td>').append(shapeSelector);
                resourceShapeRow.append(shapeSelectorCell);
            }
            else
            {
                completeResourceShapeRow = false;
            }

            if (completeResourceShapeRow)
            {
                UI.resourceShapeMapTableBody.append(resourceShapeRow);
                UI.updateResourceShapeMapFromTable();
            }

            resourceSelector.on('change', function resourceSelectorChange()
            {
                UI.triggerStaggeredContentChange();
            });
            shapeSelector.on('change', function shapeSelectorChange()
            {
                UI.triggerStaggeredContentChange();
            });

            UI.addNewResourceShapeButton.off().on('click', function addNewResourceShapeButtonClick()
            {
                UI.resourceShapeMapTableBody.append(resourceShapeRow.clone(true));
                UI.triggerStaggeredContentChange();

                return false;
            });

            UI.removeResourceShapeButton.off().on('click', function removeResourceShapeButtonClick()
            {
                UI.resourceShapeMapTableBody.find('tr').last().remove();
                UI.triggerStaggeredContentChange();

                return false;
            });
        }
    }
    
};