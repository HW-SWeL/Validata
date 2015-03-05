Validata = {

    Schema: {
        parsed: false,
        content: ""
    },
        
    Data: {
        parsed: false,
        content: ""
    },

    Validation: {
        passed: false
    },

    initializePageOnDocumentReady: function initializePageOnDocumentReady()
    {
        Validata.wizardSteps = $('#wizardSteps');
        Validata.wizardStepsSidebar = $('#wizardStepsSidebar');

        Validata.wizardStepPanelSchema = $('#wizardStepPanelSchema');
        Validata.wizardStepPanelData = $('#wizardStepPanelData');
        Validata.wizardStepPanelOptions = $('#wizardStepPanelOptions');
        Validata.wizardStepPanelResults = $('#wizardStepPanelResults');

        Validata.schemaSelector = $('#schemaSelector');
        Validata.schemaSourceText = $('#schemaSourceText');
        Validata.schemaDescription = $('#schemaDescription');
        Validata.toggleSchemaSourceButton = $('#toggleSchemaSource');
        Validata.customSchemaText = $('#customSchemaText');
        
        Validata.rdfDataText = $('#rdfDataText');
        Validata.rdfDataTextValue = "";

        Validata.selectedSchemaIndex = 0;
        
        Validata.customSchemaIndex = ShExValidataConfig['schemas'].push({
                enabled: true,
                name: "Custom",
                description: "Enter your own custom schema to validate against"
            }) - 1;

        Validata.schemaSelector.append('<option value=""></option>');


        Validata.toggleSchemaSourceButton.off('click').on('click', function ()
        {
            if (Validata.toggleSchemaSourceButton.text() == "Show ShEx Source")
            {
                $('#schemaSourceText').removeClass('hidden');
                Validata.toggleSchemaSourceButton.text("Hide ShEx Source");
            }
            else
            {
                $('#schemaSourceText').addClass('hidden');
                Validata.toggleSchemaSourceButton.text("Show ShEx Source");
            }
        });

        Validata.schemaSelector.on('change', function ()
        {
            Validata.selectedSchemaIndex = Validata.schemaSelector.val();
            Validata.schemaDescription.text(Util.stringValueNoBlank(ShExValidataConfig['schemas'][Validata.selectedSchemaIndex]['description'], "No description available for this schema"));
            Validata.schemaSourceText.text(Util.stringValueNoBlank(ShExValidataConfig['schemas'][Validata.selectedSchemaIndex]['data'], "No source code for this schema"));

            if (Validata.selectedSchemaIndex == Validata.customSchemaIndex)
            {
                $('#customSchemaTextContainer').removeClass('hidden');
                $('#toggleSchemaSourceContainer').addClass('hidden');
                Validata.schemaSourceText.addClass('hidden');
                Validata.toggleSchemaSourceButton.text("Show ShEx Source");
            }
            else
            {
                $('#customSchemaTextContainer').addClass('hidden');
                $('#toggleSchemaSourceContainer').removeClass('hidden');
            }
        });
        
        $.each(ShExValidataConfig['schemas'], function (index, schema)
        {
            if (schema['enabled'])
            {
                Validata.schemaSelector.append('<option value="' + index + '">' + schema['name'] + '</option>');
            }
        });
        
        $('.wizardStepPanel').on('click', function ()
        {
            Validata.activateWizardStep( $(this).attr('id') );
            Validata.validate();
        }).find('input, textarea').on('change', function ()
        {
            Validata.validate();
        });
        
        $('#insertOneTripleSampleData').click(function ()
        {
            Validata.rdfDataText.val("PREFIX foaf: <http://xmlns.com/foaf/>\n" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "<Somebody>\n" +
            "    foaf:name \"Mr Smith\"^^rdf:langString.\n").change();
        });

        $('#insertIssueSampleData').click(function ()
        {
            Validata.rdfDataText.val("#BASE <http://base.example/#>\n" +
            "PREFIX ex: <http://ex.example/#>\n" +
            "PREFIX foaf: <http://xmlns.com/foaf/>\n" +
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n" +
            "\n" +
            "<Issue1>\n" +
            "    ex:state        ex:unassigned ;\n" +
            "    ex:reportedBy   <User2> ;\n" +
            "    ex:reportedOn   \"2013-01-23T10:18:00\"^^xsd:dateTime ;\n" +
            "    ex:reproducedBy <Thompson.J> ;\n" +
            "    ex:reproducedOn \"2013-01-23T11:00:00\"^^xsd:dateTime ;\n" +
            "#    ex:related      <Issue2>, <Issue3>\n" +
            ".\n" +
            "\n" +
            "<User2>\n" +
            "    foaf:givenName \"Bob\" ;\n" +
            "    foaf:familyName \"Smith\" ;\n" +
            "    foaf:mbox <mailto:bob@example.org>\n" +
            ".\n" +
            "\n" +
            "<Thompson.J>\n" +
            "    foaf:givenName \"Joe\", \"Joseph\" ;\n" +
            "    foaf:familyName \"Thompson\" ;\n" +
            "    foaf:phone <tel:+456> ;\n" +
            "    foaf:mbox <mailto:joe@example.org>\n" +
            ".\n").change();
        });


        $('#rdfDataFile').on('change', function ()
        {
            var $input = $(this);
            var inputFiles = this.files;
            if (inputFiles == undefined || inputFiles.length == 0)
            {
                return;
            }
            var inputFile = inputFiles[0];

            var reader = new FileReader();
            reader.onload = function (event)
            {
                Validata.rdfDataText.val(event.target.result).change();
            };
            reader.onerror = function (event)
            {
                var errorMessage = "Selected file could not be uploaded. Error: " + event.target.error.code;
                $('#inputRDFData').find('.validationErrorAlert').removeClass('hidden').find('.sourceText').text(errorMessage);
            };
            reader.readAsText(inputFile);
        });

    },

    activateWizardStep: function activateWizardStep(newStepId)
    {
        Log.d("Activating new wizard step: " + newStepId);
        
        // Make any active panel inactive and make sidebar icon inactive
        Validata.wizardSteps.find('.wizardStepPanel.panel-primary').removeClass('panel-primary').addClass('panel-info');
        Validata.wizardStepsSidebar.find('.wizard-active').removeClass('wizard-active');

        // Make new active panel active and make sidebar icon active
        $('#' + newStepId).removeClass('panel-info').addClass('panel-primary');
        Validata.wizardStepsSidebar.find('.' + newStepId).addClass('wizard-active');
    },

    validate: function validate()
    {
        var errorMessage = "";

        var callbacks = {
            schemaParsed: function (responseObject)
            {
                Validata.Schema.parsed = true;
                Validata.Schema.content = responseObject;

                Validata.wizardStepPanelSchema.find('.validationErrorAlert').addClass('hidden');

                Validata.updateQuickSummaryPanel();
            },

            schemaParseError: function (responseObject)
            {
                Validata.Schema.parsed = false;
                Validata.Schema.content = responseObject;

                Validata.wizardStepPanelSchema.find('.validationErrorAlert').removeClass('hidden').find('.sourceText').text(responseObject);

                Validata.updateQuickSummaryPanel();
            },

            dataParsed: function (responseObject)
            {
                Validata.Data.parsed = true;
                Validata.Data.content = responseObject;

                Validata.wizardStepPanelData.find('.validationErrorAlert').addClass('hidden');

                startingNodesSelector.multiselect('destroy');
                startingNodesSelector.empty();

                var selected = 'selected';
                $.each(Validata.Data.content['db']['SPO'], function (nodeKey, nodeObject)
                {
                    var nodeKeyText = nodeKey.replace(/[<>]/g, '');
                    startingNodesSelector.append('<option value="' + nodeKeyText + '" ' + selected + '>' + nodeKeyText + '</option>');
                    selected = '';
                });

                startingNodesSelector.multiselect();

                Validata.updateQuickSummaryPanel();
            },

            dataParseError: function (responseObject)
            {
                Validata.Data.parsed = false;
                Validata.Data.content = responseObject;

                Validata.wizardStepPanelData.find('.validationErrorAlert').removeClass('hidden').find('.sourceText').text(responseObject);

                Validata.updateQuickSummaryPanel();
            },

            validationResult: function (resultObject)
            {
                $('#rawValidationResults').text(JSON.stringify(resultObject));

                if (resultObject['passed'])
                {
                    $('.validationFailedAlert').addClass('hidden');
                    $('.validationSuccessAlert').removeClass('hidden');
                    
                    Validata.Validation.passed = true;
                }
                else
                {
                    Validata.Validation.passed = false;
                    
                    var errorMessage = "";

                    if (Util.iterableLength(resultObject['errors']))
                    {
                        $.each(resultObject['errors'], function (index, errorObject)
                        {
                            errorMessage += errorObject['name'] + " @ " + errorObject['triple'].toString() + "\n\n";
                        });
                    }

                    $('.validationFailedAlert').removeClass('hidden').find('.sourceText').text(errorMessage);
                    $('.validationSuccessAlert').addClass('hidden');
                }

                Validata.updateQuickSummaryPanel();
            }
        };

        Validata.selectedSchemaIndex = Validata.schemaSelector.val();
        Validata.selectedSchema = ShExValidataConfig['schemas'][Validata.selectedSchemaIndex];

        Validata.schemaText = $('#customSchemaText').val();
        if (Util.isDefined(ShExValidataConfig['schemas'][Validata.selectedSchemaIndex]) && Util.isDefined(ShExValidataConfig['schemas'][Validata.selectedSchemaIndex]['data']))
        {
            Validata.schemaText = ShExValidataConfig['schemas'][Validata.selectedSchemaIndex]['data'];
        }

        var startingNodesSelector = $('#startingNodesSelector');

        var options = {
            closedShapes: true,
            startingNodes: startingNodesSelector.val()
        };

        Validata.rdfDataTextValue = Validata.rdfDataText.val();


        if (Util.stringIsBlank(Validata.schemaText))
        {
            errorMessage = "Schema cannot be empty!";
            Validata.wizardStepPanelSchema.find('.validationErrorAlert').removeClass('hidden').find('.sourceText').text(errorMessage);
        }
        
        if (Util.stringIsBlank(Validata.rdfDataTextValue))
        {
            errorMessage = "RDF data cannot be empty!";
            Validata.wizardStepPanelData.find('.validationErrorAlert').removeClass('hidden').find('.sourceText').text(errorMessage);
        }

        if (Util.iterableLength(options['startingNodes']))
        {
            Validata.wizardStepPanelOptions.find('.validationErrorAlert').addClass('hidden');
        }
        else
        {
            errorMessage = "At least one starting node must be selected!";
            Validata.wizardStepPanelOptions.find('.validationErrorAlert').removeClass('hidden').find('.sourceText').text(errorMessage);
        }
        
        ShExValidator.validate(Validata.schemaText, Validata.rdfDataTextValue, callbacks, options);
        
    },
    
    updateQuickSummaryPanel: function updateQuickSummaryPanel()
    {
        Log.d("Updating summary panel");
        
        var statusClasses = 'quickSummaryStatusIncomplete quickSummaryStatusInvalid quickSummaryStatusValid';
        
        if( Util.iterableLength( Validata.Schema ) )
        {
            if( Util.iterableLength( Validata.Schema.content ) )
            {

                if( Validata.Schema.parsed )
                {
                    $('#schemaSummary').removeClass(statusClasses).addClass('quickSummaryStatusValid');
                }
                else
                {
                    $('#schemaSummary').removeClass(statusClasses).addClass('quickSummaryStatusInvalid');
                }
                
            }
            else
            {
                $('#schemaSummary').removeClass(statusClasses).addClass('quickSummaryStatusIncomplete');
            }
        }
        else
        {
            $('#schemaSummary').removeClass(statusClasses).addClass('quickSummaryStatusIncomplete');
        }
        
        if( Util.iterableLength( Validata.Data ) )
        {
            if( Util.iterableLength( Validata.Data.content ) )
            {

                if( Validata.Data.parsed )
                {
                    $('#dataSummary').removeClass(statusClasses).addClass('quickSummaryStatusValid');
                }
                else
                {
                    $('#dataSummary').removeClass(statusClasses).addClass('quickSummaryStatusInvalid');
                }
                
            }
            else
            {
                $('#dataSummary').removeClass(statusClasses).addClass('quickSummaryStatusIncomplete');
            }
        }
        else
        {
            $('#dataSummary').removeClass(statusClasses).addClass('quickSummaryStatusIncomplete');
        }
        
        if( Util.iterableLength( Validata.Validation ) )
        {
            if( Validata.Validation.passed )
            {
                $('#validationSummary').removeClass(statusClasses).addClass('quickSummaryStatusValid');
            }
            else
            {
                $('#validationSummary').removeClass(statusClasses).addClass('quickSummaryStatusInvalid');
            }
        }
        else
        {
            $('#validationSummary').removeClass(statusClasses).addClass('quickSummaryStatusIncomplete');
        }
    }

};
