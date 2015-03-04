ShExValidataConfig = {
    schemas: [
        {
            enabled: true,
            name: "oneTriple Test",
            description: "Very basic ShEx example with only one triple",
            data:   "PREFIX foaf: <http://xmlns.com/foaf/>\n" +
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                    "start = <PersonShape>\n" +
                    "<PersonShape> {\n" +
                    "    foaf:name rdf:langString\n" +
                    "}"
        },        
        {
            enabled: true,
            name: "Issue Test",
            description: "Simple example of Issue representation in ShEx",
            data:   "# Issue-simple-annotated.shex - Issue representation in Turtle\n" +
                    "\n" +
                    "#BASE <http://base.example/#>\n" +
                    "PREFIX ex: <http://ex.example/#>\n" +
                    "PREFIX foaf: <http://xmlns.com/foaf/>\n" +
                    "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n" +
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                    "\n" +
                    "start = <IssueShape>  # Issue validation starts with <IssueShape>\n" +
                    "\n" +
                    "<IssueShape> {                           # An <IssueShape> has:\n" +
                    "    ex:state (ex:unassigned ex:assigned), # state which is\n" +
                    "                                          #   unassigned or assigned.\n" +
                    "    ex:reportedBy @<UserShape>,           # reported by a <UserShape>.\n" +
                    "    ex:reportedOn xsd:dateTime,           # reported some date/time.\n" +
                    "    (                                     # optionally\n" +
                    "     ex:reproducedBy @<EmployeeShape>,    #   reproduced by someone\n" +
                    "     ex:reproducedOn xsd:dateTime         #   at some data/time.\n" +
                    "    )?,\n" +
                    "    ex:related @<IssueShape>*             # n related issues.\n" +
                    "}\n" +
                    "\n" +
                    "<UserShape> {                           # A <UserShape> has:\n" +
                    "    (                                    # either\n" +
                    "       foaf:name xsd:string              #   a FOAF name\n" +
                    "     |                                   #  or\n" +
                    "       foaf:givenName xsd:string+,       #   one or more givenNames\n" +
                    "       foaf:familyName xsd:string),      #   and one familyName.\n" +
                    "    foaf:mbox IRI               # one FOAF mbox.\n" +
                    "}\n" +
                    "\n" +
                    "<EmployeeShape> {                      # An <EmployeeShape> has:\n" +
                    "    foaf:givenName xsd:string+,         # at least one givenName.\n" +
                    "    foaf:familyName xsd:string,         # one familyName.\n" +
                    "    foaf:phone IRI*,           # any number of phone numbers.\n" +
                    "    foaf:mbox IRI              # one FOAF mbox.\n" +
                    "\n" +
                    "}"
        }   
    ]
};