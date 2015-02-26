{
    function createStack () {
        var ret = [];
        ret.peek = function () { return this.slice(-1)[0]};
        ret.replace = function (elt) { this[this.length-1] = elt; };
        return ret;
    }
    var curSubject   = createStack();
    var curPredicate = createStack();
    var curListHead  = createStack();
    var curListTail  = createStack();
    var insertTripleAt = createStack(); // where to place (collection) triples for nice defaults
    var db = RDF.Dataset();
    db.nextInsertAt = null;
    db.add = function (s, p, o) {
        var t = RDF.Triple(s, p, o);
        if (this.nextInsertAt == null)
            this.push(t);
        else {
            this.insertAt(this.nextInsertAt, t);
            this.nextInsertAt = null;
        }
    }
    var RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    var XSD_NS = 'http://www.w3.org/2001/XMLSchema#'
    var iriResolver = ("iriResolver" in options) ? options.iriResolver : RDF.createIRIResolver();
    var bnodeScope = ("bnodeScope" in options) ? options.bnodeScope : RDF.createBNodeScope();
    iriResolver.errorHandler = function (message) {
        throw peg$buildException(message, null, peg$reportedPos);
    };

    function _literalHere (value, type) {
        var dt = RDF.IRI(XSD_NS+type, RDF.Position5(text(), line(), column(), offset(), value.length));
        var pos = RDF.Position5(text(), line(), column(), offset(), value.length);
        return RDF.RDFLiteral(value, undefined, dt, pos);
    }

    var curSchema = new RDF.Schema();
    curSchema.db = db;
}
ShExDoc         = _ directive* _ssc_statement? {
    if (curSubject.length > 0 ||
    curPredicate.length > 0) {
    return {_: "Bad end state:",
        s:curSubject,
        p:curPredicate,
        t:db.triples.map(
            function (t) { return t.toString(); }
        ).join('\n')
    };
}
// t:db.triples.map( function (t) { console.log(t.toString()); } )
return curSchema;
}

_ssc_statement  = _ssc statement*
_ssc            = shape
/ start
/ m:CodeMap { curSchema.init = m; }
statement       = directive / start / shape
directive       = sparqlPrefix _ / sparqlBase _
sparqlPrefix    = SPARQL_PREFIX _ pre:PNAME_NS _ i:IRIREF { iriResolver.setPrefix(pre, i.lex); }
sparqlBase      = SPARQL_BASE _ i:IRIREF { iriResolver.setBase(i.lex); }

start           = 'start' _ '=' _ startRule
startRule       = l:label _ { curSchema.startRule = l; }
/ t:typeSpec _ m:CodeMap {
    var r = Object.keys(m).length ? new RDF.UnaryRule(t, false, m, RDF.Position2(line(), column())) : t;
    var b = RDF.BNode(bnodeScope.nextLabel(), RDF.Position5(text(), line(), column(), offset(), 1));
    r.setLabel(b);
    curSchema.add(b, r);
    curSchema.startRule = b;
    return new RDF.ValueReference(b, RDF.Position2(line(), column()));
}

shape           = v:_VIRTUAL? l:label _ t:typeSpec _ m:CodeMap {
    var r = Object.keys(m).length ? new RDF.UnaryRule(t, false, m, RDF.Position2(line(), column())) : t;
    r.setLabel(l);
    curSchema.add(l, r);
    if (v)
        curSchema.markVirtual(r);
}
_VIRTUAL        = VIRTUAL _ { return true; }
typeSpec        = includes:include* '{' _ exp:OrExpression? _ '}' {
    // exp could be null if it's an empty (probably parent) rule.
    if (includes.length) {
        if (exp) { // includes, exp
            includes.forEach(function (p) {
                curSchema.hasDerivedShape(p.include, exp); // API reflects that we only care about parent->child map.
            });
            if (exp._ == 'AndRule') {
                exp.prepend(includes);
                return exp;
            } else {
                includes.push(exp);
                return new RDF.AndRule(includes, RDF.Position2(line(), column()));
            }
        } else { // includes, !exp
            // could set exp to new RDF.EmptyRule(line(), column()) above but end up with pointless disjoint.
            var ret = new RDF.AndRule(includes, RDF.Position2(line(), column()));
            includes.forEach(function (p) {
                curSchema.hasDerivedShape(p.include, ret); // API reflects that we only care about parent->child map.
            });
            return ret;
        }
    } else {
        if (exp) { // !includes, exp
            return exp;
        } else { // !includes, !exp
            return new RDF.EmptyRule(RDF.Position2(line(), column()));
        }
    }
}
include = '&' _ l:label _  { return new RDF.IncludeRule(l, RDF.Position2(line(), column())); }

OrExpression    = exp:AndExpression _ more:disjoint* {
    if (!more.length) return exp;
more.unshift(exp)
return new RDF.OrRule(more, RDF.Position2(line(), column()));
}
disjoint = '|' _ exp:AndExpression _ { return exp; }
AndExpression   = exp:UnaryExpression _ more:conjoint* {
    if (!more.length) return exp;
more.unshift(exp)
return new RDF.AndRule(more, RDF.Position2(line(), column()));
}
conjoint = ',' _ exp:UnaryExpression _ { return exp; }
UnaryExpression = i:_id? a:arc {
    if (curSubject.length > 0)
        curSubject.pop();
    if (i) a.setRuleID(i); // in case it has an ID but no triples.
    return a;
}
/ inc:include { return inc; } // @@ default action sufficient?
/ i:_id? '(' _ exp:OrExpression _ ')' _ r:repeatCount? _ c:CodeMap {
    if (r)
        width = r.ends-offset();
    else
        r = {min: 1, max: 1};
    if (curSubject.length > 0)
        curSubject.pop();
    if (r.min === 1 && !Object.keys(c).length) {
        if (i) exp.setRuleID(i); // in case it has an ID but no triples.
        return exp;
    }
    return new RDF.UnaryRule(exp, r.min !== 1 /* !!! extend to handle n-ary cardinality */, c, RDF.Position2(line(), column()));
}
_id = '$' _ i:iri _ { curSubject.push(i); return i; }

label           = iri / BlankNode

arc             = CONCOMITANT _ '@' _ l:label _ r:repeatCount? _ p:properties? _ c:CodeMap {
    var v = new RDF.ValueReference(l, RDF.Position5(text(), line(), column(), offset(), l._pos.offset-offset()+l._pos.width));
    var width = v._pos.offset-offset()+v._pos.width;
    if (r)
        width = r.ends-offset();
    else
        r = {min: 1, max: 1};
    var ret = new RDF.ConcomitantRule(v, r.min, r.max, c, RDF.Position5(text(), line(), column(), offset(), width));
    if (p) ret.setRuleID(p);
    return ret;
}
/ e:('!' _ )? a:('^' _ )? n:nameClass _ v:valueClass _ d:defahlt? _ r:repeatCount? _ p:properties? _ c:CodeMap {
    if (d)
        throw peg$buildException('default (='+d.toString()+') not currently supported', null, peg$reportedPos);
    var width = v._pos.offset-offset()+v._pos.width;
    if (r)
        width = r.ends-offset();
    else
        r = {min: 1, max: 1};
    var ret = new RDF.AtomicRule(e?true:false, a?true:false, n, v, r.min, r.max, c, RDF.Position5(text(), line(), column(), offset(), width));
    if (p) ret.setRuleID(p);
    return ret;
}

nameClass       = _nmIriStem
/ i: RDF_TYPE { return new RDF.NameTerm(i, RDF.Position2(line(), column())); }
/ '.' _ excl:exclusions { return new RDF.NameWild(excl.list, RDF.Position2(line(), column())); }
_nmIriStem = i:iri patFlag:( _ TILDE _ exclusions)? {
    return patFlag ? new RDF.NamePattern(i, patFlag[3] ? patFlag[3].list : [], RDF.Position2(line(), column())) : new RDF.NameTerm(i, RDF.Position2(line(), column()));
}

valueClass      = '@' _ l:label { return new RDF.ValueReference(l, RDF.Position5(text(), line(), column(), offset(), l._pos.offset-offset()+l._pos.width)); }
/ r:typeSpec {
    var b = RDF.BNode(bnodeScope.nextLabel(), RDF.Position5(text(), line(), column(), offset(), 1));
    r.setLabel(b);
    curSchema.add(b, r);
    return new RDF.ValueReference(b, RDF.Position5(text(), line(), column(), offset(), 1)); // Only hilight open brace.
}
/ t:nodeType { return new RDF.ValueType(t, RDF.Position5(text(), line(), column(), offset(), t._pos.width)); }
/ n:iri { return new RDF.ValueType(n, RDF.Position5(text(), line(), column(), offset(), n._pos.width)); }
/ s:valueSet { return new RDF.ValueSet(s.list, RDF.Position5(text(), line(), column(), offset(), s.ends-offset())); }
/ '.' _ excl:exclusions { return new RDF.ValueWild(excl.list, RDF.Position5(text(), line(), column(), offset(), excl.ends-offset())); }
nodeType        = IRI / LITERAL / BNODE / NONLITERAL
defahlt         = '=' o:(_iri_OR_literal) { return o; }
_iri_OR_literal = iri
/ literal

predicateObjectList = _ verb objectList (_ ';' _ (verb objectList)* )*
verb            = v:predicate { curPredicate.push(v); }
/ v:RDF_TYPE { curPredicate.push(v); }
predicate       = iri
objectList      = _ o:object oz:(_ ',' _ object)* { curPredicate.pop(); }

object = n:iri                   { db.add(curSubject.peek(), curPredicate.peek(), n); return n; }
/ n:BlankNode             { db.add(curSubject.peek(), curPredicate.peek(), n); return n; }
/ n:collection            { db.add(curSubject.peek(), curPredicate.peek(), n); return n; }
/ n:blankNodePropertyList { db.add(curSubject.peek(), curPredicate.peek(), n); return n; }
/ n:literal               { db.add(curSubject.peek(), curPredicate.peek(), n); return n; }

blankNodePropertyList = s:_lbracket predicateObjectList _ _rbracket { curSubject.pop(); return s; }
_lbracket       = '['            {
    var ret = RDF.BNode(bnodeScope.nextLabel(), RDF.Position5(text(), line(), column(), offset(), 1));
    curSubject.push(ret);
    return ret;
}
_rbracket       = ']'

// Collections
collection      = _openCollection _ _members* r:_closeCollection                                 { return r; }
_openCollection = '('            {
    curListHead.push(null);
    curListTail.push(null);
    insertTripleAt.push(db.triples.length);
    curSubject.push(RDF.BNode(bnodeScope.nextLabel(), RDF.Position5(text(), line(), column()-1, offset()-1, 1)));
    curPredicate.push(RDF.IRI(RDF_NS+'first', RDF.Position5(text(), line(), column(), offset(), 1)));
}
_closeCollection= ')'            {
    curSubject.pop();
    curPredicate.pop();
    var nil = RDF.IRI(RDF_NS+'nil', RDF.Position5(text(), line(), column(), offset(), 1));
    if (curListHead.peek() != null) // got some elements
        db.add(curListTail.peek(),
            RDF.IRI(RDF_NS+'rest', RDF.Position5(text(), line(), column()-1, offset()-1, 1)),
            nil);
    db.nextInsertAt = insertTripleAt.pop();
    curListTail.pop();
    var ret = curListHead.pop();
    return (ret == null) ? nil : ret;
}
_members = o:object _           {
    var cur = curSubject.peek();
    if (curListHead.peek() == null)
        curListHead.replace(cur);
    else {
        db.nextInsertAt = db.triples.length-1;
        db.add(curListTail.peek(), // last tail
            RDF.IRI(RDF_NS+'rest', RDF.Position5(text(), line(), column(), offset(), 1)),
            cur);
        db.nextInsertAt = null;
    }
    var next = RDF.BNode(bnodeScope.nextLabel(), RDF.Position5(text(), line(), o._pos.column-2, o._pos.offset-2, 1));
    curListTail.replace(cur);
    curSubject.replace(next);
    curPredicate.replace(RDF.IRI(RDF_NS+'first', RDF.Position5(text(), line(), o._pos.column-1, o._pos.offset-1, 1)));
}

// properties repeats blankNodePropertyList, but with different semantic actions
properties      = s:_lbracket1 predicateObjectList _ _rbracket1 { curSubject.pop(); return s; }
_lbracket1 = '[' {
    if (curSubject.length > 0)
        return curSubject.slice(-1)[0]; // curSubject was set by $_id rule
    var ret = RDF.BNode(bnodeScope.nextLabel(), RDF.Position5(text(), line(), column(), offset(), 1));
    curSubject.push(ret);
    return ret;
}
_rbracket1 = ']'

exclusions      = ex:_excl* { return ex.length ? {ends: ex[ex.length-1]._pos.offset+ex[ex.length-1]._pos.width , list:ex} : {ends:offset(), list:[]}; }
_excl = '-' _ i:iri _ { return i; }

repeatCount     = '*' { return {min: 0, max: undefined, ends: offset()+1}; }
/ '+' { return {min: 1, max: undefined, ends: offset()+1}; }
/ '?' { return {min: 0, max: 1, ends: offset()+1}; }
/ _openBRACE min:INTEGER _ max:_max? _ c:_closeBRACE { return {min: min, max: max === null ? min : max, ends: c}; }
_openBRACE = '{'
_closeBRACE = '}' { return offset()+1; }
_max = ',' _ max:_upper? { return max ? max : undefined; }
_upper = '*' _ { return undefined; }
/ i:INTEGER _ { return i; }
valueSet        = _openPAREN _ o:( p:_values )+ c:_closePAREN { return {ends:c, list:o}; }
_openPAREN = '('
_closePAREN = ')' { return offset()+1; }
_values = o:valueChoice _ { return o; } // strip out whitespace

CodeMap         = codeList:_codePair* {
    var ret = {};
for (var i = 0; i < codeList.length; ++i)
    ret[codeList[i].label] = codeList[i];
return ret;
}
_codePair = c:CODE _ { return c; }

_objIriStem      = i:iri patFlag:( _ TILDE _ exclusions)? {
    return patFlag
        ? new RDF.ValuePattern(i, patFlag[3] ? patFlag[3].list : [], RDF.Position5(text(), line(), column(), offset(), patFlag[1]-offset()))
        : new RDF.ValueTerm(i, RDF.Position5(text(), line(), column(), offset(), i._pos.width));
}
TILDE = '~' { return offset()+1; }

valueChoice     = _objIriStem
//                / b:BlankNode { return new RDF.ValueTerm(b, RDF.Position5(text(), line(), column(), offset(), b._pos.width)); }
/ l:literal { return new RDF.ValueTerm(l, RDF.Position5(text(), line(), column(), offset(), l._pos.width)); }


// Literals
literal        = RDFLiteral / NumericLiteral / BooleanLiteral
NumericLiteral = value:DOUBLE  { return _literalHere(value, 'double'); }
/ value:DECIMAL { return _literalHere(value, 'decimal'); }
/ value:INTEGER { return _literalHere(value, 'integer'); }
RDFLiteral     = s:String _ l:LANGTAG { return RDF.RDFLiteral(s.lex, l, undefined, RDF.Position5(text(), s.line, s.column, s.offset, s.length+1+l._pos.width)); }
/ s:String _ '^^' _ i:iri { return RDF.RDFLiteral(s.lex, undefined, i, RDF.Position5(text(), s.line, s.column, s.offset, s.length+2+i._pos.width)); }
/ s:String      { return RDF.RDFLiteral(s.lex, undefined, undefined, RDF.Position5(text(), s.line, s.column, s.offset, s.length)); }
BooleanLiteral = 'true'        { return _literalHere('true', 'boolean'); }
/ 'false'       { return _literalHere('false', 'boolean'); }
String = STRING_LITERAL_LONG1 / STRING_LITERAL_LONG2 / STRING_LITERAL1 / STRING_LITERAL2

// IRIs
iri = IRIREF / PrefixedName
PrefixedName = ln:PNAME_LN {
    return RDF.IRI(iriResolver.getAbsoluteIRI(iriResolver.getPrefix(ln.prefix) + ln.lex), RDF.Position5(text(), line(), column(), offset(), ln.width));
}
/ p:PNAME_NS { return RDF.IRI(iriResolver.getAbsoluteIRI(iriResolver.getPrefix(p)), RDF.Position5(text(), line(), column(), offset(), p.length+1)); }
BlankNode = BLANK_NODE_LABEL / ANON

// Terminals:
CODE = '%' label:([a-zA-Z+#_][a-zA-Z0-9+#_]*)? '{' code:([^%\\] / '\\' '%')* '%' '}' {
    return new RDF.Code(label[0]+label[1].join(''), code.join(''), RDF.Position5(text(), line(), column(), offset(), 1+label.length+1+code.length+4));
}

VIRTUAL = [Vv][Ii][Rr][Tt][Uu][Aa][Ll]

IRI = [Ii][Rr][Ii] { return RDF.IRI('http://www.w3.org/2013/ShEx/ns#IRI', RDF.Position5(text(), line(), column(), offset(), 3)); }
LITERAL = [Ll][Ii][Tt][Ee][Rr][Aa][Ll] { return RDF.IRI('http://www.w3.org/2013/ShEx/ns#Literal', RDF.Position5(text(), line(), column(), offset(), 3)); }
BNODE = [Bb][Nn][Oo][Dd][Ee] { return RDF.IRI('http://www.w3.org/2013/ShEx/ns#BNode', RDF.Position5(text(), line(), column(), offset(), 3)); }
NONLITERAL = [Nn][Oo][Nn][Ll][Ii][Tt][Ee][Rr][Aa][Ll] { return RDF.IRI('http://www.w3.org/2013/ShEx/ns#NonLiteral', RDF.Position5(text(), line(), column(), offset(), 3)); }

RDF_TYPE = 'a' { return RDF.IRI(RDF_NS+'type', RDF.Position5(text(), line(), column(), offset(), 1)); }

IRIREF = b:_IRIREF_BEGIN s:([^\u0000-\u0020<>\"{}|^`\\] / UCHAR)* e:_IRIREF_END {
return RDF.IRI(iriResolver.getAbsoluteIRI(s.join('')), RDF.Position5(text(), line(), column(), offset(), e-b+1));
}
_IRIREF_BEGIN = '<' { return offset(); }
_IRIREF_END = '>' { return offset(); }

CONCOMITANT = [Cc][Oo][Nn][Cc][Oo][Mm][Ii][Tt][Aa][Nn][Tt]
SPARQL_PREFIX = [Pp][Rr][Ee][Ff][Ii][Xx]
SPARQL_BASE = [Bb][Aa][Ss][Ee]
PNAME_NS = pre:PN_PREFIX? ':' { return pre ? pre : '' } // pre+'|' : '|';
PNAME_LN = pre:PNAME_NS l:PN_LOCAL {
    return {width: pre.length+1+l.length, prefix:pre, lex:l};
}

BLANK_NODE_LABEL = '_:' first:[a-zA-Z_] rest:[a-zA-Z0-9_]* {
    return RDF.BNode(bnodeScope.uniqueLabel(first+rest.join('')), RDF.Position5(text(), line(), column(), offset(), 2+first.length+rest.length));
}
LANGTAG          = '@' s:([a-zA-Z]+ ('-' [a-zA-Z0-9]+)*) {
    s[1].splice(0, 0, '');
    var str = s[0].join('')+s[1].reduce(function(a,b){return a+b[0]+b[1].join('');});
    return RDF.LangTag(str, RDF.Position5(text(), line(), column()+1, offset()+1, str.length));
}
INTEGER          = sign:[+-]? s:[0-9]+ { if (!sign) sign=''; return sign+s.join(''); }
DECIMAL          = sign:[+-]? l:[0-9]* '.' d:[0-9]+ { if (!sign) sign=''; return sign+l.join('')+'.'+d.join(''); }
DOUBLE           = sign:[+-]? v:_DOUBLE_VAL { if (!sign) sign=''; return sign+v; }
_DOUBLE_VAL      = m:[0-9]+ '.' d:[0-9]* e:EXPONENT { return m.join('')+'.'+d.join('')+e; }
/ '.' d:[0-9]+ e:EXPONENT { return '.'+d.join('')+e; }
/ m:[0-9]+ e:EXPONENT { return m.join('')+e; }
EXPONENT         = e:[eE] sign:[+-]? l:[0-9]+ { if (!sign) sign=''; return e+sign+l.join(''); }
STRING_LITERAL1  = b:_STRING_LITERAL1_DELIM s:_NON_1* e:_STRING_LITERAL1_DELIM { return {line:line(), column:column(), offset:offset(), length:e-b+1, lex:s.join('')}; }
_STRING_LITERAL1_DELIM = "'" { return offset(); }
_NON_1 = [^\u0027\u005C\u000A\u000D] / ECHAR / UCHAR
STRING_LITERAL2  = b:_STRING_LITERAL2_DELIM s:_NON_2* e:_STRING_LITERAL2_DELIM { return {line:line(), column:column(), offset:offset(), length:e-b+1, lex:s.join('')}; }
_STRING_LITERAL2_DELIM = '"' { return offset(); }
_NON_2 = [^\u0022\u005C\u000A\u000D] / ECHAR / UCHAR
STRING_LITERAL_LONG1 = b:_STRING_LITERAL_LONG1_DELIM s:_NON_LONG1* e:_STRING_LITERAL_LONG1_DELIM { return {line:line(), column:column(), offset:offset(), length:e-b+3, lex:s.join('')}; }
_STRING_LITERAL_LONG1_DELIM = "'''" { return offset(); }
_NON_LONG1 = q:_LONG1? c:[^'\\] { // '
return q ? q+c : c;
}
/ ECHAR / UCHAR
_LONG1 = "''" / "'"
STRING_LITERAL_LONG2 = b:_STRING_LITERAL_LONG2_DELIM s:_NON_LONG2* e:_STRING_LITERAL_LONG2_DELIM { return {line:line(), column:column(), offset:offset(), length:e-b+3, lex:s.join('')}; }
_STRING_LITERAL_LONG2_DELIM = '"""' { return offset(); }
_NON_LONG2 = q:_LONG2? c:[^"\\] { // "
return q ? q+c : c;
}
/ ECHAR / UCHAR
_LONG2 = '""' / '"'
UCHAR            = '\\u's:(HEX HEX HEX HEX) { return String.fromCharCode(parseInt(s.join(''), 16)); }
/ '\\U's:(HEX HEX HEX HEX HEX HEX HEX HEX) {
    var code = parseInt(s.join(''), 16);
    if (code<0x10000) { // RDFa.1.2.0.js:2712
        return String.fromCharCode(code);
    } else {
        // Treat this as surrogate pairs until use cases for me to push it up to the toString function. (sigh)
        var n = code - 0x10000;
        var h = n >> 10;
        var l = n & 0x3ff;
        return String.fromCharCode(h + 0xd800) + String.fromCharCode(l + 0xdc00);
    }
}
ECHAR = '\\' r:[tbnrf"'\\] { // "
return r=='t' ? '\t'
    : r=='b' ? '\b'
    : r=='n' ? '\n'
    : r=='r' ? '\r'
    : r=='f' ? '\f'
    : r=='"' ? '"'
    : r=='\'' ? '\''
    : '\\'
}
ANON             = '[' s:_ ']' { return RDF.BNode(bnodeScope.nextLabel(), RDF.Position5(text(), line(), column(), offset(), s.length+2)); }
PN_CHARS_BASE = [A-Z] / [a-z]
PN_CHARS_U = PN_CHARS_BASE / '_'
PN_CHARS = PN_CHARS_U / '-' / [0-9]
PN_PREFIX = b:PN_CHARS_BASE r:PN_PREFIX2? { return r ? b+r : b; }
PN_PREFIX2 = l:'.' r:PN_PREFIX2 { return l+r; }
/ l:PN_CHARS r:PN_PREFIX2? { return r ? l+r : l; }

PN_LOCAL = l:(PN_CHARS_U / ':' / [0-9] / PLX) r:PN_LOCAL2?
{ return r ? l+r : l; }
PN_LOCAL2 = l:'.' r:PN_LOCAL2 { return l+r; }
/ l:PN_CHARS_colon_PLX r:PN_LOCAL2? { return r ? l+r : l; }
PN_CHARS_colon_PLX = PN_CHARS / ':' / PLX
PLX = PERCENT / PN_LOCAL_ESC
PERCENT = '%' l:HEX r:HEX { return '%'+l+r; }
HEX = [0-9] / [A-F] / [a-f]
PN_LOCAL_ESC = '\\' r:[_~.!$&'()*+,;=/?#@%-] { return r; }

_ = x:(WS / COMMENT)* { return ''; }
WS               = [ \t\r\n]+ { return ''; }
COMMENT          =  "#" comment:[^\r\n]* { curSchema.addComment(new RDF.Comment(comment.join(''), RDF.Position5(text(), line(), column(), offset(), comment.length+1))); }
// [/terminals]
