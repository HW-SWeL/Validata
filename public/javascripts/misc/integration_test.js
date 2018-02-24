var ShEx = require('ShEx-validator');

var schemaText = 
"# Issue-simple-annotated.shex - Issue representation in Turtle\n" + 
"\n" + 
"#BASE <http://base.example/#>\n" + 
"PREFIX ex: <http://ex.example/#>\n" + 
"PREFIX foaf: <http://xmlns.com/foaf/>\n" + 
"PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n" + 
"PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" + 
"start = <IssueShape>  # Issue validation starts with <IssueShape>\n" + 
"\n" + 
"<IssueShape> {                       # An <IssueShape> has:\n" + 
"    ex:state [ex:unassigned            # state which is\n" + 
"              ex:assigned],            #   unassigned or assigned.\n" + 
"    ex:reportedBy @<UserShape>,        # reported by a <UserShape>.\n" + 
"    ex:reportedOn xsd:dateTime,        # reported some date/time.\n" + 
"    (                                  # optionally\n" + 
"     ex:reproducedBy @<EmployeeShape>, #   reproduced by someone\n" + 
"     ex:reproducedOn xsd:dateTime      #   at some data/time.\n" + 
"    )?,\n" + 
"    ex:related @<IssueShape>*          # n related issues.\n" + 
"}\n" + 
"\n" + 
"<UserShape> {                        # A <UserShape> has:\n" + 
"    (                                  # either\n" + 
"       foaf:name xsd:string            #   a FOAF name\n" + 
"     |                                 #  or\n" + 
"       foaf:givenName xsd:string+,     #   one or more givenNames\n" + 
"       foaf:familyName xsd:string),    #   and one familyName.\n" + 
"    foaf:mbox IRI                      # one FOAF mbox.\n" + 
"}\n" + 
"\n" + 
"<EmployeeShape> {                    # An <EmployeeShape> has:\n" + 
"    foaf:givenName xsd:string+,        # at least one givenName.\n" + 
"    foaf:familyName xsd:string,        # one familyName.\n" + 
"    foaf:phone IRI*,                   # any number of phone numbers.\n" + 
"    foaf:mbox IRI                      # one FOAF mbox.\n" + 
"}";

var dataText = 
"# Issue1.ttl - sample issue data.\n" + 
"# <Issue1> conforms to <Issue.shex#IssueShape>\n" + 
"PREFIX ex: <http://ex.example/#>\n" + 
"PREFIX foaf: <http://xmlns.com/foaf/>\n" + 
"PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n" + 
"<Issue1>\n" + 
"    ex:state        ex:unassigned ;\n" + 
"    ex:reportedBy   <User2> ;\n" + 
"    ex:reportedOn   \"2013-01-23T10:18:00\"^^xsd:dateTime ;\n" + 
"    ex:reproducedBy <Thompson.J> ;\n" +
"    ex:reproducedOn \"2013-01-23T11:00:00\"^^xsd:dateTime ;\n" + 
// "#    ex:related      <Issue2>, <Issue3>" +
".\n" + 
"<User2>\n" + 
"    foaf:givenName \"Bob\" ;\n" + 
"    foaf:familyName \"Smith\" ;\n" + 
"    foaf:mbox <mailto:bob@example.org>\n"+
".\n" + 
"<Thompson.J>\n" + 
"    foaf:givenName \"Joe\", \"Joseph\" ;\n" + 
"    foaf:familyName \"Thompson\" ;\n" + 
"    foaf:phone <tel:+456> ;\n" + 
"    foaf:mbox <mailto:joe@example.org>\n"+
"."

var startingResources = {
    "UserShape":"User2"
};

// var callbacks = {
//     schemaParsed: function (schema) {console.log("schema parsed")},
//     schemaParseError: function (errorMessage) {console.log("parse error")},
//     dataParsed: function (data) {console.log("data parsed")},
//     dataParseError: function (errorMessage) {console.log("data parse error")},
//     validationResult: function (validationResult) {console.log(validationResult);},
//     findShapesResult: function(shapes) {console.log(shapes);}
// };

var out = console.log;
var error = console.error;

var callbacks = {
        schemaParsed: function (schema) {
            out("Schema Parsed: " + schema.shapes.length + " shapes.");
        },
        schemaParseError: function (errorMessage) {
            error(errorMessage);
            //exit(exitCodes.schemaParseError);
        },
        dataParsed: function (data) {
            out("Data Parsed: " + data.resources.length + " resources and " + data.triples.length + " triples.");
        },
        dataParseError: function (errorMessage) {
            error("Data Parse Error:");
            error(errorMessage);
            //exit(exitCodes.dataParseError);
        },
        findShapesResult: function (shapes) {
            // if (argv.F)
            //     validator.validate(shapes).done();
            // else {
                for (var resource in shapes) {
                    if (!shapes.hasOwnProperty(resource)) continue;
                    if (shapes[resource])
                        out(resource + " Is a " + shapes[resource]);
                    else
                        error(resource + " Could not be found");
                }
            // }

        },
        validationResult: function (validation) {
            out("Validated: " + validation.matches.length + " matches");
            if (validation.errors.length > 0) {
                error("Errors/Warnings in " + validation.startingResource + ":");
                validation.errors.forEach(function (e) {
                    error((e.req_lev? e.req_lev + ": ":"") + e.description);
                });
            }

        }
    };

var options = {
    closedShapes: true,
};

var validator = new ShEx.Validator(schemaText, dataText, callbacks, options);

// validator.findShapes().done();

var result = validator.validate(startingResources);