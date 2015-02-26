var Promise = require('promise');

var RDF = require('./includes/Erics_RDF.js');
var N3 = require('n3');
var N3Util = N3.Util;

exports.parseData = function parseData(dataText) {
    return parseWithN3(dataText);
};

function parseNode(text, prefixes) {

    if (prefixes && N3Util.isPrefixedName(text)) {
        text = N3Util.expandPrefixedName(text, prefixes);
    }

    if (N3Util.isLiteral(text)) {
        return RDF.RDFLiteral(
            N3Util.getLiteralValue(text),
            RDF.LangTag(N3Util.getLiteralLanguage(text)),
            RDF.IRI(N3Util.getLiteralType(text))
        );
    }
    else if (N3Util.isIRI(text)) {
        return RDF.IRI(text);
    }
    else if (N3Util.isBlank(text)) {
        return RDF.BNode(text);
    }
    throw new Error("Unknown Type of Node");
}

exports.parseNode = parseNode;

function parseWithN3(dataText) {
    var parser = N3.Parser();

    return new Promise(function (resolve, reject) {
        var resolver = RDF.createIRIResolver();
        var db = RDF.Dataset();

        parser.parse(dataText, function (error, triple, prefixes) {
            if (error) reject(error);
            else if (triple) {
                triple = RDF.Triple(
                    parseNode(triple.subject),
                    parseNode(triple.predicate),
                    parseNode(triple.object)
                );

                db.push(triple);
            }
            else {
                resolver.Prefixes = prefixes;
                resolve({db: db, resolver: resolver});
            }
        });
    });
}
