UI = {

    documentReady: function documentReady()
    {
        UI.selectCommonElements();
        UI.setupEventHandlers();
    },

    selectCommonElements: function selectCommonElements()
    {
        UI.mainTab = $('#home');
        UI.tabList = $('#tabList');
        UI.tabContent = $('.tab-content');
        UI.schemaTab = $('.schemaTab');

        UI.schemaSourceFile = UI.mainTab.find('.schemaSourceFile');
        UI.schemaSourceText = UI.mainTab.find('.schemaSourceText');
        UI.titleInput = UI.mainTab.find('.titleInput');
        UI.descInput = UI.mainTab.find('.descriptionInput');
        UI.enabledInput = UI.mainTab.find('.enabledInput');
        UI.defaultInput = UI.mainTab.find('.defaultInput');

        UI.schemaErrorAlert = UI.mainTab.find('.schemaErrorAlert');
        UI.schemaSuccessAlert = UI.mainTab.find('.schemaSuccessAlert');
        UI.addSchemaButton = UI.mainTab.find('.addSchema');
        UI.saveSchemaButton = $('.saveSchema');
        UI.downloadConfigButton = $('#finish');

        UI.schemaArray = [];
    },

    resetSchemaForm: function resetSchemaForm(){
        UI.mainTab.find('form')[0].reset();
        UI.addSchemaButton.addClass('disabled');
    },

    formValid: function formValid(){
        return UI.titleInput.val() && UI.descInput.val()
            && UI.schemaSourceText.val() && Validata.schemaValid;
    },

    checkSubmitButton: function checkSubmitButton(){
        if(UI.formValid()){
            UI.addSchemaButton.removeClass('disabled');
            Util.animateOnce(UI.addSchemaButton, 'tada');
        }
        else{
            UI.addSchemaButton.addClass('disabled');
        }
    },

    resetDefaultInput: function resetDefaultInput(defaultChecked){
        if(defaultChecked){
            $(UI.schemaArray).each(function(){
                this.default = false;
            });
            $('.defaultInput').prop('checked', false);
            UI.defaultInput.prop('checked', true);
        }
    },

    getTabPane: function getTabPane(elem){
        return $(elem).closest('.tab-pane');
    },

    createNewTab: function createNewTab(schemaObject){
        var schemaTab = UI.schemaTab.clone(true);

        // create save button
        schemaTab.find('button.addSchema')
            .removeClass('addSchema')
            .addClass('saveSchema')
            .html('<span class="glyphicon glyphicon-floppy-save"></span> Save');

        // workaround for textarea cloning bug: http://bugs.jquery.com/ticket/3016
        schemaTab.find('.schemaSourceText').val(schemaObject.schema);

        // add a 'remove schema' button

        // get index for next tab
        var nextTab = $('#tabList li').size();
        var nextTabID = 'tab' + nextTab;
        var navTabID = 'nav_tab' + nextTab;

        // create the tab navigation
        $('<li><a id="' + navTabID + '" href="#'+ nextTabID +'" data-toggle="tab">' + schemaObject.title +'</a></li>').appendTo('#tabList');

        // create the tab content
        var newTabContent = $('<div class="tab-pane" id="'+ nextTabID +'" data-index="' + nextTab + '" >' + '</div>').appendTo('.tab-content');
        newTabContent.append(schemaTab);

        // animate new tab
        Util.animateOnce($('#' + navTabID), 'bounce');

    },

    setupEventHandlers: function setupEventHandlers() {

        // Selecting a file using the file chooser should cause the content of that file to be loaded into the data source div as text
        UI.schemaSourceFile.on('change', function schemaSourceFileChange() {
            Log.v("UI." + Log.getInlineFunctionTrace(arguments, arguments.callee));
            var inputFiles = this.files;

            if (inputFiles == undefined || inputFiles.length == 0) {
                return;
            }
            var inputFile = inputFiles[0];

            var reader = new FileReader();

            reader.onload = function (event) {
                UI.schemaSourceText.val(event.target.result).change();
            };

            reader.onerror = function (event) {
                var errorMessage = "Selected file could not be uploaded. Error: " + event.target.error.code;
            };

            reader.readAsText(inputFile);

        });

        UI.addSchemaButton.on('click', function clickAddSchemaButton(e){
            e.preventDefault();

            // check if form valid
            if(UI.formValid()){
                var schemaObject = {
                    title: UI.titleInput.val(),
                    description: UI.descInput.val(),
                    enabled: UI.enabledInput.prop('checked'),
                    default: UI.defaultInput.prop('checked'),
                    creationDate: Util.getUnixtime(),
                    schema: UI.schemaSourceText.val()
                };

                // reset default values if necessary
                UI.resetDefaultInput(schemaObject.default);

                // create new schema panel
                UI.createNewTab(schemaObject);

                // move schema to schema array
                UI.schemaArray.push(schemaObject);

                // reset form
                UI.resetSchemaForm();

                // enable download button
                UI.downloadConfigButton.removeClass('disabled');
            }

        });

        UI.schemaSourceText.on('change keyup paste', function validateSchema(){

            Util.waitForFinalEvent(function waitForFinalEventCallback()
            {
                ShExValidator.validate(UI.schemaSourceText.val(), "", Validata.callbacks, {});
            }, 500, "schemaValidator");

        }),

        UI.tabContent.on('click','.saveSchema', function clickSaveSchemaButton(e){
            e.preventDefault();

            var tab = UI.getTabPane(this);
            var index = tab.data('index');
            // update with form values
            var schemaObject = {
                title: tab.find('.titleInput').val(),
                description: tab.find('.descriptionInput').val(),
                enabled: tab.find('.enabledInput').prop('checked'),
                default: tab.find('.defaultInput').prop('checked'),
                creationDate: Util.getUnixtime(),
                schema: tab.find('.schemaSourceText').val()
            };

            // save to schemaArray
            UI.schemaArray[index] = schemaObject;

            console.log('saved object');

        }),

        UI.downloadConfigButton.on('click', function clickDownloadConfigButton(e){
            // create json object from schema array
            var file = {
                schemas: UI.schemaArray,
                options: {
                    showSourceButton: true,
                    allowCustomSchema: false
                }
            };
            var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(file, null, "\n"));
            UI.downloadConfigButton.attr("href", "data:"+data);
        });
    }
};