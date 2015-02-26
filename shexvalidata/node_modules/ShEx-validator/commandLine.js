var Promise = require('promise');

var fs = require('fs');
var stream = require('stream');
var exit = require('exit');

var ShEx = require('./index.js');

var parseArgs = require('minimist');
var readFile = Promise.denodeify(require('fs').readFile);

var exitCodes = {
    success: 0,
    dataParseError: 1,
    schemaParseError: 2,
    validationError: 3,
    ioError: 4,
    incorrectArguments: 5
};

var out = console.log;
var error = console.log;

function exitWithUsage() {
    readFile(__dirname+'/README.md').done(function(f) {
        var readme = f.toString();

        var usageStartTag = "<!--- BEGIN USAGE -->";
        var usageStart = readme.indexOf(usageStartTag) + usageStartTag.length;
        var usageEnd = readme.indexOf("<!--- END USAGE -->");
        var usageLen = usageEnd - usageStart;

        var usage = readme.substr(usageStart, usageLen);
        out(usage);

        exit(exitCodes.incorrectArguments);
    });
}

function processCommandLine(argv) {

    var toString  = function(t) { return t.toString(); };
    var ioError = function(e) { error(e); exit(exitCodes.ioError); };

    argv = parseArgs(argv.slice(2), {
        boolean: ["closed-shape", "absolute-iri"],
        alias: {
            c: "closed-shape",
            h: "help",
            v: "version",
            a: "absolute-iri"
        },
        unknown : function (unkownParam) {
            if(unkownParam.substr(0, 1) == '-') {
                error("Unknown paramater: " + unkownParam);
                exitWithUsage();
            }
        }
    });

    var alen = argv._.length;

    if(
        argv.help ||
        alen < 2 ||
        (alen < 3 && !argv.findNodes)||
        (alen > 2 && argv.findNodes)
    ) exitWithUsage();

    var schema = readFile(argv._[0]).then(toString, ioError);
    var data = readFile(argv._[1]).then(toString, ioError);

    var callbacks = {
        schemaParsed: function (schema) {
            out("Schema Parsed: " + schema.schema.ruleLabels.length + " rules.");
        },
        schemaParseError: function (errorMessage) {
            error(errorMessage);
            //exit(exitCodes.schemaParseError);
        },
        dataParsed: function (data) {
            out("Data Parsed: " + data.db.triples.length + " triples.");
        },
        dataParseError: function (errorMessage) {
            error("Data Parse Error:");
            error(errorMessage);
            //exit(exitCodes.dataParseError);
        },
        tripleValidated: function (validation) {
            out("Validation Passed");
        },
        validationError: function (e) {
            error(e.toString());
            //exit(exitCodes.validationError);
        }
    };

    var options = {
        closedShapes: argv.c,
        findNodes: argv.f,
        startingNodes: argv._.slice(2),
        absoluteIri: argv.a
    };

    return Promise.all([schema, data]).done(function (a) {
        ShEx.validate(a[0], a[1], callbacks, options);
    });
}

if(process) {
    processCommandLine(process.argv);
}
