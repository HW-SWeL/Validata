UI = {

    documentReady: function documentReady()
    {
        UI.initialiseElements();
        UI.refreshCurrentTab();
        UI.setupEventHandlers();
        UI.resetSchemaForm();
        UI.createCachedTabClone();
        UI.setupBootstrapSwitch(UI.mainTab);
    },

    initialiseElements: function initialiseElements()
    {
        UI.mainTab = $('#home');
        UI.tabList = $('#tabList');
        UI.tabContent = $('.tab-content');
        UI.schemaTab = $('.schemaTab');
        UI.addSchemaButton = UI.mainTab.find('.addSchema');

        UI.downloadConfigButton = $('#download');
        UI.importConfigSelector = $('#import');
        UI.schemaArray = [];
    },

    refreshCurrentTab: function refreshCurrentTab(){
        UI.currentTab = $('div.tab-pane.active');
        UI.schemaSourceFile = UI.currentTab.find('.schemaSourceFile');
        UI.schemaSourceText = UI.currentTab.find('.schemaSourceText');
        UI.titleInput = UI.currentTab.find('.titleInput');
        UI.descInput = UI.currentTab.find('.descriptionInput');
        UI.enabledInput = UI.currentTab.find('.enabledInput');
        UI.defaultInput = UI.currentTab.find('.defaultInput');
        UI.saveSchemaButton = UI.currentTab.find('.saveSchema');

        UI.schemaErrorAlert = UI.currentTab.find('.schemaErrorAlert');
        UI.schemaSuccessAlert = UI.currentTab.find('.schemaSuccessAlert');
        UI.submitButton = UI.currentTab.find('button.btn-success');
    },

    setupBootstrapSwitch: function setupBootstrapSwitch(elem){
        elem.find('.enabledInput').bootstrapSwitch();
        elem.find('.defaultInput').bootstrapSwitch();
    },

    createCachedTabClone: function createTabClone(){
      UI.cachedTab = UI.schemaTab.clone(true);
    },

    resetSchemaForm: function resetSchemaForm(){
        UI.mainTab.find('form')[0].reset();
        UI.addSchemaButton.addClass('disabled');
        UI.importConfigSelector.val('');
    },

    formValid: function formValid(){
        return UI.titleInput.val() && UI.descInput.val()
            && UI.schemaSourceText.val() && Validata.schemaValid;
    },

    checkSubmitButton: function checkSubmitButton(){
        if(UI.formValid()){
            UI.submitButton.removeClass('disabled');
            Util.animateOnce(UI.submitButton, 'tada');
        }
        else{
            UI.submitButton.addClass('disabled');
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
        var schemaTab = UI.cachedTab.clone(true);

        // create save button
        schemaTab.find('button.addSchema')
            .off()
            .removeClass('addSchema')
            .addClass('saveSchema disabled')
            .html('<span class="glyphicon glyphicon-floppy-save"></span> Save');

        // populate form fields
        schemaTab.find('.titleInput').val(schemaObject.title);
        schemaTab.find('.descriptionInput').val(schemaObject.description);
        schemaTab.find('.enabledInput').prop('checked', schemaObject.enabled);
        schemaTab.find('.defaultInput').prop('checked', schemaObject.default);
        schemaTab.find('.schemaSourceText').val(schemaObject.schema);

        UI.setupBootstrapSwitch(schemaTab);

        // get index for next tab
        var nextTab = $('#tabList li').size();
        var nextTabID = 'tab' + nextTab;
        var navTabID = 'nav_tab' + nextTab;

        // create the tab navigation
        $('<li><a id="' + navTabID + '" href="#'+ nextTabID +'" data-toggle="tab">' + schemaObject.title +'</a></li>').appendTo('#tabList');

        // create the tab content
        var newTabContent = $('<div class="tab-pane fade" id="'+ nextTabID +'" data-index="' + nextTab + '" >' + '</div>').appendTo('.tab-content');
        newTabContent.append(schemaTab);

        // animate new tab
        Util.animateOnce($('#' + navTabID), 'bounce');
    },

    getCurrentTabFields: function getCurrentTabFields(tab){
        return {
            title: tab.find('.titleInput').val(),
            description: tab.find('.descriptionInput').val(),
            enabled: tab.find('.enabledInput').prop('checked'),
            default: tab.find('.defaultInput').prop('checked'),
            creationDate: Util.getUnixtime(),
            schema: tab.find('.schemaSourceText').val()
        };
    },

    setupEventHandlers: function setupEventHandlers() {

        // refresh current tab pointer when switching tabs
        UI.tabList.on('shown.bs.tab', 'a[data-toggle="tab"]', UI.refreshCurrentTab),

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
                alert(errorMessage);
            };

            reader.readAsText(inputFile);
        });

        UI.addSchemaButton.on('click', function clickAddSchemaButton(e){
            e.preventDefault();

            // check if form valid
            if(UI.formValid()){
                var schemaObject = UI.getCurrentTabFields(UI.mainTab);

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

            if(UI.formValid()) {

                var tab = UI.getTabPane(this);
                var index = tab.data('index');

                // update with form values
                var schemaObject = UI.getCurrentTabFields(tab);

                // reset tab nav title
                UI.tabList.find('a').eq(index).text(schemaObject.title);

                // reset default values if necessary
                UI.resetDefaultInput(schemaObject.default);

                // save to schemaArray
                UI.schemaArray[index] = schemaObject;

                // signal that changes were saved
                UI.saveSchemaButton.addClass('disabled');
            }

        }),

        UI.downloadConfigButton.on('click', function clickDownloadConfigButton(){
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
        }),

        UI.importConfigSelector.on('change', function clickImportConfigSelector(){

            var inputFiles = this.files;

            if (inputFiles == undefined || inputFiles.length == 0) {
                return;
            }
            var inputFile = inputFiles[0];

            var reader = new FileReader();

            reader.onload = function (event) {
                UI.schemaArray = JSON.parse(event.target.result).schemas;

                // populate new tab nav and content
                $(UI.schemaArray).each(function(){
                   UI.createNewTab(this);
                });
            };

            reader.onerror = function (event) {
                var errorMessage = "Selected file could not be uploaded. Error: " + event.target.error.code;
                alert(errorMessage);
            };

            reader.readAsText(inputFile);
        });
    }
};