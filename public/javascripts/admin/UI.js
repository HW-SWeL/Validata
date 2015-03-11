UI = {

    documentReady: function documentReady()
    {
        UI.selectCommonElements();
        UI.setupEventHandlers();
    },

    selectCommonElements: function selectCommonElements()
    {
        UI.mainPanel = $('#home');
        UI.panelContainer = $('.panel-group');
        UI.tabList = $('#tabList');
        UI.schemaPanel = $('.schemaPanel');

        UI.schemaSourceFile = UI.mainPanel.find('.schemaSourceFile');
        UI.schemaSourceText = UI.mainPanel.find('.schemaSourceText');
        UI.titleInput = UI.mainPanel.find('.titleInput');
        UI.descInput = UI.mainPanel.find('.descriptionInput');

        UI.addSchemaButton = UI.mainPanel.find('.addSchema');
        UI.downloadConfigButton = $('#finish');

        UI.schemaArray = [];
    },

    resetSchemaForm: function resetSchemaForm(){
        UI.mainPanel.find('form')[0].reset();
    },

    createNewPanel: function createNewPanel(schemaObject){
        var schemaPanel = UI.schemaPanel.parent().clone();

        // remove or edit add schema button
        schemaPanel.find('button.addSchema').remove();

        // workaround for textarea cloning bug: http://bugs.jquery.com/ticket/3016
        schemaPanel.find('.schemaSourceText').val(schemaObject.schema);

        // add a 'remove schema' button

        // get index for next tab
        var nextTab = $('#tabList li').size() + 1;
        var nextTabID = 'tab' + nextTab;
        var navTabID = 'nav_tab' + nextTab;

        // create the tab navigation
        $('<li><a id="' + navTabID + '" href="#'+ nextTabID +'" data-toggle="tab">' + schemaObject.title +'</a></li>').appendTo('#tabList');

        // create the tab content
        var newTabContent = $('<div class="tab-pane" id="'+ nextTabID +'">' + '</div>').appendTo('.tab-content');
        newTabContent.append(schemaPanel);

        // animate new tab
        $('#' + navTabID).addClass('animated bounce')
            .one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
                $(this).removeClass('animated bounce')
        });

    },

    setupEventHandlers: function setupEventHandlers()
    {
        // Selecting a file using the file chooser should cause the content of that file to be loaded into the data source div as text
        UI.schemaSourceFile.on('change', function schemaSourceFileChange() {
            var inputFiles = this.files;

            if (inputFiles == undefined || inputFiles.length == 0) {
                return;
            }
            var inputFile = inputFiles[0];

            var reader = new FileReader();

            reader.onload = function (event) {
                UI.schemaSourceText.text(event.target.result).change();
            };

            reader.onerror = function (event) {
                var errorMessage = "Selected file could not be uploaded. Error: " + event.target.error.code;
                UI.schemaSourceText.text(errorMessage).change();
            };

            reader.readAsText(inputFile);
        });

        UI.addSchemaButton.on('click', function clickAddSchemaButton(e){
            e.preventDefault();

            var schemaObject = {
                //title: titleInput.val(),
                //description: descInput.val(),
                //schema: schemaInput.text()
                title: UI.titleInput.val(),
                description: UI.descInput.val(),
                creationDate: new Date(),
                schema: UI.schemaSourceText.val()
            };

            // disable schema button until all inputs not empty && schema valid

            // create new schema panel
            UI.createNewPanel(schemaObject);

            // move schema to schema array
            UI.schemaArray.push(schemaObject);

            // reset form
            UI.resetSchemaForm();

            // animation

        });

        UI.downloadConfigButton.on('click', function clickDownloadConfigButton(e){
            // create json object from schema array
            var file = { schemas: UI.schemaArray };
            this.href = 'data:plain/text,' + JSON.stringify(file);
        });
    }
};