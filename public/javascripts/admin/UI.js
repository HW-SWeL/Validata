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
        UI.newSchemaPanel = $('.schemaPanel').clone(true);
        UI.schemaArray = [];
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
                title: UI.titleInput.val(),
                description: UI.descInput.val(),
                creationDate: new Date(),
                schema: UI.schemaSourceText.text()
            };

            console.log(schemaObject);

            // disable schema button until all inputs not empty && schema valid
            // update current panel title
            // remove or edit add schema button
            // add a remove schema button
            // collapse current panel

            // create new empty schema panel
            UI.panelContainer.append(UI.newSchemaPanel);
            //UI.newSchemaPanel.appendTo('body');


            //move schema to schema array
            UI.schemaArray.push(schemaObject);

            // reset form
            // animation


        });

        UI.downloadConfigButton.on('click', function clickDownloadConfigButton(){
            // create json object from schema array
            // facilitate download of schemas
        });
    }
};