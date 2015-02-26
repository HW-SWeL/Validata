module.exports = function (env)
{
    var validator = require('ShEx-validator');
    
    var schemaText = $('#schemaText').val();
    var dataText = $('#dataText').val();

    var callbacks = {
        schemaParsed: function (schema) {
            ShExLog.i("callback: schemaParsed");
            ShExLog.i(schema);
        },

        schemaParseError: function (errorMessage) {
            ShExLog.i("callback: schemaParseError");
            ShExLog.i(errorMessage);
        },

        dataParsed: function (data) {
            ShExLog.i("callback: dataParsed");
            ShExLog.i(data);
        },

        dataParseError: function (errorMessage) {
            ShExLog.i("callback: dataParseError");
            ShExLog.i(errorMessage);
        },

        tripleValidated: function (validation) {
            ShExLog.i("callback: tripleValidated");
            ShExLog.i(validation);
        },

        validationError: function (validationError) {
            ShExLog.i("callback: validationError");
            ShExLog.i(validationError);
        }
    };

    var options = {
        closedShapes: true
    };

    validator.validate(schemaText, dataText, callbacks, options);

};