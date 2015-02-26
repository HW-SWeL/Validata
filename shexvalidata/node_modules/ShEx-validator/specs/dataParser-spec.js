var RDF = require("../includes/Erics_RDF.js");
var dataParser = require("../dataParser.js");

describe("parseNode", function () { 
    it("Should return a RDF.RDFLiteral", function () {
        var literal = dataParser.parseNode("\"random\"");
        expect(literal._).toEqual("RDFLiteral");
    });
});

describe("parseNode", function () { 
    it("Should throw an error", function () {
        function tester() {
            dataParser.parseNode("\"random");
        }
        expect(tester).toThrow();
    });
});

describe("parseNode", function () { 
    it("Should return a RDF.IRI", function () {
        var iri = dataParser.parseNode("IRI");
        expect(iri._).toEqual("IRI");
    });
});

describe("parseNode", function () { 
    it("Should throw an error", function () {
        function tester() {
            dataParser.parseNode("");
        }
        expect(tester).toThrow();
    });
});