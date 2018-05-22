var shex = require('shex');
var http = require('http');
var n3 = require('n3');

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

//paste for node test

n3 = require('n3')

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

var DefaultBase = "http://127.0.0.1:8888/doc/Issue1"

var db = n3.Store();
n3.Parser({documentIRI: DefaultBase, format: "text/turtle"}).parse(dataText, function (error, triple, prefix) {
    if (error) {
      throw Error("error parsing " + data + ": " + error);
    } else if (triple) {
      db.addQuad(triple)
      console.log(triple.subject, triple.predicate, triple.object, '.');
    } else if (prefix){
      console.log('prefix',prefix);
      db.
    }else {
      Triples = db;
    }
});


var shexc = "http://127.0.0.1:8888/doc/Issue.shex"
var shape = "http://127.0.0.1:8888/doc/IssueShape";
var node = "http://127.0.0.1:8888/doc/Issue1";
var shape = "http://127.0.0.1:8888/doc/IssueShape";


var schema = shex.Parser.construct(shexc).parse(schemaText);
var DefaultBase = "http://127.0.0.1:8888/doc/Issue1"


var db = n3.Store();
n3.Parser({documentIRI: DefaultBase, format: "text/turtle"}).parse(dataText, function (error, triple, prefixes) {
    if (error) {
      throw Error("error parsing " + data + ": " + error);
    } else if (triple) {
      db.addQuad(triple)
      console.log(triple.subject, triple.predicate, triple.object, '.');
    } else {
      Triples = db;
    }
  });
// var parser = shex.N3.Parser({documentIRI: DefaultBase, format: "text/turtle" });
// var triples = parser.parse(dataText);

var result = shex.Validator.construct(schema).validate(Triples, node, shape);


// fuck thsi shit
var shexc = "http://shex.io/examples/Issue.shex";
var shape = "http://shex.io/examples/IssueShape";
var data = "http://shex.io/examples/Issue1.ttl";
var node = "http://shex.io/examples/Issue1";

var http = require("http");
var shex = require("shex");
var n3 = require('n3');

// generic async GET function.
function GET (url, then) {
  http.request(url, function (resp) {
    var body = "";
    resp.on('data', function (chunk) { body += chunk; });
    resp.on("end", function () { then(body); });
  }).end();
}

var Schema = null; // will be loaded and compiled asynchronously
var Triples = null; // will be loaded and parsed asynchronously
function validateWhenEverythingsLoaded () {
  if (Schema !== null && Triples !== null) {
    console.log(shex.Validator.construct(Schema).validate(Triples, node, shape));
  }
}

// loaded the schema
GET(shexc, function (b) {
  // callback parses the schema and tries to validate.
  Schema = shex.Parser(shexc).parse(b)
  validateWhenEverythingsLoaded();
});

// load the data
GET(data, function (b) {
  // callback parses the triples and tries to validate.
  var db = n3.Store();
  n3.Parser({documentIRI: data, format: "text/turtle"}).parse(b, function (error, triple, prefixes) {
    if (error) {
      throw Error("error parsing " + data + ": " + error);
    } else if (triple) {
      db.addTriple(triple)

    } else {
      Triples = db;
      validateWhenEverythingsLoaded();
    }
  });
});

var data = parser.parse(dataText,function (error, triple, prefixes) {
               if (triple)
                 console.log(triple.subject, triple.predicate, triple.object, '.');
               else
                 console.log("# That's all, folks!", prefixes)
             });

var db = n3.Store();
n3.Parser('@prefix c: <http://example.org/cartoons#>.\n' +
             'c:Tom a c:Cat.\n' +
             'c:Jerry a c:Mouse;\n' +
             '        c:smarterThan c:Tom.',
             function (error, triple, prefixes) {
               if (triple)
                 console.log(triple.subject, triple.predicate, triple.object, '.');
             		db.addTriple(triple);
               else
                 console.log("# That's all, folks!", prefixes)
             });

var data = n3.Store();
var parser = n3.Parser();
parser.parse('@prefix c: <http://example.org/cartoons#>.\n' +
             'c:Tom a c:Cat.\n' +
             'c:Jerry a c:Mouse;\n' +
             '        c:smarterThan c:Tom.',
             function (error, triple, prefixes) {
               if (triple)
                 console.log(triple.subject, triple.predicate, triple.object, '.');
                 data.addTriple(triple);
               else
                 console.log("# That's all, folks!", prefixes)
             });


// json ld

var doc = {
  "http://schema.org/name": "Manu Sporny",
  "http://schema.org/url": {"@id": "http://manu.sporny.org/"},
  "http://schema.org/image": {"@id": "http://manu.sporny.org/images/manu.png"}
};
var context = {
  "name": "http://schema.org/name",
  "homepage": {"@id": "http://schema.org/url", "@type": "@id"},
  "image": {"@id": "http://schema.org/image", "@type": "@id"}
};

jsonld.compact(doc, context, function(err, compacted) {
  console.log(JSON.stringify(compacted, null, 2));
  compacted_doc = compacted;
  /* Output:
  {
    "@context": {...},
    "name": "Manu Sporny",
    "homepage": "http://manu.sporny.org/",
    "image": "http://manu.sporny.org/images/manu.png"
  }
  */
});

jsonld.toRDF(doc, {format: 'application/n-quads'}, (err, nquads) => {
  if (nquads) {
    console.log(nquads)
  }
});


jsonld.toRDF(compacted_doc, {format: 'application/n-quads'}, (err, nquads) => {
  if (nquads) {
    console.log(nquads)
  }
});


var n3 = require('n3');
var db = n3.Store();
var parser2 = n3.Parser();
parser2.parse(dataText,function(error,quad,prefixes){
  if (error){
    console.log(error);
  } else if (quad){
    console.log('n3 quad',quad);
    db.addQuad(quad);
  } else {
    console.log(db.getQuads());
  }
});