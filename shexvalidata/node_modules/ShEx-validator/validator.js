var shexSchemaParser = require('./includes/shexParser.js');
var RDF = require('./includes/Erics_RDF.js');
var dataParser = require("./dataParser.js");


function validate(schema, schemaResolver, startingNodes, db, dbResolver, closedShapes, tripleValidatedCallback, validationErrorCallback) {
    //BEGIN HACKINESS

    schema.alwaysInvoke = {};

    for (var startingNode in startingNodes) {

        startingNode = dataParser.parseNode(startingNodes[startingNode], dbResolver.Prefixes);

        var validation = schema.validate(
            startingNode,
            schema.startRule,
            db,
            {
                iriResolver: schemaResolver,
                closedShapes: closedShapes
            },
            true
        );

        if(validation.passed()) tripleValidatedCallback(validation);
        else validationErrorCallback(validation);

    }

}

module.exports.validate = validate;
