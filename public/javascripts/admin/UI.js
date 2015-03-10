UI = {

    documentReady: function documentReady()
    {
        UI.selectCommonElements();
        UI.setupEventHandlers();
    },

    selectCommonElements: function selectCommonElements()
    {
        UI.schemaSourceFile = $('.schemaSourceFile');
        UI.schemaSourceText = $('.schemaSourceText');

        UI.titleInput = $('.titleInput');
        UI.descInput = $('.descriptionInput');
        UI.addSchemaButton = $('.addSchema');
        UI.downloadConfigButton = $('#finish');

        UI.panelContainer = $('.panel-group');
        UI.schemaPanel = $('.schemaPanel');
        UI.schemaArray = [];
    },

    resetSchemaForm: function resetSchemaForm(){
        UI.titleInput.val('');
        UI.descInput.val('');
        UI.schemaSourceFile.val('');
        UI.schemaSourceText.text('');
    },

    createNewPanel: function createNewPanel(schemaObject){
        // update current panel title
        var schemaPanel = UI.schemaPanel.clone();
        schemaPanel.find('.panel-title').text(schemaObject.title);
        // remove or edit add schema button
        schemaPanel.find('button.addSchema').remove();

        // add a remove schema button

        // add to view
        UI.panelContainer.append(schemaPanel);

        // add collapsibility
        var panelHeading = schemaPanel.find('.panel-heading');
        panelHeading.attr('data-toggle','collapse');
        panelHeading.attr('data-target','.panel-body');

        // collapse current panel
        panelHeading.trigger('click');

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
            //var schemaPanel = UI.panelContainer.find('.schemaPanel').clone(true);
            e.preventDefault();

            //var parent = $(e.target).parent(),
            //    titleInput = parent.find('.titleInput'),
            //    descInput = parent.find('.descriptionInput'),
            //    schemaInput = parent.find('.schemaSourceText');


            var schemaObject = {
                //title: titleInput.val(),
                //description: descInput.val(),
                //schema: schemaInput.text()
                title: UI.titleInput.val(),
                description: UI.descInput.val(),
                creationDate: new Date(),
                schema: UI.schemaSourceText.text()
            };

            console.log(schemaObject);

            // disable schema button until all inputs not empty && schema valid

            // create new empty schema panel

            UI.createNewPanel(schemaObject);

            //move schema to schema array
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