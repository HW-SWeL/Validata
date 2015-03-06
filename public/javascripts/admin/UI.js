UI = {

    documentReady: function documentReady()
    {
        UI.selectCommonElements();
        UI.setupEventHandlers();
    },

    selectCommonElements: function selectCommonElements()
    {
        UI.schemaSourceFile = $('#schemaSourceFile');
        UI.schemaSourceText = $('#schemaSourceText');
        UI.titleInput = $('#titleInput');
        UI.descInput = $('#descriptionInput');
        UI.addSchemaButton = $('#addSchema');
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
    }
};