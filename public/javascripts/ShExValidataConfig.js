ShExValidataConfig = {
    schemas: [
        {
            enabled: true,
            default: true,
            name: "HCLS - 2014 Version",
            description: "HCLS schema from early 2014, scraped from http://www.w3.org/2001/sw/hcls/notes/hcls-dataset/ on 23/02/2015",
            creationDate: "1393632000",
            data:   "PREFIX cito:	<http://purl.org/spar/cito/>\n" +
                    "PREFIX dcat:	<http://www.w3.org/ns/dcat#>\n" +
                    "PREFIX dctypes:	<http://purl.org/dc/dcmitype/>\n" +
                    "PREFIX dct:	    <http://purl.org/dc/terms/>\n" +
                    "PREFIX foaf:	<http://xmlns.com/foaf/0.1/>\n" +
                    "PREFIX freq:	<http://purl.org/cld/freq/>\n" +
                    "PREFIX idot:	<http://identifiers.org/terms#>\n" +
                    "PREFIX lexvo:	<http://lexvo.org/ontology#>\n" +
                    "PREFIX pav:	    <http://purl.org/pav/>\n" +
                    "PREFIX prov:	<http://www.w3.org/ns/prov#>\n" +
                    "PREFIX rdf:	    <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                    "PREFIX rdfs:	<http://www.w3.org/2000/01/rdf-schema#>\n" +
                    "PREFIX sd:	    <http://www.w3.org/ns/sparql-service-description#>\n" +
                    "PREFIX xsd:	    <http://www.w3.org/2001/XMLSchema#>\n" +
                    "PREFIX vann:	<http://purl.org/vocab/vann/>\n" +
                    "PREFIX void:    <http://rdfs.org/ns/void#>\n" +
                    "\n" +
                    "start = <SummaryLevelShape>\n" +
                    "\n" +
                    "<SummaryLevelShape> {\n" +
                    "	rdf:type (dctypes:Dataset),    ###void:Dataset should only be used for RDF distributions of the dataset\n" +
                    "	dct:title rdf:langString,    ###\n" +
                    "	dct:identifier xsd:string?,    ###\n" +
                    "	dct:alternative rdf:langString?,    ###\n" +
                    "	dct:description rdf:langString,    ###\n" +
                    "	\n" +
                    "	\n" +
                    "	###so w3c people messed up here. created is NEVER for sumamry, yet createdOn is a MAY?\n" +
                    "	###and one or the other need to be supplied? need to ask somebody about this\n" +
                    "	\n" +
                    "	!dct:created.,    ###One of dct:created or dct:issued MUST be provided.\n" +
                    "	pav:createdOn xsd:dateTime?,    ###Fine-grained assignation of the creation task\n" +
                    "	\n" +
                    "	pav:authoredOn xsd:dateTime?,    ###Fine-grained assignation of the creation task\n" +
                    "	pav:curatedOn xsd:dateTime?,    ###Fine-grained assignation of the creation task\n" +
                    "	!dct:creator .,    ###\n" +
                    "	\n" +
                    "	(dct:contributor IRI? | dct:contributor xsd:string?)?,    ###Fine-grained assignation of the creation task\n" +
                    "	(pav:createdBy IRI? | pav:createdBy xsd:string?)?,    ###Fine-grained assignation of the creation task\n" +
                    "	(pav:authoredBy IRI? | pav:authoredBy xsd:string?)?,    ###Fine-grained assignation of the creation task\n" +
                    "	(pav:curatedBy IRI? | pav:curatedBy xsd:string?)?,    ###Fine-grained assignation of the creation task\n" +
                    "	\n" +
                    "	!dct:issued .,    ###One of dct:created or dct:issued MUST be provided.\n" +
                    "	dct:publisher IRI,    ###\n" +
                    "	foaf:page IRI?,    ###SHOULD### \n" +
                    "	dct:license IRI,    ###\n" +
                    "	dct:rights rdf:langString?,    ###\n" +
                    "	!dct:language .,    ###\n" +
                    "	\n" +
                    "	###another weird w3c thing. what is skos?\n" +
                    "	#dcat:theme skos:Concept?,    ###\n" +
                    "	\n" +
                    "	\n" +
                    "	dcat:keyword xsd:string?,    ###\n" +
                    "	!void:vocabulary .,    ###Only for RDF datasets\n" +
                    "	!dct:conformsTo .,    ###\n" +
                    "	cito:citesAsAuthority IRI?,    ###\n" +
                    "	!dct:hasPart .,    ###For non-RDF datasets\n" +
                    "	!void:subset .,    ###Only for RDF datasets\n" +
                    "	!idot:preferredPrefix .,    ###\n" +
                    "	!idot:alternatePrefix .,    ###\n" +
                    "	!idot:identifierPattern .,    ###\n" +
                    "	!void:uriRegexPattern .,    ###\n" +
                    "	!idot:accessPattern .,    ###\n" +
                    "	!idot:exampleIdentifier .,    ###\n" +
                    "	!void:exampleResource .,    ###\n" +
                    "	!void:inDataset .,    ###Only for RDF datasets\n" +
                    "	!pav:version .,    ###Some datasets are versioned by date released\n" +
                    "	!pav:isVersionOf .,    ###A data provider MAY choose to also include a pav:hasCurrentVersion from the Summary Level dataset description to the most recent Version Level description. If the property is provided then the provider takes on the task of ensuring that it is uptodate.\n" +
                    "	!pav:previousVersion .,    ###Note that it is nonsensical to have an unversioned description point to a previous version of the dataset using the PAV property.\n" +
                    "	pav:hasCurrentVersion IRI?,    ###Should only be used by authoriative sources. Users of the data should ensure that there is only one such relation for each summary level dataset.\n" +
                    "	!dct:source .,    ###For datasets used in whole or in part.\n" +
                    "	!pav:retrievedFrom .,    ###For datasets used in whole without modification.\n" +
                    "	!prov:wasDerivedFrom .,    ###For datasets used in whole or in part with modification.\n" +
                    "	!pav:createdWith .,    ###Identifies the version of the tool/script used to generate the instance data in the specified format\n" +
                    "	\n" +
                    "	\n" +
                    "	#dctype not defined either...\n" +
                    "	#dct:accrualPeriodicity dctype:Frequency,    ###SHOULD### Frequency of change is a property of the abstract dataset. The version level MUST never change. A new version MUST be created.\n" +
                    "	\n" +
                    "	!dct:format .,    ###Indicates the specific format of the formatted dataset files.\n" +
                    "	!dcat:distribution .,    ###Versioned description should point to the description of all formatted dataset descriptions.Formatted descriptions should point to the files containing the data.\n" +
                    "	dcat:accessURL IRI? ,    ###To indicate a page/location to download files.\n" +
                    "	!dcat:downloadURL .,    ###For non-RDF resources we need a way of pointing to the download\n" +
                    "	!void:dataDump .,    ###Only used for formatted descriptions of RDF datasets. Must point to RDF file in some serialisation; file may be compressed. Must not point to the directory containing the files.\n" +
                    "	!dcat:landingPage .,    ###Link to the documentation page for an API through which the data can be accessed.\n" +
                    "	!void:triples .,    ###Only for RDF datasets\n" +
                    "	!void:entities .,    ###Only for RDF datasets\n" +
                    "	!void:distinctSubjects .,    ###Only for RDF datasets\n" +
                    "	!void:properties .,    ###Only for RDF datasets\n" +
                    "	!void:distinctObjects .,    ###Only for RDF datasets\n" +
                    "	\n" +
                    "	#why are there comments here?\n" +
                    "	#!###:distinctLiterals .,    ###Only for RDF datasets\n" +
                    "	\n" +
                    "	!sd:namedGraph .,    ###Only for RDF datasets\n" +
                    "	!void:propertyPartition .,    ###Only for RDF datasets\n" +
                    "	!void:classPartition .    ###Only for RDF datasets\n" +
                    "}\n" +
                    "\n" +
                    "<VersionLevelShape> {\n" +
                    "	rdf:type (dctypes:Dataset) ,    ###void:Dataset should only be used for RDF distributions of the dataset\n" +
                    "	dct:title rdf:langString,    ###\n" +
                    "	dct:identifier xsd:string?,    ###\n" +
                    "	dct:alternative rdf:langString?,    ###\n" +
                    "	dct:description rdf:langString,    ###\n" +
                    "	dct:created xsd:dateTime?,    ###SHOULD### One of dct:created or dct:issued MUST be provided.\n" +
                    "	pav:createdOn xsd:dateTime?,    ###Fine-grained assignation of the creation task\n" +
                    "	pav:authoredOn xsd:dateTime?,    ###Fine-grained assignation of the creation task\n" +
                    "	pav:curatedOn xsd:dateTime?,    ###Fine-grained assignation of the creation task\n" +
                    "	\n" +
                    "	(dct:creator IRI? | dct:creator xsd:string?),    ###\n" +
                    "	(dct:contributor IRI? | dct:contributor xsd:string?)?,    ###Fine-grained assignation of the creation task\n" +
                    "	(pav:createdBy IRI? | pav:createdBy xsd:string?)?,    ###Fine-grained assignation of the creation task\n" +
                    "	(pav:authoredBy IRI? | pav:authoredBy xsd:string?)?,    ###Fine-grained assignation of the creation task\n" +
                    "	(pav:curatedBy IRI? | pav:curatedBy xsd:string?)?,    ###Fine-grained assignation of the creation task\n" +
                    "	\n" +
                    "	dct:issued xsd:dateTime?,    ###SHOULD### One of dct:created or dct:issued MUST be provided.\n" +
                    "	dct:publisher IRI,    ###\n" +
                    "	foaf:page IRI?,    ###SHOULD###\n" +
                    "	dct:license IRI,    ###\n" +
                    "	dct:rights rdf:langString?,    ###\n" +
                    "	\n" +
                    "	# god damn it w3c, what does this even mean\n" +
                    "	#dct:language http://lexvo.org/id/iso639-3/{tag},    ###SHOULD### \n" +
                    "	\n" +
                    "	!void:vocabulary .,    ###Only for RDF datasets\n" +
                    "	dct:conformsTo IRI?,    ###\n" +
                    "	cito:citesAsAuthority IRI?,    ###\n" +
                    "	!dct:hasPart .,    ###For non-RDF datasets\n" +
                    "	!void:subset .,    ###Only for RDF datasets\n" +
                    "	!idot:preferredPrefix .,    ###\n" +
                    "	!idot:alternatePrefix .,    ###\n" +
                    "	!idot:identifierPattern .,    ###\n" +
                    "	!void:uriRegexPattern .,    ###\n" +
                    "	!idot:accessPattern .,    ###\n" +
                    "	!idot:exampleIdentifier .,    ###\n" +
                    "	!void:exampleResource .,    ###\n" +
                    "	!void:inDataset .,    ###Only for RDF datasets\n" +
                    "	pav:version xsd:string,    ###Some datasets are versioned by date released\n" +
                    "	pav:isVersionOf IRI,    ###A data provider MAY choose to also include a pav:hasCurrentVersion from the Summary Level dataset description to the most recent Version Level description. If the property is provided then the provider takes on the task of ensuring that it is uptodate.\n" +
                    "	pav:previousVersion IRI?,    ###SHOULD### Note that it is nonsensical to have an unversioned description point to a previous version of the dataset using the PAV property.\n" +
                    "	!pav:hasCurrentVersion .,    ###Should only be used by authoriative sources. Users of the data should ensure that there is only one such relation for each summary level dataset.\n" +
                    "	dct:source IRI?,    ###SHOULD### For datasets used in whole or in part.\n" +
                    "	pav:retrievedFrom IRI?,    ###SHOULD### For datasets used in whole without modification.\n" +
                    "	prov:wasDerivedFrom IRI?,    ###SHOULD### For datasets used in whole or in part with modification.\n" +
                    "	!pav:createdWith .,    ###Identifies the version of the tool/script used to generate the instance data in the specified format\n" +
                    "	!dct:accrualPeriodicity .,    ###Frequency of change is a property of the abstract dataset. The version level MUST never change. A new version MUST be created.\n" +
                    "	!dct:format .,    ###Indicates the specific format of the formatted dataset files.\n" +
                    "	\n" +
                    "	#more unclear table syntax by w3c\n" +
                    "	#dcat:distribution [ a dcat:Distribution; dcat:downloadURL <uri>],    ###SHOULD### Versioned description should point to the description of all formatted dataset descriptions.Formatted descriptions should point to the files containing the data.\n" +
                    "	\n" +
                    "	\n" +
                    "	dcat:accessURL IRI?,    ###To indicate a page/location to download files.\n" +
                    "	!dcat:downloadURL .,    ###For non-RDF resources we need a way of pointing to the download\n" +
                    "	!void:dataDump .,    ###Only used for formatted descriptions of RDF datasets. Must point to RDF file in some serialisation; file may be compressed. Must not point to the directory containing the files.\n" +
                    "	dcat:landingPage IRI?,    ###Link to the documentation page for an API through which the data can be accessed.\n" +
                    "	!void:triples .,    ###Only for RDF datasets\n" +
                    "	!void:entities .,    ###Only for RDF datasets\n" +
                    "	!void:distinctSubjects .,    ###Only for RDF datasets\n" +
                    "	!void:properties .,    ###Only for RDF datasets\n" +
                    "	!void:distinctObjects .,    ###Only for RDF datasets\n" +
                    "	\n" +
                    "	#more w3c chaos\n" +
                    "	#!###:distinctLiterals .,    ###Only for RDF datasets\n" +
                    "	\n" +
                    "	!sd:namedGraph .,    ###Only for RDF datasets\n" +
                    "	!void:propertyPartition .,    ###Only for RDF datasets\n" +
                    "	!void:classPartition .    ###Only for RDF datasets\n" +
                    "}\n" +
                    "\n" +
                    "<DistributionLevelShape> {\n" +
                    "	rdf:type (dctypes:Dataset),    ###void:Dataset should only be used for RDF distributions of the dataset\n" +
                    "	dct:title rdf:langString,    ###\n" +
                    "	dct:identifier xsd:string?,    ###\n" +
                    "	dct:alternative rdf:langString?,    ###\n" +
                    "	dct:description rdf:langString,    ###\n" +
                    "	dct:created xsd:dateTime?,    ###SHOULD### One of dct:created or dct:issued MUST be provided.\n" +
                    "	pav:createdOn xsd:dateTime?,    ###Fine-grained assignation of the creation task\n" +
                    "	pav:authoredOn xsd:dateTime?,    ###Fine-grained assignation of the creation task\n" +
                    "	pav:curatedOn xsd:dateTime?,    ###Fine-grained assignation of the creation task\n" +
                    "	\n" +
                    "	(dct:creator IRI | dct:creator xsd:string),    ###\n" +
                    "	(dct:contributor IRI? | dct:contributor  xsd:string?)?,    ###Fine-grained assignation of the creation task\n" +
                    "	(pav:createdBy IRI? | pav:createdBy xsd:string?)?,    ###Fine-grained assignation of the creation task\n" +
                    "	(pav:authoredBy IRI? | pav:authoredBy xsd:string?)?,    ###Fine-grained assignation of the creation task\n" +
                    "	(pav:curatedBy IRI? | pav:curatedBy xsd:string?)?,    ###Fine-grained assignation of the creation task\n" +
                    "	\n" +
                    "	dct:issued xsd:dateTime?,    ###SHOULD### One of dct:created or dct:issued MUST be provided.\n" +
                    "	dct:publisher IRI,    ###\n" +
                    "	foaf:page IRI?,    ###SHOULD### \n" +
                    "	dct:license IRI,    ###\n" +
                    "	dct:rights rdf:langString?,    ###\n" +
                    "	\n" +
                    "	#w3c\n" +
                    "	#dct:language http://lexvo.org/id/iso639-3/{tag},    ###SHOULD### \n" +
                    "	\n" +
                    "	dct:conformsTo IRI?,    ###SHOULD### \n" +
                    "	cito:citesAsAuthority IRI?,    ###\n" +
                    "	dct:hasPart IRI?,    ###For non-RDF datasets\n" +
                    "	idot:preferredPrefix xsd:string?,    ###\n" +
                    "	idot:alternatePrefix xsd:string?,    ###\n" +
                    "	idot:identifierPattern xsd:string?,    ###\n" +
                    "	void:uriRegexPattern xsd:string?,    ###\n" +
                    "	idot:accessPattern xsd:string?,    ###\n" +
                    "	idot:exampleIdentifier xsd:string?,    ###SHOULD### \n" +
                    "	void:exampleResource IRI?,    ###SHOULD### \n" +
                    "	pav:version xsd:string?,    ###SHOULD### Some datasets are versioned by date released\n" +
                    "	!pav:isVersionOf .,    ###A data provider MAY choose to also include a pav:hasCurrentVersion from the Summary Level dataset description to the most recent Version Level description. If the property is provided then the provider takes on the task of ensuring that it is uptodate.\n" +
                    "	pav:previousVersion IRI?,    ###SHOULD### Note that it is nonsensical to have an unversioned description point to a previous version of the dataset using the PAV property.\n" +
                    "	!pav:hasCurrentVersion .,    ###Should only be used by authoriative sources. Users of the data should ensure that there is only one such relation for each summary level dataset.\n" +
                    "	dct:source IRI?,    ###SHOULD### For datasets used in whole or in part.\n" +
                    "	pav:retrievedFrom IRI?,    ###SHOULD### For datasets used in whole without modification.\n" +
                    "	prov:wasDerivedFrom IRI?,    ###SHOULD### For datasets used in whole or in part with modification.\n" +
                    "	pav:createdWith IRI?,    ###Identifies the version of the tool/script used to generate the instance data in the specified format\n" +
                    "	!dct:accrualPeriodicity .,    ###Frequency of change is a property of the abstract dataset. The version level MUST never change. A new version MUST be created.\n" +
                    "	\n" +
                    "	#w3c\n" +
                    "	#dct:format [ iana | edam | biosharing | xsd:String ],    ###Indicates the specific format of the formatted dataset files.\n" +
                    "	\n" +
                    "	!dcat:distribution .,    ###Versioned description should point to the description of all formatted dataset descriptions.Formatted descriptions should point to the files containing the data.\n" +
                    "	dcat:accessURL IRI?,    ###To indicate a page/location to download files.\n" +
                    "	dcat:downloadURL IRI?,    ###SHOULD### For non-RDF resources we need a way of pointing to the download\n" +
                    "	dcat:landingPage IRI?    ###Link to the documentation page for an API through which the data can be accessed.\n" +
                    "\n" +
                    "	\n" +
                    "	#w3c\n" +
                    "	#void:propertyPartition [void:property <IRI>; void:triples \"###\"^^xsd:integer],    ###SHOULD### Only for RDF datasets\n" +
                    "	#void:classPartition [void:class <IRI>; void:entities \"###\"^^xsd:integer],    ###SHOULD### Only for RDF datasets\n" +
                    "\n" +
                    "}\n" +
                    "\n" +
                    "<RDFDistributionLevelShape> {\n" +
                    "	rdf:type (void:Dataset),    ###void:Dataset should only be used for RDF distributions of the dataset\n" +
                    "	dct:title rdf:langString,    ###\n" +
                    "	dct:identifier xsd:string?,    ###\n" +
                    "	dct:alternative rdf:langString?,    ###\n" +
                    "	dct:description rdf:langString,    ###\n" +
                    "	dct:created xsd:dateTime?,    ###SHOULD### One of dct:created or dct:issued MUST be provided.\n" +
                    "	pav:createdOn xsd:dateTime?,    ###Fine-grained assignation of the creation task\n" +
                    "	pav:authoredOn xsd:dateTime?,    ###Fine-grained assignation of the creation task\n" +
                    "	pav:curatedOn xsd:dateTime?,    ###Fine-grained assignation of the creation task\n" +
                    "	(dct:creator IRI | dct:creator xsd:string),    ###\n" +
                    "	(dct:contributor IRI | dct:contributor  xsd:string)?,    ###Fine-grained assignation of the creation task\n" +
                    "	(pav:createdBy IRI | pav:createdBy xsd:string)?,    ###Fine-grained assignation of the creation task\n" +
                    "	(pav:authoredBy IRI | pav:authoredBy xsd:string)?,    ###Fine-grained assignation of the creation task\n" +
                    "	(pav:curatedBy IRI | pav:curatedBy xsd:string)?,    ###Fine-grained assignation of the creation task\n" +
                    "	dct:issued xsd:dateTime?,    ###SHOULD### One of dct:created or dct:issued MUST be provided.\n" +
                    "	dct:publisher IRI,    ###\n" +
                    "	foaf:page IRI?,    ###SHOULD### \n" +
                    "	dct:license IRI,    ###\n" +
                    "	dct:rights rdf:langString?,    ###\n" +
                    "	\n" +
                    "	#w3c\n" +
                    "	#dct:language http://lexvo.org/id/iso639-3/{tag},    ###SHOULD### \n" +
                    "	\n" +
                    "	void:vocabulary IRI?,    ###SHOULD### Only for RDF datasets\n" +
                    "	dct:conformsTo IRI?,    ###SHOULD### \n" +
                    "	cito:citesAsAuthority IRI?,    ###\n" +
                    "	void:subset IRI?,    ###Only for RDF datasets\n" +
                    "	idot:preferredPrefix xsd:string?,    ###\n" +
                    "	idot:alternatePrefix xsd:string?,    ###\n" +
                    "	idot:identifierPattern xsd:string?,    ###\n" +
                    "	void:uriRegexPattern xsd:string?,    ###\n" +
                    "	idot:accessPattern xsd:string?,    ###\n" +
                    "	idot:exampleIdentifier xsd:string?,    ###SHOULD### \n" +
                    "	void:exampleResource IRI?,    ###SHOULD### \n" +
                    "	void:inDataset IRI?,    ###SHOULD### Only for RDF datasets\n" +
                    "	pav:version xsd:string?,    ###SHOULD### Some datasets are versioned by date released\n" +
                    "	!pav:isVersionOf .,    ###A data provider MAY choose to also include a pav:hasCurrentVersion from the Summary Level dataset description to the most recent Version Level description. If the property is provided then the provider takes on the task of ensuring that it is uptodate.\n" +
                    "	pav:previousVersion IRI?,    ###SHOULD### Note that it is nonsensical to have an unversioned description point to a previous version of the dataset using the PAV property.\n" +
                    "	!pav:hasCurrentVersion .,    ###Should only be used by authoriative sources. Users of the data should ensure that there is only one such relation for each summary level dataset.\n" +
                    "	dct:source IRI?,    ###SHOULD### For datasets used in whole or in part.\n" +
                    "	pav:retrievedFrom IRI?,    ###SHOULD### For datasets used in whole without modification.\n" +
                    "	prov:wasDerivedFrom IRI?,    ###SHOULD### For datasets used in whole or in part with modification.\n" +
                    "	pav:createdWith IRI?,    ###Identifies the version of the tool/script used to generate the instance data in the specified format\n" +
                    "	!dct:accrualPeriodicity .,    ###Frequency of change is a property of the abstract dataset. The version level MUST never change. A new version MUST be created.\n" +
                    "	\n" +
                    "	#w3c\n" +
                    "	#dct:format [ iana | edam | biosharing | xsd:String ],    ###Indicates the specific format of the formatted dataset files.\n" +
                    "	\n" +
                    "	!dcat:distribution .,    ###Versioned description should point to the description of all formatted dataset descriptions.Formatted descriptions should point to the files containing the data.\n" +
                    "	dcat:accessURL IRI?,    ###To indicate a page/location to download files.\n" +
                    "	dcat:downloadURL IRI?,    ###SHOULD### For non-RDF resources we need a way of pointing to the download\n" +
                    "	void:dataDump IRI?,    ###SHOULD### Only used for formatted descriptions of RDF datasets. Must point to RDF file in some serialisation; file may be compressed. Must not point to the directory containing the files.\n" +
                    "	dcat:landingPage IRI?,    ###Link to the documentation page for an API through which the data can be accessed.\n" +
                    "	void:triples xsd:integer?,    ###SHOULD### Only for RDF datasets\n" +
                    "	void:entities xsd:integer?,    ###SHOULD### Only for RDF datasets\n" +
                    "	void:distinctSubjects xsd:integer?,    ###SHOULD### Only for RDF datasets\n" +
                    "	void:properties xsd:integer?,    ###SHOULD### Only for RDF datasets\n" +
                    "	void:distinctObjects xsd:integer?,    ###SHOULD### Only for RDF datasets\n" +
                    "	\n" +
                    "	#W3C\n" +
                    "	###:distinctLiterals xsd:integer?,    ###SHOULD### Only for RDF datasets\n" +
                    "	\n" +
                    "	sd:namedGraph sd:NamedGraph?    ###SHOULD### Only for RDF datasets\n" +
                    "	\n" +
                    "	#w3c\n" +
                    "	#void:propertyPartition [void:property <IRI>; void:triples \"###\"^^xsd:integer],    ###SHOULD### Only for RDF datasets\n" +
                    "	#void:classPartition [void:class <IRI>; void:entities \"###\"^^xsd:integer],    ###SHOULD### Only for RDF datasets\n" +
                    "\n" +
                    "}\n",
            dataDemos: [
                {
                    name: "Working ChEMBL demo",
                    data:   "BASE <http://rdf.ebi.ac.uk/chembl/>\n" +
                            "\n" +
                            "PREFIX dcat: <http://www.w3.org/ns/dcat#>\n" +
                            "PREFIX dct: <http://purl.org/dc/terms/>\n" +
                            "PREFIX dctypes: <http://purl.org/dc/dcmitype/>\n" +
                            "PREFIX foaf: <http://foaf.example/#>\n" +
                            "PREFIX freq: <http://purl.org/cld/freq/>\n" +
                            "PREFIX lexvo: <http://lexvo.org/id/iso639-3/>\n" +
                            "PREFIX pav: <http://purl.org/pav/>\n" +
                            "PREFIX prov: <http://www.w3.org/ns/prov#>\n" +
                            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                            "PREFIX sd: <http://www.w3.org/ns/sparql-service-description#>\n" +
                            "PREFIX void: <http://rdfs.org/ns/void#>\n" +
                            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n" +
                            "\n" +
                            "<chembl>\n" +
                            "    rdf:type dctypes:Dataset ;\n" +
                            "    dct:title \"ChEMBL\"@en ;\n" +
                            "    dct:description \"ChEMBL is a database of bioactive drug-like small molecules, it contains 2-D structures, calculated properties (e.g. logP, Molecular Weight, Lipinski Parameters, etc.) and abstracted bioactivities (e.g. binding constants, pharmacology and ADMET data). The data is abstracted and curated from the primary scientific literature, and cover a significant fraction of the SAR and discovery of modern drugs. We attempt to normalise the bioactivities into a uniform set of end-points and units where possible, and also to tag the links between a molecular target and a published assay with a set of varying confidence levels. Additional data on clinical progress of compounds is being integrated into ChEMBL at the current time.\"@en ;\n" +
                            "    dct:publisher <http://www.ebi.ac.uk/> ;\n" +
                            "    foaf:page <https://www.ebi.ac.uk/chembl> ;\n" +
                            "    dct:license <http://creativecommons.org/licenses/by-sa/3.0/>;\n" +
                            "    dct:accrualPeriodicity freq:quarterly\n" +
                            ".\n" +
                            "\n" +
                            "<chembl16>\n" +
                            "    rdf:type dctypes:Dataset ;\n" +
                            "    dct:title \"ChEMBL\"@en ;\n" +
                            "    dct:description \"ChEMBL is a database of bioactive drug-like small molecules, it contains 2-D structures, calculated properties (e.g. logP, Molecular Weight, Lipinski Parameters, etc.) and abstracted bioactivities (e.g. binding constants, pharmacology and ADMET data). The data is abstracted and curated from the primary scientific literature, and cover a significant fraction of the SAR and discovery of modern drugs. We attempt to normalise the bioactivities into a uniform set of end-points and units where possible, and also to tag the links between a molecular target and a published assay with a set of varying confidence levels. Additional data on clinical progress of compounds is being integrated into ChEMBL at the current time.\"@en ;\n" +
                            "    dct:created \"2013-08-29T00:00:00\"^^xsd:dateTime ;\n" +
                            "    foaf:page <https://www.ebi.ac.uk/chembl> ;\n" +
                            "    dct:publisher <http://www.ebi.ac.uk/> ;\n" +
                            "    dct:license <http://creativecommons.org/licenses/by-sa/3.0/> ;\n" +
                            "    dct:language lexvo:en;\n" +
                            "    pav:version \"16\";\n" +
                            "    pav:previousVersion <chembl15>;\n" +
                            "    pav:isVersionOf <chembl>;\n" +
                            "    prov:derivedFrom <example>;\n" +
                            "    dcat:distribution <chembl16rdf>, <chembl16db> ;\n" +
                            ".\n" +
                            "\n" +
                            "<chembl16rdf>\n" +
                            "	a void:Dataset ;\n" +
                            "	dct:title \"ChEMBL RDF\"@en ;\n" +
                            "	dct:description \"The RDF distribution of the ChEMBL 16 dataset.\"@en ;\n" +
                            "	dct:created \"2013-05-07T00:00:00.000+01:00\"^^xsd:dateTime ;\n" +
                            "	dct:creator <http://orcid.org/0000-0002-8011-0300> ;\n" +
                            "	dct:publisher <http://www.ebi.ac.uk/>;\n" +
                            "    foaf:page <https://www.ebi.ac.uk/chembl> ;\n" +
                            "	dct:license <http://creativecommons.org/licenses/by-sa/3.0/> ;\n" +
                            "	pav:version \"16.0\";\n" +
                            "	void:vocabulary <http://purl.org/ontology/bibo/> , <http://www.bioassayontology.org/bao#> , <http://purl.org/obo/owl/CHEBI#> , <http://rdf.ebi.ac.uk/resource/chembl/> , <http://semanticscience.org/resource/> , <http://purl.org/spar/cito/> , <http://purl.org/dc/terms/> , <http://www.w3.org/2002/07/owl#> , <http://purl.obolibrary.org/obo/> , <http://www.w3.org/1999/02/22-rdf-syntax-ns#> , <http://www.w3.org/2000/01/rdf-schema#> , <http://www.w3.org/2004/02/skos/core#> , <http://www.w3.org/2001/XMLSchema#> ;\n" +
                            "    void:exampleResource <http://rdf.ebi.ac.uk/resource/chembl/molecule/CHEMBL941/> ;\n" +
                            "    void:sparqlEndpoint <http://rdf.ebi.ac.uk/dataset/chembl/sparql> ;\n" +
                            "    dct:format \"text/turtle\";\n" +
                            "    void:dataDump <ftp://ftp.ebi.ac.uk/pub/databases/chembl/ChEMBL-RDF/16/chembl_16_molecule.ttl.gz> ;\n" +
                            "    void:triples \"82003819\"^^xsd:integer\n" +
                            ".\n" +
                            "\n" +
                            "<chembl16db>\n" +
                            "	a dctypes:Dataset;\n" +
                            "	dct:title \"ChEMBL RDF\"@en ;\n" +
                            "	dct:description \"The RDF distribution of the ChEMBL 16 dataset.\"@en ;\n" +
                            "	dct:created \"2013-05-07T00:00:00.000+01:00\"^^xsd:dateTime ;\n" +
                            "	dct:publisher <http://www.ebi.ac.uk/>;\n" +
                            "    foaf:page <https://www.ebi.ac.uk/chembl> ;\n" +
                            "	dct:license <http://creativecommons.org/licenses/by-sa/3.0/> ;\n" +
                            ".\n" +
                            "\n" +
                            "<chembl15>\n" +
                            "    rdf:type dctypes:Dataset ;\n" +
                            "    dct:title \"ChEMBL\"@en ;\n" +
                            "    dct:description \"ChEMBL is a database of bioactive drug-like small molecules, it contains 2-D structures, calculated properties (e.g. logP, Molecular Weight, Lipinski Parameters, etc.) and abstracted bioactivities (e.g. binding constants, pharmacology and ADMET data). The data is abstracted and curated from the primary scientific literature, and cover a significant fraction of the SAR and discovery of modern drugs. We attempt to normalise the bioactivities into a uniform set of end-points and units where possible, and also to tag the links between a molecular target and a published assay with a set of varying confidence levels. Additional data on clinical progress of compounds is being integrated into ChEMBL at the current time.\"@en ;\n" +
                            "    dct:created \"2013-05-07T00:00:00\"^^xsd:dateTime ;\n" +
                            "    dct:publisher <http://www.ebi.ac.uk/> ;\n" +
                            "    dct:license <http://creativecommons.org/licenses/by-sa/3.0/> ;\n" +
                            "    dct:language lexvo:en, lexvo:fr;\n" +
                            "    pav:version \"15\";\n" +
                            "    pav:isVersionOf <chembl>;\n" +
                            "    prov:derivedFrom <example>\n" +
                            ".\n"
                }
            ]
        },
        {
            enabled: true,
            default: false,
            name: "oneTriple Test",
            description: "Very basic ShEx example with only one triple",
            creationDate: "1425143400",
            uploadDate: "1425575451",
            data:   "PREFIX foaf: <http://xmlns.com/foaf/>\n" +
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                    "start = <PersonShape>\n" +
                    "<PersonShape> {\n" +
                    "    foaf:name rdf:langString\n" +
                    "}",
            dataDemos: [
                {
                    name: "oneTriple success demo",
                    data:   "PREFIX foaf: <http://xmlns.com/foaf/>\n" +
                            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                            "<Somebody>\n" +
                            "    foaf:name \"Mr Smith\"^^rdf:langString.\n"
                },
                {
                    name: "oneTriple failure demo",
                    data:   "PREFIX foaf: <http://xmlns.com/foaf/>\n" +
                            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                            "<Somebody>\n" +
                            "    foaf:relation \"Mr Smith\"^^rdf:langString.\n"
                }
            ]
        },
        {
            enabled: true,
            default: false,
            name: "Cardinality Test",
            description: "Basic example demonstrating cardinality options",
            creationDate: "1425143400",
            uploadDate: "1425575451",
            data:   "PREFIX ex: <http://ex.example/#>\n" +
                    "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n" +
                    "\n" +
                    "start = {\n" +
                    "    ex:birthDate xsd:dateTime ?,\n" +
                    "    ex:givenName xsd:string +,\n" +
                    "    ex:birthmarks xsd:string *,\n" +
                    "    ex:biologicalParentName xsd:string {2}\n" +
                    "}\n",
            dataDemos: [
                {
                    name: "Success Example",
                    data:   "PREFIX ex: <http://ex.example/#>\n" +
                            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n" +
                            "\n" +
                            "<Somebody>\n" +
                            "    ex:birthDate \"1980-04-27T17:23:31\"^^xsd:dateTime ;\n" +
                            "    ex:givenName \"Sarah\", \"Ann\";\n" +
                            "    ex:birthmarks \"posterior left shoulder\",\n" +
                            "                  \"right cheek\",\n" +
                            "                  \"left index finger\";\n" +
                            "    ex:biologicalParentName \"Pat Jones\",\n" +
                            "                            \"Gene Holmes\" .\n" +
                            "\n"
                },
                {
                    name: "Failure Example",
                    data:   "PREFIX ex: <http://ex.example/#>\n" +
                            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n" +
                            "\n" +
                            "<Somebody>\n" +
                            "    # two recorded birthdates\n" +
                            "    ex:birthDate \"1980-04-27T17:23:31\"^^xsd:dateTime,\n" +
                            "                 \"1980-04-27T17:24:00\"^^xsd:dateTime ;\n" +
                            "    # missing ex:givenName\n" +
                            "    ex:biologicalParentName \"Pat Jones\" .\n" +
                            "\n"
                }
            ]
        }
    ],
    
    options: {
        showSourceButton: true,
        allowCustomSchema: false
    }
};