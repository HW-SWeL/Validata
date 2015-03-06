/*
 * Parses and exports shex
 *
 * Dependencies: Shex Validator
 *
 */

function JShEx(){
    this.prefixes = {};
    this.shapes = {};
    this.start = undefined;
    this.origSchema = undefined;
}

// static regex for buffer and parse for the nmea strings.
JShEx.prototype.tab = "    ";

// Takes in the parsed output from the shex parser and converts it into a simplified shex format
JShEx.prototype.parseShEx = function(responseObject){

    // Clears the content
    this.prefixes = {};
    this.shapes = {};
    this.start = undefined;
    this.origSchema = responseObject.schema;
    this.start = this.origSchema.startRule.lex;
    this.prefixes = responseObject.resolver.Prefixes;
    for (var shape in this.origSchema.ruleMap) {
        if(this.origSchema.ruleMap.hasOwnProperty(shape)){
            this.shapes[shape] = {_:"shape", id:shape.substring(1,shape.length-1), rule:this.parseRule(this.origSchema.ruleMap[shape])};
        }
    }
    return this;
};

JShEx.prototype.parseIRI = function(term) {
    var prefix = "";
    var subject = "";
    for (var p in this.prefixes) {
        if(this.prefixes.hasOwnProperty(p)){
            var prefixKey = p;
            var prefixValue = this.prefixes[p];
            if(term.lex.indexOf(prefixValue)==0){
                subject = term.lex.substring(prefixValue.length);
                prefix = prefixKey;
            }
        }
    }
    if(subject==""){
        if(term.lex.indexOf("http://www.w3.org/2013/ShEx/ns#")==0){
            subject = term.lex.substring("http://www.w3.org/2013/ShEx/ns#".length);
            prefix = "";
        }
    }
    return {
        _:term._,
        term: subject,
        prefix: prefix
    };
};

JShEx.prototype.parseValueSet = function(term) {
    var values = [];
    for(var i=0;i<term.values.length;i++){
        values.push(this.parseTerm(term.values[i]));
    }
    return {
        _:term._,
        values:values
    };
};

JShEx.prototype.parseValueReference = function(term) {
    return {
        _:term._,
        label:term.label.lex
    };
};

JShEx.prototype.parseValueWild = function(term) {
    return {
        _:term._,
        exceptions: ""
    };
};


JShEx.prototype.parseTerm = function(term){
    var t = undefined;
    if(term._ == "NameTerm")
        t = term.term;
    else if(term._ == "ValueTerm")
        t = term.term;
    else if(term._ == "ValueType")
        t = term.type;
    else if(term._ == "ValueReference")
        t = term;
    else if(term._ == "ValueSet")
        t = term;
    else if(term._ == "ValueWild")
        t = term;
    else if(term._ == "IRI")
        t = term;
    else
        console.log(term);

    switch(t._){
        case "IRI":
            return this.parseIRI(t);
            break;
        case "ValueSet":
            return this.parseValueSet(t);
            break;
        case "ValueReference":
            return this.parseValueReference(t);
            break;
        case "ValueWild":
            return this.parseValueWild(t);
            break;
        default:
            return {_:"node end"};
            break;
    }
};

JShEx.prototype.parseRule = function(rule){
    switch(rule._){
        case "AndRule":
            return this.parseAndRule(rule);
            break;
        case "OrRule":
            return this.parseOrRule(rule);
            break;
        case "UnaryRule":
            return this.parseUnaryRule(rule);
            break;
        case "IncludeRule":
            return this.parseIncludeRule(rule);
            break;
        case "AtomicRule":
            return this.parseAtomicRule(rule);
            break;
        default:
            return {_:"node end"};
            break;
    }
};

JShEx.prototype.parseAndRule = function(rule){
    var c = [];
    for(var i=0;i<rule.conjoints.length;i++){
        c.push(this.parseRule(rule.conjoints[i]));
    }
    return {
        _:rule._,
        conjoints:c
    };
};

JShEx.prototype.parseAtomicRule = function(rule){
    return {
        _:rule._,
        name: this.parseTerm(rule.nameClass),
        value: this.parseTerm(rule.valueClass),
        max: rule.max,
        min: rule.min,
        negated: rule.negated,
        reversed: rule.reversed
    };
};

JShEx.prototype.parseIncludeRule = function(rule){
    return {
        _:rule._,
        include: rule.include.lex
    };
};

JShEx.prototype.parseOrRule = function(rule){
    var c = [];
    for(var i=0;i<rule.disjoints.length;i++){
        c.push(this.parseRule(rule.disjoints[i]));
    }
    return {
        _:rule._,
        disjoints:c
    };
};

JShEx.prototype.parseUnaryRule = function(rule){
    var p = {
        _:rule._,
        rule: this.parseRule(rule.rule)
    };
    if(rule.opt)
        p.optional = true;
    return p;
};








































































JShEx.prototype.toShEx = function(){
    var prefixesStr = "";
    for(var prefix in this.prefixes)
        if(this.prefixes.hasOwnProperty(prefix))
            prefixesStr += this.exportPrefixToShEx(prefix,this.prefixes[prefix])+"\n";
    var startStr = this.exportStartToShEx(this.start)+"\n";
    var shapesStr = "";
    for(var shape in this.shapes)
        if(this.shapes.hasOwnProperty(shape))
            shapesStr += this.exportShapeToShEx(this.shapes[shape])+"\n\n";
    return prefixesStr+"\n"+startStr+"\n"+shapesStr;
};

JShEx.prototype.exportPrefixToShEx = function(prefix,value){
    return "PREFIX "+prefix+": <"+value+">";
};

JShEx.prototype.exportStartToShEx = function(start){
    return "start = <"+start+">";
};

JShEx.prototype.exportShapeToShEx = function(shape){
    var shapeStr = "<"+shape.id+"> {\n";
    shapeStr += this.exportIndentLines(this.exportRuleToShEx(shape.rule));
    shapeStr += "\n}";
    return shapeStr;
};

JShEx.prototype.exportRuleToShEx = function(rule){
    switch(rule._){
        case "AndRule":
            return this.exportAndRuleToShEx(rule);
            break;
        case "OrRule":
            return this.exportOrRuleToShEx(rule);
            break;
        case "IncludeRule":
            return this.exportIncludeRuleToShEx(rule);
            break;
        case "AtomicRule":
            return this.exportAtomicRuleToShEx(rule);
            break;
        case "UnaryRule":
            return this.exportUnaryRuleToShEx(rule);
            break;
        default:
            return "UNKNOWN RULE";
            break;
    }
};

JShEx.prototype.exportAndRuleToShEx = function(rule){
    var out = "";
    for(var i=0;i<rule.conjoints.length;i++){
        out += this.exportRuleToShEx(rule.conjoints[i]);
        if(i!=rule.conjoints.length-1) {
            out += ",\n";
        }
    }
    return out;
};

JShEx.prototype.exportOrRuleToShEx = function(rule){
    var out = "(\n";
    for(var i=0;i<rule.disjoints.length;i++){
        out += this.exportRuleToShEx(rule.disjoints[i]);
        if(i!=rule.disjoints.length-1) {
            out += "\n| ";
        }
    }
    out += "\n)";
    return out;
};

JShEx.prototype.exportUnaryRuleToShEx = function(rule){
    var out = "";
    // Ignore redundant parenthesis
    if(rule.rule._=="OrRule"){
        out += this.exportRuleToShEx(rule.rule);
    } else {
        out = "(\n";
        out += this.exportRuleToShEx(rule.rule);
        out += "\n)";
    }
    if(rule.optional)
        out += "?";
    return out;
};

JShEx.prototype.exportAtomicRuleToShEx = function(rule){
    var out = "";
    if(rule.negated)
        out+="!";
    out += this.exportTermToShExthis(rule.name);
    out += " ";
    out += this.exportTermToShExthis(rule.value);
    if(rule.max == undefined && rule.min == undefined) {
        out += "";
    } else if(rule.max == undefined) {
        if (rule.min == 1)
            out += "+";
        else if (rule.min == 0)
            out += "*";
        else
            out += "{" + rule.min + ",100000000000}";
        // The above is a hack, just in case we have somehow gained
        // the ability to have n to infinity cardinality.
    } else if(rule.min == undefined){
        out += "{0,"+rule.max+"}";
    } else if(rule.min == 0 && rule.max == 1){
        out += "?";
    } else if(rule.min==rule.max){
        if(rule.min != 1)
            out += "{"+rule.min+"}";
        else
            out += "";
    } else {
        out += "{"+rule.min+","+rule.max+"}";
    }
    return out;
};

JShEx.prototype.exportIncludeRuleToShEx = function(rule){
    return "&<"+rule.include+">";
};

JShEx.prototype.exportTermToShExthis = function(term){
    switch(term._){
        case "IRI":
            return this.exportIRIToShEx(term);
            break;
        case "ValueSet":
            return this.exportValueSetToShEx(term);
            break;
        case "ValueReference":
            return this.exportValueReferenceToShEx(term);
            break;
        case "ValueWild":
            return this.exportValueWildToShEx(term);
            break;
        default:
            return "UNKNOWN TERM";
            break;
    }
};

JShEx.prototype.exportIRIToShEx = function(term){
    if(term.prefix=="")
        return term.term;
    return term.prefix+":"+term.term;
};

JShEx.prototype.exportValueSetToShEx = function(term){
    var out = "(";
    for(var i=0;i<term.values.length;i++){
        out+=this.exportTermToShExthis(term.values[i]);
        if(i!=term.values.length-1)
            out += " ";
    }
    out += ")";
    return out;
};

JShEx.prototype.exportValueReferenceToShEx = function(term){
    return "@<"+term.label+">";
};

JShEx.prototype.exportValueWildToShEx = function(){
    return ".";
};

JShEx.prototype.exportIndentLines = function(lines){
    return this.tab+lines.replace(/\n/g, '\n'+this.tab);
};













































JShEx.prototype.upsertPrefix = function(prefix,value){};
JShEx.prototype.removePrefix = function(prefix,value){};

JShEx.prototype.addShape = function(shapeId){};
JShEx.prototype.renameShape = function(shapeId,newShapeId){};
JShEx.prototype.removeShape = function(shapeId){};

JShEx.prototype.setStart = function(shapeId){};

JShEx.prototype.addRule = function(node,opt){};
JShEx.prototype.addAndRule = function(node,opt){};
JShEx.prototype.addOrRule = function(node,opt){};
JShEx.prototype.addUnaryRule = function(node,opt){};
JShEx.prototype.addAtomicRule = function(node,opt){};
JShEx.prototype.addIncludeRule = function(node,opt){};
JShEx.prototype.removeRule = function(node,opt){};

JShEx.prototype.setRuleCardinality = function(node,opt){
    // Handle OrRule differently, because it needs to be wrapped in a unary
};

JShEx.prototype.setRuleConformance = function(node,opt){
    // Handle OrRule differently, because it needs to be wrapped in a unary
};

JShEx.prototype.getSuggestedValues = function(node,opt){
    // Handle OrRule differently, because it needs to be wrapped in a unary
};

JShEx.prototype.editValueSet = function(node,opt){
    // Handle OrRule differently, because it needs to be wrapped in a unary
};