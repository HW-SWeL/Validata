var pageInitialized = false;
$(function documentReady()
{

    // This works around crosswalk occasionally firing the onPageLoadStarted and onPageLoadStopped events after a login(?!) and therefore the document ready event gets fired when the document is already ready
    if (pageInitialized)
    {
        return;
    }
    pageInitialized = true;

    window.onerror = function onerror(message, file, line, col, e)
    {
        // Only Chrome & Opera (Blink engine) pass the error object, which we need to get a stack trace
        if (typeof(e) != "undefined")
        {
            ShExLog.exception(e);
        }
    };
    
    if( typeof ShExValidataConfig == 'undefined' )
    {
        $('#form-selectschema').prepend('<div class="alert alert-danger" role="alert">' +
                                        '<h4>ShExValidataConfig could not be loaded</h4>' +
                                        '<h5>Please ensure ShExValidataConfig.js exists and is readable in the javascripts directory.</h5>' +
                                        '</div>');
        
        ShExValidataConfig = {};
    }

    ParsedSchema = false;
    ParsedData = false;
    
    var schemaSelector = $('#schemaSelector');
    
    if( ! ShExUtil.isIterable(ShExValidataConfig['schemas']) )
    {
        ShExLog.w("ShExValidataConfig['schemas'] is not iterable, replacing with empty array");
        ShExValidataConfig['schemas'] = [];
    }

    var customSchemaIndex = ShExValidataConfig['schemas'].push({
            enabled: true,
            name: "Custom",
            description: "Enter your own custom schema to validate against"
    }) - 1;

    schemaSelector.append('<option value=""></option>');
    
    $.each(ShExValidataConfig['schemas'], function(index, schema){
        if(schema['enabled'])
        {
            schemaSelector.append('<option value="' + index + '">' + schema['name'] + '</option>');
        }
    });

    var schemaSourceText = $('#schemaSourceText');
    var customSchemaText = $('#customSchemaText');
    var rdfDataText = $('#rdfDataText');
    var schemaDescription = $('#schemaDescription');
    var toggleSchemaSourceButton = $('#toggleSchemaSource');
    var wizardSidebar = $('.wizardSidebar');
    
    toggleSchemaSourceButton.off('click').on('click', function() 
    {
        if( toggleSchemaSourceButton.text() == "Show ShEx Source" )
        {
            $('#schemaSourceText').removeClass('hidden');
            toggleSchemaSourceButton.text("Hide ShEx Source");
        }
        else
        {
            $('#schemaSourceText').addClass('hidden');
            toggleSchemaSourceButton.text("Show ShEx Source");
        }
    });

    schemaSelector.on('change', function(){
        var selectedSchemaIndex = schemaSelector.val();
        schemaDescription.text( ShExUtil.stringValueNoBlank(ShExValidataConfig['schemas'][selectedSchemaIndex]['description'], "No description available for this schema") );
        schemaSourceText.text( ShExUtil.stringValueNoBlank(ShExValidataConfig['schemas'][selectedSchemaIndex]['data'], "No source code for this schema") );

        if( selectedSchemaIndex == customSchemaIndex )
        {
            $('#customSchemaTextContainer').removeClass('hidden');
            $('#toggleSchemaSourceContainer').addClass('hidden');
            schemaSourceText.addClass('hidden');
            toggleSchemaSourceButton.text("Show ShEx Source");
        }
        else
        {
            $('#customSchemaTextContainer').addClass('hidden');
            $('#toggleSchemaSourceContainer').removeClass('hidden');

            beforeStepChange("selectSchema", "inputRDFData");
        }
    });

    customSchemaText.on('change', function(){
        beforeStepChange("selectSchema", "inputRDFData");
    });
    
    rdfDataText.on('change', function(){
        beforeStepChange("inputRDFData", "configureOptions");
    });
    
    $('#validateButton').off('click').on('click', function(){
        beforeStepChange("configureOptions", "validationResults");
    });
    
    $('#insertOneTripleSampleData').click(function() 
    {
        rdfDataText.val("PREFIX foaf: <http://xmlns.com/foaf/>\n" +
        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
        "<Somebody>\n" +
        "    foaf:name \"Mr Smith\"^^rdf:langString.\n").change();
    });
    
    $('#insertIssueSampleData').click(function() 
    {
        rdfDataText.val("#BASE <http://base.example/#>\n" +
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
    
    function beforeStepChange(currentStepId, newStepId)
    {
        var errorMessage = "";
        
        var callbacks = {};
        
        var options = {};
        
        var currentStepPanel = $('#' + currentStepId);
        var newStepPanel = $('#' + newStepId);

        
        var selectedSchemaIndex = schemaSelector.val();
        var selectedSchema = ShExValidataConfig['schemas'][selectedSchemaIndex];

        var schemaText = $('#customSchemaText').val();
        if( ShExUtil.isDefined( ShExValidataConfig['schemas'][selectedSchemaIndex]['data'] ) )
        {
            schemaText = ShExValidataConfig['schemas'][selectedSchemaIndex]['data'];
        }
        
        var rdfDataTextValue = rdfDataText.val();

        var startingNodesSelector = $('#startingNodesSelector');
        
        
        if( currentStepId == "selectSchema")
        {
            
            if(ShExUtil.stringIsBlank(schemaText))
            {
                errorMessage = "Schema cannot be empty!";
                currentStepPanel.find('.validationErrorAlert').removeClass('hidden').find('.sourceText').text(errorMessage);
            }
            else
            {
                callbacks = {
                    schemaParsed: function (responseObject) {
                        ShExLog.i("beforeStepChange : schemaParsed");
                        ShExLog.i(responseObject);

                        ParsedSchema = responseObject;
                        currentStepPanel.find('.validationErrorAlert').addClass('hidden');
                        
                        changeStep(currentStepId, newStepId);
                    },

                    schemaParseError: function (responseObject) {
                        ShExLog.i("beforeStepChange: schemaParseError");
                        ShExLog.i(responseObject);

                        ParsedSchema = false;
                        currentStepPanel.find('.validationErrorAlert').removeClass('hidden').find('.sourceText').text(responseObject);
                    }
                };

                options = {
                    closedShapes: true,
                    startingNodes: []
                };
                
                ShExValidator.validate(schemaText, "", callbacks, options);
            }
        }
        else if( currentStepId == "inputRDFData")
        {
            
            if(ShExUtil.stringIsBlank(rdfDataTextValue))
            {
                errorMessage = "RDF data cannot be empty!";
                currentStepPanel.find('.validationErrorAlert').removeClass('hidden').find('.sourceText').text(errorMessage);
            }
            else
            {
                callbacks = {
                    dataParsed: function (responseObject) {
                        ShExLog.i("beforeStepChange : dataParsed");
                        ShExLog.i(responseObject);

                        ParsedData = responseObject;
                        currentStepPanel.find('.validationErrorAlert').addClass('hidden');

                        startingNodesSelector.multiselect('destroy');
                        startingNodesSelector.empty();
                        
                        var selected = 'selected';
                        $.each(ParsedData['db']['SPO'], function(nodeKey, nodeObject){
                            var nodeKeyText = nodeKey.replace(/[<>]/g, '');
                            startingNodesSelector.append('<option value="' + nodeKeyText + '" ' + selected + '>' + nodeKeyText + '</option>');
                            selected = '';
                        });
                        
                        startingNodesSelector.multiselect();
                        
                        changeStep(currentStepId, newStepId);
                    },

                    dataParseError: function (responseObject) {
                        ShExLog.i("beforeStepChange: dataParseError");
                        ShExLog.i(responseObject);

                        ParsedData = false;
                        currentStepPanel.find('.validationErrorAlert').removeClass('hidden').find('.sourceText').text(responseObject);
                    }
                };

                options = {
                    closedShapes: true,
                    startingNodes: []
                };
                
                ShExValidator.validate("", rdfDataTextValue, callbacks, options);
            }
        }
        else if( newStepId == "validationResults")
        {
            options = {
                closedShapes: true,
                startingNodes: startingNodesSelector.val()
            };
            
            if( ShExUtil.iterableLength( options['startingNodes'] ) )
            {
                currentStepPanel.find('.validationErrorAlert').addClass('hidden');
                
                callbacks = {
                    validationResult: function (resultObject) {
                        ShExLog.i("validationResult: ");
                        ShExLog.i(resultObject);

                        $('#rawValidationResults').text( JSON.stringify(resultObject) );

                        if( resultObject['passed'] )
                        {
                            $('.validationFailedAlert').addClass('hidden');
                            $('.validationSuccessAlert').removeClass('hidden');
                        }
                        else
                        {
                            var errorMessage = "";

                            if( ShExUtil.iterableLength(resultObject['errors']) )
                            {
                                $.each(resultObject['errors'], function(index, errorObject) {
                                    errorMessage += errorObject['name'] + " @ " + errorObject['triple'].toString() + "\n\n";
                                });
                            }

                            $('.validationFailedAlert').removeClass('hidden').find('.sourceText').text( errorMessage );
                            $('.validationSuccessAlert').addClass('hidden');
                        }

                        changeStep(currentStepId, newStepId);
                    }
                };

                ShExLog.i( "About to call final validate() with schemaText, rdfDataTextValue and options");
                ShExLog.i( ShExValidator.validate(schemaText, rdfDataTextValue, callbacks, options) );
            }
            else
            {
                errorMessage = "At least one starting node must be selected!";
                currentStepPanel.find('.validationErrorAlert').removeClass('hidden').find('.sourceText').text(errorMessage);
            }
            
        }
        else
        {
            changeStep(currentStepId, newStepId);
        }
    }
    
    function changeStep(currentStepId, newStepId)
    {
        var currentStepPanel = $('#' + currentStepId);
        var currentStepCollapsingPanel = currentStepPanel.find('.panel-collapse');
        var currentStepSidebarEntry = wizardSidebar.find('.' + currentStepId);

        var newStepPanel = $('#' + newStepId);
        var newStepCollapsingPanel = newStepPanel.find('.panel-collapse');
        var newStepSidebarEntry = wizardSidebar.find('.' + newStepId);

        currentStepPanel.removeClass('panel-primary').addClass('panel-info');
        currentStepCollapsingPanel.addClass('in');
        currentStepSidebarEntry.removeClass('wizard-todo wizard-active');
        currentStepSidebarEntry.addClass('wizard-completed');

        newStepPanel.removeClass('panel-info').addClass('panel-primary');
        newStepCollapsingPanel.addClass('in');
        newStepSidebarEntry.removeClass('wizard-todo wizard-completed');
        newStepSidebarEntry.addClass('wizard-active');

        newStepCollapsingPanel[0].scrollIntoView();
    }
    
    $('#rdfDataFile').on('change', function() {
        var $input = $(this);
        var inputFiles = this.files;
        if(inputFiles == undefined || inputFiles.length == 0) return;
        var inputFile = inputFiles[0];

        var reader = new FileReader();
        reader.onload = function(event) {
            rdfDataText.val(event.target.result).change();
        };
        reader.onerror = function(event) {
            var errorMessage = "Selected file could not be uploaded. Error: " + event.target.error.code;
            $('#inputRDFData').find('.validationErrorAlert').removeClass('hidden').find('.sourceText').text(errorMessage);
        };
        reader.readAsText(inputFile);
    });

});