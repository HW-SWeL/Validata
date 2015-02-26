var ShEx = require("../index.js");


var schema = "PREFIX foaf: <http://xmlns.com/foaf/>\
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\
    start = <PersonShape>\
<PersonShape> {\
    foaf:name rdf:langString\
}";

var data = "PREFIX foaf: <http://xmlns.com/foaf/>\
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\
    <Somebody>\
foaf:name \"Mr Smith\"^^rdf:langString.\
";


describe("Validate inheritance", function () {
    it("Should successfully parse", function (done) {
        var callbacks = {
            schemaParsed: function (schema) {
            },
            schemaParseError: function (errorMessage) {
            },
            dataParsed: function (data) {
            },
            dataParseError: function (errorMessage) {
            },
            tripleValidated: function (validation) {
            },
            validationError: function (e) {
            }
        };
        var options = {
            startingNodes: ["Somebody"]
        };

        spyOn(callbacks, 'tripleValidated');

        ShEx.validate(schema, data, callbacks, options).then(function() {
            expect(callbacks.tripleValidated).toHaveBeenCalled();
            done();
        });
    });
});

