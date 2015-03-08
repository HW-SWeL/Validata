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
        
        UI.quickSummarySectionsTable = $('#quickSummarySectionsTable');
        UI.quickSummarySections = UI.quickSummarySectionsTable.find('tr.quickSummarySection');
        
        UI.quickSummarySectionSchema = $('#quickSummarySectionSchema');
        UI.quickSummarySectionData = $('#quickSummarySectionData');
        UI.quickSummarySectionResults = $('#quickSummarySectionResults');
        
        UI.demoPanelButtonGroup = $('#demoPanelButtonGroup');
        
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
        
        UI.dataStartNodesSelector = $('#dataStartNodesSelector');
        UI.schemaStartShapeSelector = $('#schemaStartShapeSelector');
        
        UI.schemaErrorAlert = $('#schemaErrorAlert');
        UI.dataErrorAlert = $('#dataErrorAlert');
        UI.optionsErrorAlert = $('#optionsErrorAlert');
        
        UI.validationSuccessAlert = $('#validationSuccessAlert');
        UI.validationErrorAlert = $('#validationErrorAlert');
        UI.validationErrorsList = $('#validationErrorsList');
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

        // Selecting a schema from the dropdown list should update the selected schema details in Validata and show the basic properties from the config
        UI.schemaSelector.on('change', function schemaSelectorChange()
        {
            UI.updateSelectedSchema();
            UI.triggerStaggeredContentChange();
        });

        // Pressing any key inside or changing the value of any input or editable source text field inside a step panel triggers the staggered update
        UI.wizardStepPanels
            .find('select, input, div.editableSourceText')
            .add( UI.schemaSourceText )
            .on('change keyup', function wizardStepPanelsInputChange()
        {
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
        
        // Modifying the content in the schema source text box should update the content stored in the data object and trigger a re-validation
        UI.schemaSourceText.on('change', function schemaSourceTextChange()
        {
            Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

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
                UI.dataSourceText.text(event.target.result).change();
            };
            
            reader.onerror = function (event)
            {
                var errorMessage = "Selected file could not be uploaded. Error: " + event.target.error.code;
                UI.dataSourceText.text(errorMessage).change();
            };
            
            reader.readAsText(inputFile);
        });

    },

    triggerStaggeredContentChange: function triggerStaggeredContentChange()
    {
        Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));

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
        Validata.validate();
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

        var selectedSchemaIndex = UI.schemaSelector.val();
        
        Validata.Schema = ShExValidataConfig['schemas'][selectedSchemaIndex];

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

        // Clear any demo buttons which were previously shown 
        UI.demoPanelButtonGroup.empty();
        
        // If any demo data exists for this schema, add a button to insert it
        if( Util.iterableLength(Validata.Schema.dataDemos) )
        {
            $.each(Validata.Schema.dataDemos, function schemaDataDemosIterator(index, dataDemoObject)
            {
                $('<button type="button" class="btn btn-block btn-success demoButton"><div class="demoButtonIcon"></div>' + dataDemoObject['name'] + '</button>').on('click', function dataDemoButtonClick() {
                    Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));
                    
                    UI.activateWizardStep("Data", true);
                    UI.dataSourceText.text(dataDemoObject['data']).change();
                }).appendTo( UI.demoPanelButtonGroup );
            });

        }
    }
    
};