(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Promise = require("promise");

function pad (d, str) {
    if (str === undefined) str = '  ';
    var ret = '';
    while (d-- > 0)
        ret += str;
    return ret;
}

function defix (term, prefixes) {
    if (term._ !== 'IRI')
        return term.toString();
    if (term.lex === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
        return 'a';
    for (var key in prefixes)
        if (term.lex.substr(0, prefixes[key].length) === prefixes[key])
            return key + ":" + term.lex.substr(prefixes[key].length);
    return term.toString();
}

function IntStringMap () {
    var stringToInt = {};
    var intToString = [];
    var intToMembers = [];
    return {
        add: function (string) {
            if (stringToInt[string])
                return stringToInt[string];
            size = intToString.length;
            stringToInt[string] = size;
            intToString.push(string);
            intToMembers.push([]);
            return size;
        },
        addMember: function (member, offset) {
            if (offset === undefined) offset = intToMembers.length - 1;
            if (intToMembers.indexOf(member) == -1)
                intToMembers[offset].push(member);
        },
        getInt: function (str) { return stringToInt[str]; },
        getString: function (i) { return intToString[i]; },
        getMembers: function (offset) {
            if (offset === undefined) offset = intToMembers.length - 1;
            return intToMembers[offset];
        }
    };
}

function StringIdMap () {
    var _map = {};
    return {
        add: function (string, id) {
            if (!(string in _map))
                _map[string] = [];
            _map[string].push(id);
        },
        get: function (string) {
            return _map[string];
        }
    };
}

function CharMap (text, offsets) {
    var _text = text || '';
    var _offsets = offsets;
    if (_offsets === undefined) {
        _offsets = [];
        var i;
        for (i = 0; i < text.length; ++i) {
            _text[i] = text[i];
            _offsets[i] = i;
        }
        _offsets[i] = i;
    }

    return {
        getText: function () { return _text; },

        length: function () { return _offsets.length - 1; },

        insertBefore: function (offset, str, skip) {
            _text = _text.substr(0, _offsets[offset] + skip) + str + _text.substr(_offsets[offset] + skip);
            _offsets = _offsets.slice(0, offset+1)
                .concat(_offsets.slice(offset+1).map(
                    function (el) {
                        return el + str.length;
                    }
                ));
        },

        insertAfter: function (offset, str, skip) {
            _text = _text.substr(0, _offsets[offset] + skip) + str + _text.substr(_offsets[offset] + skip);
            _offsets = _offsets.slice(0, offset)
                .concat(_offsets.slice(offset).map(
                    function (el) {
                        return el + str.length;
                    }
                ));
        },

        replace: function (offset, str) {
            _text = _text.substr(0, _offsets[offset]) + str + _text.substr(_offsets[offset]+1);
            _offsets = _offsets.slice(0, offset+1)
                .concat(_offsets.slice(offset+1).map(
                    function (el) {
                        return el + str.length - 1;
                    }
                ));
        },

        HTMLescape: function () {
            var copy = _text;
            for (var i = 0; i < copy.length; ++i) {
                switch (copy[i]) {
                    case "<":
                        this.replace(i, "&lt;");
                        break;
                    case ">":
                        this.replace(i, "&gt;");
                        break;
                    default:
                }
            }
        }
    };
}

function SPARQLCardinality (min, max) {
    var ret = '';
    if (min === 0 && max === undefined)
        ;
    else {
        ret += " HAVING (";
        if (min === max)
            ret += "COUNT(*)=" + min;
        else {
            if (min !== 0)
                ret += "COUNT(*)>=" + min;
            if (min !== 0 && max !== undefined)
                ret += " && ";
            if (max !== undefined)
                ret += "COUNT(*)<=" + max;
        }
        ret += ")";
    }
    return ret;
}

function ResourceShapeCardinality (min, max, sePrefix, rsPrefix, seFix, rsFix) {
    if (min === 1 && max === 1) {
        return rsFix + "occurs " + rsPrefix + ":Exactly-one ;\n";
    } else if (min === 0 && max === 1) {
        return rsFix + "occurs " + rsPrefix + ":Zero-or-one ;\n";
    } else if (min === 0 && max === undefined) {
        return rsFix + "occurs " + rsPrefix + ":Zero-or-many ;\n";
    } else if (min === 1 && max === undefined) {
        return rsFix + "occurs " + rsPrefix + ":One-or-many ;\n";
    } else {
        return seFix + "min " + min + " ;\n" +
            seFix + (max === undefined ? "maxundefined true" : "max " + max) + " ;\n";
    }
}

function codesToSExpression (codes, depth) {
    var lead = pad(depth, '    ');
    if (codes === undefined)
        return "";
    return Object.keys(codes).map(function (k) {
        return "\n" + lead + codes[k].toSExpression(depth+1);
    }).join("");
}

function codesToHaskell (codes, depth) {
    var lead = pad(depth, '    ');
    if (codes === undefined)
        return "";
    return Object.keys(codes).map(function (k) {
        return "\n" + lead + codes[k].toHaskell(depth+1);
    }).join("");
}

function origText () {
    if (this._pos && "origText" in this._pos)
        return this._pos.origText();
    else
        return this.toString();
}

RDF = {
    message: function (str) {
        //console.error(str);
    },

    actionCategory: {
        DATA: "acquiring data",
        SCHEMA: "processing schema",
        ACTION: "executing action",
        VALIDATION: "validating"
    },
    StructuredError_proto: {
    },
    StructuredError: function (data) {
        var ret = {
            _: "StructuredError",
            data: data,
            toString: function () {
                function nest (a) {
                    return a.map(function (p) {
                        return p[0] == "code" ?
                        "\""+p[1]+"\"" :
                            p[0] == "link" ?
                            "<"+p[1]+"> {\n"+nest(p[2]).replace(new RegExp("^","gm"),"  ")+"\n}" :
                                p[0] == "SyntaxError" ?
                                p[1].column+"."+p[1].line+"("+p[1].offset+"):"+p[1].toString()+" See [[["+p[2].substr(p[1].offset - 20, 40)+"]]]":
                                    p[0] == "NestedError" ?
                                    "[[["+p[1]+"]]]":
                                        p[0] == "actionCategory" ?
                                        "while "+p[1]+":\n":
                                            p[1];
                    }).join("\n");
                };
                return nest(this.data);
            }
        };
        Object.keys(RDF.StructuredError_proto).map(function (k) {
            ret[k] = RDF.StructuredError_proto[k];
        });
        return ret;
    },

    /* <Exceptions>
     */
    // SPARQL validation queries can't expression recursive grammars.
    ValidationRecursion: function (label) {
        this._ = 'ValidationRecursion'; this.label = label;
    },

    UnknownRule: function (label) {
        this._ = 'UnknownRule'; this.label = label;
        this.toString = function () {
            return "Rule " + this.label.toString() + " not found in schema.";
        };
    },
    /* </Exceptions>
     */

    createIRIResolver: function() {
        return {
            errorHandler: function (message) { throw message; },

            // make a copy, usually to have a new prefix map. e.g.
            //   var prefixes = r.schemaIRIResolver.clone().Prefixes;
            //   prefixes['se'] = "http://www.w3.org/2013/ShEx/Definition#";
            clone: function () {
                var ret = { Prefixes:{} };
                for (var p in this)
                    if (p != 'Prefixes')
                        ret[p]=this[p];
                for (p in this.Prefixes)
                    ret.Prefixes[p]=this.Prefixes[p];
                return ret;
            },

            Base: '',
            setBase: function (base) {
                this.Base = base;
            },
            getBase: function (base) {
                return this.Base;
            },

            Prefixes: {},
            setPrefix: function (pre, i) {
                this.Prefixes[pre] = i;
            },
            getPrefix: function (pre) {
                // unescapeReserved
                var nspace = this.Prefixes[pre];
                if (nspace === undefined) {
                    this.errorHandler("unknown namespace prefix: " + pre);
                    // throw("unknown namespace prefix: " + pre);
                    RDF.message("unknown namespace prefix: " + pre);
                    nspace = '<!' + pre + '!>';
                }
                return nspace;
            },

            getAbsoluteIRI: function (rel) {
                var relProtHostPath  = /^(?:([a-z]+:)?(\/\/[^\/]+))?(.*?)$/.exec(rel);
                var baseProtHostPath = /^(?:([a-z]+:)?(\/\/[^\/]+))?(.*?)[^\/]*$/.exec(this.getBase());
                var prot = relProtHostPath[1] || baseProtHostPath[1] || "";
                var host = relProtHostPath[2] || baseProtHostPath[2] || "";
                var path = relProtHostPath[3].charAt() === '/' ? relProtHostPath[3] : baseProtHostPath[3] + relProtHostPath[3];
                path = path.replace(/\/(\.\/)*/g, '/');
                path = path.replace(/\/\/+/g, '/');
                var startAt = path.match(/^(\/\.\.)*/g)[0].length;
                var prepend = path.substr(0,startAt);
                path = path.substr(startAt);
                while (path.match(/\/\.\./)) {
                    path = path.match(/\/\.\.$/) ?
                        path.replace(/\/([^\/]*?)\/\.\.$/, '') :
                        path.replace(/\/([^\/]*?)\/\.\.\//, '/');
                    startAt = path.match(/^(\/\.\.)*/g)[0].length;
                    prepend += path.substr(0,startAt);
                    path = path.substr(startAt);
                }
                if ((prot || host) && !path)
                    path = "/";
                return prot + host + prepend + path;
            }
        };
    },

    createBNodeScope: function() {
        return {
            NextBNode: 0,
            nextLabel: function () {
                return ''+this.NextBNode++; // needs mutex
            },
            uniqueLabel: function (proposed) {
                return proposed; // @@ check against allocated.
            }
        };
    },

    DISPOSITION: {
        PASS :      {value: 1, name: "pass"      },
        FAIL:       {value: 3, name: "fail"      },
        NONE:       {value: 0, name: "empty"     },
        ZERO:       {value: 2, name: "indefinite"},
        EXOR :      {value: 1, name: "error"     }
    },

    SPARQLprefixes: function (prefixes) {
        var ret = '';
        var keys = Object.keys(prefixes);
        keys.sort();
        for (var i in keys)
            ret += "PREFIX " + keys[i] + ":<" + prefixes[keys[i]] + ">\n";
        return ret;
    },

    decodeUCHAR: function (el) {
        if (el.length === 1) return el;
        var code;
        if (el.length==9)
            code = parseInt(el.slice(1,9).join(''), 16);
        if (el.length==5)
            code = parseInt(el.slice(1,5).join(''), 16);
        if (code<0x10000) { // RDFa.1.2.0.js:2712
            return String.fromCharCode(code);
        } else {
            // Evil: generate surrogate pairs
            var n = code - 0x10000;
            var h = n >> 10;
            var l = n & 0x3ff;
            return String.fromCharCode(h + 0xd800) + String.fromCharCode(l + 0xdc00);
        }
    },

    // Three kinds of position. Not needed in the long run, but useful for recording what's expected.
    Position5: function (_orig, line, column, offset, width) {
        // if (Math.abs(_orig.length - width) > 1)
        //     RDF.message(new Error("'"+_orig+"'.length = "+_orig.length+" != "+width));
        return { _orig:_orig, line:line, column:column, offset:offset, width:width,
            origText: function () { return this._orig; }
        };
    },
    Position2: function (line, column) {
        return { line: line, column: column };
    },
    Position0: function () {
        return {  };
    },

    // Turtle types
    IRI: function (lexP, _posP) {
        return {
            _: 'IRI',
            lex: lexP,
            _pos: _posP,
            id: undefined,
            toString: function (orig) {
                if (orig && this._pos && "origText" in this._pos) return this._pos.origText();
                return '<' + this.lex + '>';
            },
            assignId: function (charmap, idP) {
                if (this.id === undefined) {
                    this.id = idP;
                    charmap.insertBefore(this._pos.offset, "<span id='"+idP+"' class='IRI'>", 0);
                    charmap.insertAfter(this._pos.offset+this._pos.width, "</span>", 0);
                }
                return this.id;
            }
        };
    },
    RDFLiteral: function (lexP, langtagP, datatypeP, _posP) {
        return {
            _: 'RDFLiteral',
            lex: lexP,
            langtag: langtagP,
            datatype: datatypeP,
            _pos: _posP,
            id: undefined,
            toString: function (orig) {
                if (orig && this._pos && "origText" in this._pos) return this._pos.origText();
                var ret = '"' + this.lex + '"';
                if (this.langtag !== undefined)
                    ret += '@' + this.langtag.toString();
                if (this.datatype !== undefined)
                    ret += '^^' + this.datatype.toString();
                return ret;
            },
            assignId: function (charmap, id) {
                if (this.id === undefined) {
                    this.id = id;

                    // Adding the markup for the lexical form before the datatype or
                    // langtag takes advantage of the insert order and renders an
                    // irrelevent datatype tag for native types (integer, decimal,
                    // real).
                    charmap.insertBefore(this._pos.offset, "<span id='"+id+"' class='literal'>", 0);
                    charmap.insertAfter(this._pos.offset+this._pos.width, "</span>", 0); // !! needed to prevent two extra chars getting colored, but why?!
                    // if (this.langtag !== undefined)
                    //     this.langtag.assignId(charmap, id);
                    if (this.datatype !== undefined)
                        this.datatype.assignId(charmap, id);
                    if (this.langtag !== undefined)
                        this.langtag.assignId(charmap, id);
                }
                return this.id;
            }
        };
    },
    LangTag: function (lexP, _posP) {
        return {
            _: 'LangTag',
            lex: lexP,
            _pos: _posP,
            id: undefined,
            toString: function () {
                return this.lex;
            },
            assignId: function (charmap, id) {
                if (this.id === undefined) {
                    this.id = id;
                    charmap.insertBefore(this._pos.offset, "<span id='"+id+"' class='langtag'>", 0);
                    charmap.insertAfter(this._pos.offset+this._pos.width, "</span>", 0);
                }
                return this.id;
            }
        };
    },
    BNode: function (lexP, _posP) {
        return {
            _: 'BNode',
            lex: lexP,
            _pos: _posP,
            id: undefined,
            toString: function (orig) {
                if (orig && this._pos && "origText" in this._pos) {
                    var ret = this._pos.origText();
                    if (ret[0] != '\u005b' && ret[0] != '\u0028') // !open square bracket && !open paren
                        return orig;
                }
                return '_:' + this.lex;
            },
            assignId: function (charmap, id) {
                if (this.id === undefined) {
                    this.id = id;
                    charmap.insertBefore(this._pos.offset, "<span id='"+id+"' class='bnode'>", 0);
                    charmap.insertAfter(this._pos.offset+this._pos.width, "</span>", 0);
                }
                return this.id;
            }
        };
    },

    Triple: function (sP, pP, oP) {
        var ret = {
            _: 'Triple',
            s: sP,
            p: pP,
            o: oP,
            toString: function (orig) {
                return this.s.toString(orig) + ' ' + this.p.toString(orig) + ' ' + this.o.toString(orig) + '.';
            },
            desparateToString: function () {
                var ss;
                function str (t) {
                    var ret;
                    try {ret = t.toString();}
                    catch (e) {ret = JSON.stringify(t);}
                    return ret;
                }
                return str(this.s) + ' ' + str(this.p) + ' ' + str(this.s) + '.';
            },
            colorize: function (charmap, idMap, termStringToIds) {
                var tripleId = "t"+idMap.add(this.toString());
                // Assignid permits only one XML ID for a given term *rendering*.
                idMap.addMember(this.s.assignId(charmap, tripleId+"_s"));
                termStringToIds.add(this.s.toString(true), tripleId+"_s");
                idMap.addMember(this.p.assignId(charmap, tripleId+"_p"));
                termStringToIds.add(this.p.toString(true), tripleId+"_p");
                idMap.addMember(this.o.assignId(charmap, tripleId+"_o"));
                termStringToIds.add(this.o.toString(true), tripleId+"_o");
            }
        };
        if (sP === null || sP === undefined || !('_' in sP) ||
            pP === null || pP === undefined || !('_' in pP) ||
            oP === null || oP === undefined || !('_' in oP))
            throw "invalid Triple(" + this.desparateToString() + ")";
        else
            return ret;
    },

    Dataset: function () {
        return {
            // test with RDF.Dataset().test()
            test: function (info, warning, error) {
                info = info || function (s) { console.log("info: "+s); }
                warning = warning || function (s) { console.log("warning: "+s); }
                error = error || function (s) { console.log("error: "+s); }
                var errors = 0;
                var t0 = RDF.Triple(RDF.IRI  ("Bob"), RDF.IRI("http://...foaf/knows"),  RDF.IRI       ("Joe"));
                var t1 = RDF.Triple(RDF.IRI  ("Bob"), RDF.IRI("http://...foaf/knows"),  RDF.BNode     ("sue"));
                var t2 = RDF.Triple(RDF.BNode("Sue"), RDF.IRI("http://...foaf/knows"),  RDF.IRI       ("Bob"));
                var t3 = RDF.Triple(RDF.IRI  ("Bob"), RDF.IRI("http://...foaf/name" ),  RDF.RDFLiteral("Bob"));
                var t4 = RDF.Triple(RDF.IRI  ("Bob"), RDF.IRI("http://...foaf/name" ),  RDF.RDFLiteral("Rob"));

                var ds = RDF.Dataset();
                ds.unordered();
                ds.push(t0);ds.push(t1);ds.push(t2);ds.push(t3);ds.push(t4); info(ds.toString());
                info("- " + t1.toString()); ds.retract(t1); info(ds.toString());
                info("- " + t4.toString()); ds.retract(t4); info(ds.toString());
                info("- " + t3.toString()); ds.retract(t3); info(ds.toString());
                info("- " + t2.toString()); ds.retract(t2); info(ds.toString());
                info("- " + t0.toString()); ds.retract(t0); info(ds.toString());
                try {
                    info("- " + t2.toString()); ds.retract(t2); info(ds.toString());
                    error("expected to fail removal of t2.");
                    ++errors;
                } catch (e) {
                    // expected path
                }
                return errors;
            },
            _: 'Dataset',
            /* triples is a simple array of Triple objects, here abbreviated {str:"s p o"}:
             [{str:"<Bob> <foaf:knows> <Joe>"},
             {str:"<Bob> <foaf:knows> _:sue"},
             {str:"_:Sue <foaf:knows> <Bob>"},
             {str:"<Bob> <foaf:name>  'Bob'"},
             {str:"<Bob> <foaf:name>  'Rob'"}]
             */
            triples: [],
            comments: [],
            /* SPO is an index of the form:
             { "<Bob>": { "<foaf:name>" :  { "'Bob'": [{str:"<Bob> <foaf:name>  'Bob'"}, 3],
             "'Rob'": [{str:"<Bob> <foaf:name>  'Rob'"}, 4]},
             "<foaf:knows>":  { "<Joe>": [{str:"<Bob> <foaf:knows> <Joe>"}, 0],
             "_:sue": [{str:"<Bob> <foaf:knows> _:sue"}, 1]} },
             "_:Sue": { "<foaf:knows>": { "<Bob>": [{str:"_:Sue <foaf:knows> <Bob>"}, 2]} } }
             */
            SPO: {},
            indexEntries: [],
            unordered: function () {
                this.triples = null;
            },
            clear: function () {
                this.triples = [];
                this.comments = [];
                this.SPO = {};
                this.indexEntries = [];
            },
            triplesMatching: function (s, p, o, validatorStuff) {
                var ret = [];
                var sStr = s ? s.toString() : '', pStr = p ? p.toString() : '', oStr = o ? o.toString() : '';
                function os (O) {
                    if (o) {
                        if (oStr in O) {
                            ret.push(O[oStr][0]);
                        }
                    } else {
                        for (var oi in O) {
                            ret.push(O[oi][0]);
                        }
                    }
                }
                function ps (PO) {
                    if (p) {
                        if (pStr in PO) {
                            os(PO[pStr]);
                        }
                    } else {
                        for (var pi in PO) {
                            os(PO[pi]);
                        }
                    }
                }
                function ss (SPO) {
                    if (s) {
                        if (sStr in SPO) {
                            ps(SPO[sStr]);
                        }
                    } else {
                        for (var si in SPO) {
                            ps(SPO[si]);
                        }
                    }
                }
                ss(this.SPO);
                return validatorStuff && validatorStuff.async ? Promise.resolve(ret) : ret;
            },
            triplesMatching_str: function (s, p, o) {
                var ret = [];
                for (var i = 0; i < this.triples.length; ++i) {
                    var t = this.triples[i];
                    if ((s === null || s === undefined || s === t.s.toString()) &&
                        (p === null || p === undefined || p === t.p.toString()) &&
                        (o === null || o === undefined || o === t.o.toString()))
                        ret.push(t);
                }
                return ret;
            },
            length: function () {
                return this.triples === null ? -1 : this.triples.length;
            },
            uniqueSubjects: function () {
                var _Dataset = this;
                return Object.keys(this.SPO).map(function (s) {
                    // Dive in and grab triple.s for first p and o.
                    var p = Object.keys(_Dataset.SPO[s])[0];
                    var o = Object.keys(_Dataset.SPO[s][p])[0];
                    return _Dataset.SPO[s][p][o][0].s;
                });
            },
            slice: function (from, length) {
                if (this.triples === null)
                    throw "Dataset.slice not available in unordered mode.";
                return this.triples.slice(from, length);
            },
            clone: function () {
                var ret = RDF.Dataset();
                for (si in this.SPO) {
                    ret.SPO[si] = {};
                    for (pi in this.SPO[si]) {
                        ret.SPO[si][pi] = {};
                        for (oi in this.SPO[si][pi]) {
                            ret.SPO[si][pi][oi] = [ret.SPO[si][pi][oi][0], ret.SPO[si][pi][oi][1]];
                        }
                    }
                }
                if (this.triples !== null)
                    ret.triples = this.triples.slice();
                return ret;
            },
            splice: function (from, length) {
                if (this.triples === null)
                    throw "Dataset.splice not available in unordered mode.";
                return this.triples.splice(from, length);
            },
            index: function (t, at) {
                var sStr = t.s.toString(), pStr = t.p.toString(), oStr = t.o.toString();
                if (!(sStr in this.SPO))
                    this.SPO[sStr] = {};
                var PO = this.SPO[sStr];
                if (!(pStr in PO))
                    PO[pStr] = {};
                var O = PO[pStr];
                var entry = [t, at];
                if (this.triples) { // not in unordered mode
                    var len = this.indexEntries.length;
                    if (at < len)
                        for (var i = at; i < len; ++i) {
                            this.indexEntries[i+1] = this.indexEntries[i];
                            this.indexEntries[i+1][1] = i+1;
                        }
                }
                O[oStr] = entry;
            },
            push: function (t) {
                if (this.triplesMatching(t.s, t.p, t.o).length === 0) {
                    if (this.triples !== null) {
                        this.triples.push(t);
                        this.index(t, this.triples.length);
                    } else {
                        this.index(t, -1);
                    }
                }
            },
            insertAt: function (offset, t) {
                if (this.triples === null)
                    throw "Dataset.insertAt not available in unordered mode.";
                if (this.triplesMatching(t.s, t.p, t.o).length === 0) {
                    this.triples.splice(offset, 0, t);
                    this.index(t, offset);
                }
            },
            retract: function (t) {
                var sStr = t.s ? t.s.toString() : '';
                var pStr = t.p ? t.p.toString() : '';
                var oStr = t.o ? t.o.toString() : '';
                function os (O) {
                    if (t.o) {
                        if (!(oStr in O))
                            throw "object not found: " + t.toString();
                        delete O[oStr];
                    } else {
                        for (var oi in O)
                            delete(O[oi]);
                    }
                    return Object.keys(O).length == 0;
                }
                function ps (PO) {
                    if (t.p) {
                        if (!(pStr in PO))
                            throw "predicate not found: " + t.toString();
                        if (os(PO[pStr]))
                            delete PO[pStr];
                    } else {
                        for (var pi in PO)
                            if (os(PO[pi]))
                                delete PO[pi];
                    }
                    return Object.keys(PO).length == 0
                }
                function ss (SPO) {
                    if (t.s) {
                        if (!(sStr in SPO))
                            throw "subject not found: " + t.toString();
                        if (ps(SPO[sStr]))
                            delete SPO[sStr];
                    } else {
                        for (var si in SPO)
                            if (ps(SPO[si]))
                                delete SPO[si];
                    }
                }
                ss(this.SPO);
            },
            addComment: function (c) {
                this.comments.push(c);
            },

            toString: function () {
                if (this.triples === null) {
                    var ret = [];
                    for (si in this.SPO)
                        for (pi in this.SPO[si])
                            for (oi in this.SPO[si][pi])
                                ret.push(this.SPO[si][pi][oi][0].toString());
                    return ret.join("\n");
                } else
                    return this.triples.map(function (t) { return t.toString(); }).join("\n");
            },
            colorize: function (charmap) {
                var idMap = IntStringMap();
                var termStringToIds = StringIdMap();
                if (this.triples === null)
                    for (si in this.SPO)
                        for (pi in this.SPO[si])
                            for (oi in this.SPO[si][pi])
                                this.SPO[si][pi][oi][0].colorize(charmap, idMap, termStringToIds);
                else
                    for (var iTriple = 0; iTriple < this.triples.length; ++iTriple)
                        this.triples[iTriple].colorize(charmap, idMap, termStringToIds);
                var commentId = "tc";
                //this.label.assignId(charmap, ruleId+"_s"); // @@ could idMap.addMember(...), but result is more noisy
                for (var iComment = 0; iComment < this.comments.length; ++iComment) {
                    var comment = this.comments[iComment];
                    charmap.insertBefore(comment._pos.offset, "<span id='"+commentId+"_"+iComment+"' class='comment'>", 0);
                    charmap.insertAfter(comment._pos.offset+comment._pos.width, "</span>", 0);
                }
                return {idMap:idMap, termStringToIds:termStringToIds};
            }
        };
    },

    makeSPARQLInterface: function (url, constructorParms) {
        var separator = url.match(/\?/) ? ';' : '?';
        var defaultParms = $.extend({
            type: 'GET',
            dataType: "text"
            //contentType: 'text/plain',{turtle,shex}
        }, constructorParms);
        var lastQuery = null;
        var lastURL = null;
        var done = function () {};
        var fail = function (jqXHR, textStatus, errorThrown) {
            throw "unable to query " + url + "\n" + textStatus + "\n" + errorThrown;
        };
        var always = function () {};
        return {
            execute: function (query, parms) {
                lastQuery = query;
                if ("done" in parms) { // suck in old-style controls -- needed for synchronous execution.
                    this.done(parms.done); // set the new done
                    delete parms.done;
                }
                var merge = $.extend({
                    url: url + separator + "query=" + encodeURIComponent(query)
                }, parms);
                lastURL = merge.url;

                function handler (body, textStatus, jqXHR, resolve, reject) {
                    if (jqXHR.status === 200) {
                        // Crappy mime parser doesn't handle quoted-string
                        //  c.f. http://tools.ietf.org/html/rfc7230#section-3.2.6
                        var ray = jqXHR.getResponseHeader("content-type").split(/;/)
                            .map(function (s) { return s.replace(/ /g,''); });
                        try {
                            var r = RDF.parseSPARQLResults(body, ray.shift(), ray);
                            if (parms.async)
                                resolve(r);
                            else
                                done(r);
                        } catch (e) {
                            debugger;
                            if (parms.async)
                                reject([body, e, query]);
                            else
                                fail([body, e, query]);
                        }
                    } else {
                        if (parms.async)
                            reject([body, jqXHR, query]);
                        else
                            fail([body, jqXHR, query]);
                    }
                }

                if (parms.async) {
                    return new Promise(function (resolve, reject) {
                        $.ajax(merge).then(function (body, textStatus, jqXHR) {
                            handler(body, textStatus, jqXHR, resolve, reject);
                        }).fail(function (jqXHR, textStatus, errorThrown) {
                            jqXHR.statusText = "connection or CORS failure";
                            reject(["", jqXHR, query, lastURL]);
                        });
                    });
                } else {
                    $.ajax(merge).done(handler).fail(function (jqXHR, textStatus, errorThrown) {
                        jqXHR.statusText = "connection or CORS failure";
                        fail(["", jqXHR, query, lastURL]);
                    });
                    return this;
                }
            },
            getURL: function () { return url; },
            getLastQuery: function () { return lastQuery; },
            getLastURL: function () { return lastURL; },
            done: function (newDone) { done = newDone; return this; },
            fail: function (newFail) { fail = newFail; return this; },
            always: function (newAlways) { always = newAlways; return this; }
        };
    },

    // parseSPARQLResults("<...>"|"{...}", "application/sparql-results+json"|"xml", ["charset=UTF-8"])
    //   parameters is ignored.
    // returns:
    //   {"vars":["s"],"solutions":[{"s":{"_":"BNode","lex":"b0x3631060","_pos":{"line":0,"column":0}}}]}
    parseSPARQLResults: function (body, mediaType, parameters) {
        var ret = { vars: [], solutions: [] };
        if (mediaType === "application/sparql-results+xml") {
            var xml = $(body instanceof XMLDocument ? body : $.parseXML(body));
            return {
                vars: xml.children("sparql").children("head").children("variable").get().map(function (obj) {
                    return obj.getAttribute("name");
                }),
                solutions: xml.children("sparql").children("results").children("result").get().map(function (result, solnNo) {
                    var ret = {};
                    $(result).find("> binding").get().map(function (binding, bindNo) {
                        var varName = binding.getAttribute("name");
                        var elt = binding.children[0];
                        var content = elt.textContent;
                        var pos = RDF.Position2(solnNo, bindNo);
                        if (elt.localName === "bnode") {
                            ret[varName] = RDF.BNode(content, pos);
                        } else if (elt.localName === "uri") {
                            ret[varName] = RDF.IRI(content, pos);
                        } else if (elt.localName === "literal") {
                            var langTag = elt.getAttribute("xml:lang");
                            var datatype = elt.getAttribute("datatype");
                            if (datatype !== null)
                                datatype = RDF.IRI(datatype, pos);
                            ret[varName] = RDF.RDFLiteral(content, langTag, datatype, pos);
                        } else {
                            "unknown node type: \"" + elt.localName + "\"";
                        }
                    });
                    return ret;
                })
            };
        } else if (mediaType === "application/sparql-results+json") {
            var x = $(typeof body === "object" ? body : jQuery.parseJSON(body));
            return {
                vars: x.head.vars,
                solutions: x.results.bindings.map(function (result, solnNo) {
                    var ret = {};
                    var bindNo = 0;
                    for (var varName in result) {
                        var binding = result[varName];
                        var pos = RDF.Position2(solnNo, bindNo++);
                        if (binding.type === "bnode") {
                            ret[varName] = RDF.BNode(binding.value, pos);
                        } else if (binding.type === "uri") {
                            ret[varName] = RDF.IRI(binding.value, pos);
                        } else if (binding.type === "literal") {
                            var langTag = null;
                            if ("xml:lang" in binding)
                                langTag = binding["xml:lang"];
                            var datatype = null;
                            if ("datatype" in binding)
                                datatype = RDF.IRI(binding.datatype, pos);
                            ret[varName] = RDF.RDFLiteral(binding.value, langTag, datatype, pos);
                        } else {
                            "unknown node type: \"" + binding.type + "\"";
                        }
                    }
                    return ret;
                })
            };
        } else if (mediaType === "text/turtle") {
            var queryIriResolver = RDF.createIRIResolver();
            return {obj: TurtleParser.parse(body, {iriResolver: queryIriResolver}),
                iriResolver: queryIriResolver};
        } else {
            throw "no parser for media type \"" + mediaType + "\"";
        }
    },

    QueryDB: function (sparqlInterface, slaveDB, cacheSize) {
        slaveDB.unordered();
        return {
            _: 'QueryDB',
            sparqlInterface: sparqlInterface,
            slaveDB: slaveDB,
            cacheSize: cacheSize,
            queryStack: [],
            _seen: 0,
            LRU: [], // The Least Recently Used subject is at LRU[0].
            nodes: [],
            clearCache: function () {
                this.slaveDB.clear();
                this.LRU = [];
                this.nodes = [];
            },
            triplesMatching: function (s, p, o, validatorStuff) {
                var _queryDB = this;
                var cacheSubject = (s && p && !o && cacheSize != 0);
                var sStr = s.toString();
                var cachedAt = cacheSubject ? this.LRU.indexOf(sStr) : -1;
                function errorWrapper (rejection) {
                    var body = rejection[0], e = rejection[1], query = rejection[2];
                    debugger;
                    var message =
                        [["actionCategory", RDF.actionCategory.DATA],
                            ["text", "failed to "],
                            ['link', _queryDB.sparqlInterface.getLastURL(),
                                [["text", e.constructor.name === "SyntaxError" ? "parse" : "GET"]]],
                            ["code", query],
                            ["text", " from " + _queryDB.sparqlInterface.getURL()]
                        ];
                    if (e.constructor.name === "SyntaxError")
                        message.push(["SyntaxError", e, body]);
                    throw RDF.StructuredError(message);
                }
                if (cachedAt != -1) {
                    // We've already cached this subject in slaveDB. Push to top of LRU.
                    this.LRU.splice(cachedAt,1);
                    this.LRU.push(sStr);
                    var node = this.nodes.splice(cachedAt,1)[0];
                    this.nodes.push(node);
                    function askSlave () {
                        return _queryDB.slaveDB.triplesMatching(s, p, o, validatorStuff);
                    }
                    try {
                        return validatorStuff.async ?
                            node[1].then(askSlave).catch(errorWrapper) :
                            askSlave();
                    } catch (e) {
                        errorWrapper(e);
                    }
                } else {
                    var context = '';
                    if (s._ === "BNode") {
                        var t = validatorStuff.pointStack; // for readability
                        for (var i = t.length-1; i && t[i][1]._ === "BNode"; --i) {
                            context +=
                                (t[i-1][1]._ === "IRI" ? t[i-1][1].toString() : ("?s"+i))+
                                " "+t[i][0].toString()+
                                " ?s"+(i-1)+" .\n";
                        }
                    }
                    var pattern = "CONSTRUCT WHERE {" + context +
                        " " + (s ? (s._ === "BNode" ? "?s0" : sStr) : "?s") +
                        " " + (!cacheSubject && p ? p.toString() : "?p") +
                        " " + (o ? o.toString() : "?o") +
                        " }";
                    // console.log(pattern);
                    var results;
                    var p1 = this.sparqlInterface.execute(pattern, {async: validatorStuff.async, done: function (r) {
                        results = r;
                    }});
                    var p2 = null;

                    // gave up separating the sync from the async -- too hard.
                    if (validatorStuff.async) {
                        p2 = p1.then(function (results) {
                            var ret = results.obj.slice();
                            _queryDB._seen += ret.length;
                            if (cacheSubject) {
                                ret.forEach(function (t) { _queryDB.slaveDB.push(t); });
                                return _queryDB.slaveDB.triplesMatching(s, p, o, validatorStuff);
                            } else {
                                return ret;
                            }
                        }).catch(errorWrapper);
                        if (cacheSubject) {
                            this.LRU.push(sStr);
                            this.nodes.push([s, p1]);
                            if (this.LRU.length > this.cacheSize) {
                                // Shift from the bottom of LRU.
                                this.LRU.shift();
                                var node = this.nodes.shift()[0];
                                p2 = p2.then(function (res) {
                                    // Queue removal from slave DB.
                                    _queryDB.slaveDB.retract({s:node, p:null, o:null});
                                    return res;
                                });
                            }
                        }
                    } else {
                        try {
                            var ret = results.obj.slice();
                            _queryDB._seen += ret.length;
                            if (cacheSubject) {
                                ret.forEach(function (t) { _queryDB.slaveDB.push(t); });
                                p2 = _queryDB.slaveDB.triplesMatching(s, p, o);
                            } else {
                                p2 = ret;
                            }
                        } catch(e) { errorWrapper(e); }
                        if (cacheSubject) {
                            this.LRU.push(sStr);
                            this.nodes.push(s);
                            if (this.LRU.length > this.cacheSize) {
                                // Shift from the bottom of LRU.
                                this.LRU.shift();
                                var node = this.nodes.shift();
                                _queryDB.slaveDB.retract({s:node, p:null, o:null});
                            }
                        }
                    }
                    return p2;
                }
            },
            triplesMatching_str: function (s, p, o) {
                throw "QueryDB.triplesMatching_str not implemented";
            },
            length: function () {
                return -1; // unknown
            },
            uniqueSubjects: function () {
                throw "QueryDB.uniqueSubjects not implemented";
            },
            slice: function (from, length) {
                throw "QueryDB.slice not implemented";
            },
            clone: function () {
                throw "QueryDB.clone not implemented";
            },
            splice: function (from, length) {
                throw "QueryDB.splice not implemented";
            },
            index: function (t, at) {
                throw "QueryDB.index not implemented";
            },
            push: function (t) {
                throw "QueryDB.push not implemented";
            },
            insertAt: function (offset, t) {
                throw "QueryDB.insertAt not implemented";
            },
            addComment: function (c) {
                throw "QueryDB.addComment not implemented";
            },

            toString: function () {
                throw "QueryDB.toString not implemented";
            },
            colorize: function (charmap) {
                throw "QueryDB.colorize not implemented";
            },

            seen: function () {
                return this._seen;
            }
        };
    },

    //
    // Schema-related stuff
    //

    // ShEx types
    Code: function (label, code, _pos) {
        this._ = 'Code'; this.label = label; this.code = code; this._pos = _pos;
        this.toString = function () {
            return '%' + this.label + '{' + this.code + '%}';
        };
        this.toResourceShapes = function (db, prefixes, sePrefix, rsPrefix, depth) {
            var lead = pad(depth, '    ');
            var seFix = lead + sePrefix + ":";
            var rsFix = lead + rsPrefix + ":";
            return seFix + "extension [\n" +
                "    " + seFix + "label \"" + this.label + "\" ;\n" +
                "    " + seFix + "action \"\"\"" + this.code + "\"\"\"\n" +
                lead + "] ;\n";
        };
        this.toSExpression = function (depth) {
            return "(code \""+this.label+"\" \""+this.code+"\")";
        };
        this.toHaskell = function (depth) {
            return "(code \""+this.label+"\" \""+this.code+"\")";
        };
    },

    Comment: function (comment, _pos) {
        this._ = 'Comment'; this.comment = comment; this._pos = _pos;
        this.toString = function () {
            return '#' + this.comment;
        };
    },


    NameTerm: function (term, _pos) {
        this._ = 'NameTerm'; this.term = term; this._pos = _pos;
        this.toString = function (orig) {
            return this.term.toString(orig);
        };
        this.match = function (t2) {
            return t2.toString() == this.term.toString();
        };
        this.SPARQLpredicate = function (prefixes) { // @@ simplify later
            return defix(this.term, prefixes);
        };
        this.SPARQLpredicateTest = function (prefixes) {
            return "true";
        };
        this.toResourceShapes = function (db, prefixes, sePrefix, rsPrefix, depth) {
            var lead = pad(depth, '    ');
            var seFix = lead + sePrefix + ":";
            var rsFix = lead + rsPrefix + ":";
            var t = defix(this.term, prefixes);
            return rsFix + "name \"" + t.substr(t.indexOf(':')+1) + "\" ;\n" +
                rsFix + "propertyDefinition " + this.SPARQLpredicate(prefixes) + " ;\n";
        };
        this.toSExpression = function (depth) {
            return "(NameTerm "+this.term.toString()+")";
        };
        this.toHaskell = function (depth) {
            return "(NameTerm "+this.term.toString()+")";
        };
    },
    NameWild: function (exclusions, _pos) {
        this._ = 'NameWild'; this.exclusions = exclusions; this._pos = _pos;
        this.toString = function (orig) {
            var ret = '.';
            ret += this.exclusions.map(function (ex) { return ' - ' + ex.toString(orig); }).join('');
            return ret;
        };
        this.match = function (t2) {
            for (var i = 0; i < this.exclusions.length; ++i)
                if (this.exclusions[i].lex === t2.lex)
                    return false;
            return true;
        };
        this.SPARQLpredicate = function (prefixes) { // @@ simplify later
            return "?p";
        };
        this.SPARQLpredicateTest = function (prefixes) {
            return "true"; // defix(this.term, prefixes)
        };
        this.toResourceShapes = function (db, prefixes, sePrefix, rsPrefix, depth) {
            if (exclusions.length)
                return "# expressing NameWild with exclusions " + this.toString() + " will require some fancy POWDER.";
            return '';
        };
        this.toSExpression = function (depth) {
            return "(NameWild "+(this.exclusions.map(function(ex){return ex.toString();}).join(' '))+")";
        };
        this.toHaskell = function (depth) {
            return "(NameWild "+(this.exclusions.map(function(ex){return ex.toString();}).join(' '))+")";
        };
    },
    NamePattern: function (term, exclusions) {
        this._ = 'NamePattern'; this.term = term; this.exclusions = exclusions;
        this.toString = function (orig) {
            return this.term.toString(orig) + '~' + this.exclusions.map(function (ex) { return ' - ' + ex.toString(orig); }).join('');
        };
        this.match = function (t2) {
            var ts = this.term.lex;
            if (ts != t2.lex.substr(0, ts.length))
                return false;
            for (var i = 0; i < this.exclusions.length; ++i)
                if (this.exclusions[i].lex === t2.lex)
                    return false;
            return true;
        };
        this.SPARQLpredicate = function (prefixes) { // @@ simplify later
            return "?p";
        };
        this.SPARQLpredicateTest = function (prefixes) {
            return "true"; // defix(this.term, prefixes)
        };
        this.toResourceShapes = function (db, prefixes, sePrefix, rsPrefix, depth) {
            var lead = pad(depth, '    ');
            var seFix = lead + sePrefix + ":";
            var rsFix = lead + rsPrefix + ":";
            var t = defix(this.term, prefixes);
            return seFix + "name \"" + t.substr(0, t.indexOf(':')) + ":*\" ;\n" +
                seFix + "propertyStem " + this.SPARQLpredicate(prefixes) + " ;\n";
        };
        this.toSExpression = function (depth) {
            return "(NamePattern "+this.term.toString()+")";
        };
        this.toHaskell = function (depth) {
            return "(NamePattern "+this.term.toString()+")";
        };
    },

    QueryClause: function (counter, sparql) {
        this._ = 'QueryClause'; this.counter = counter; this.min = undefined; this.max = undefined; this.sparql = sparql;
        this.prepend = function (str) {
            this.sparql = str + this.sparql;
            return this;
        };
        this.append = function (str) {
            this.sparql += str;
            return this;
        };
    },

    /** beautify and potentially eliminated FILTERs
     */
    filterConjunction: function (conjoints) {
        while (conjoints.indexOf("true") != -1)
            conjoints.splice(conjoints.indexOf("true"), 1);
        if (conjoints.length !== 0)
            return " FILTER (" + conjoints.join(" && ") + ")";
        else
            return '';
    },

    /*
     needCounter: either we in are an optional group or we're testing a ValueReference
     card: undefined if we can't test cardinality (i.e. we're in a group) or {min:Int, max:Int}
     */
    arcCount: function (schema, label, prefixes, depth, counters, needCounter, predicate, predicateTest, object, objectTest, card, code) {
        var lead = pad(depth, '    ');
        var countSelect = '';
        var counter = undefined;
        var codeStr = code ? "\n" + lead + ' ' + code.code.replace('?s', '?' + label.lex) : '';
        if (needCounter) {
            counter = counters.incr(label.lex + "_c");
            countSelect = " (COUNT(*) AS " + counter + ")";
        }
        var cardStr = card === undefined ? '' : SPARQLCardinality(card.min, card.max);
        var str = lead +
            "{ SELECT ?" + label.lex + countSelect + " {\n" +
            lead + "  ?" + label.lex + " " +
            predicate + " " + object +
            " ." +
            this.filterConjunction([predicateTest, objectTest]) +
            codeStr + "\n" +
            lead + "} GROUP BY ?" + label.lex +
            cardStr + "}\n";
        return new RDF.QueryClause(counter, str);
    },
    arcTest: function (schema, label, prefixes, depth, counters, needCounter, predicate, predicateTest, object, objectTest, card, code) {
        // var needFilter = needCounter;
        // return this.arcCount(schema, label, prefixes, depth, counters, needFilter, predicate, predicateTest, object, objectTest, card, code);
        var lead = pad(depth, '    ');
        var needFilter = card === undefined || card.min != card.max;

        var byPredicate = this.arcCount(schema, label, prefixes, depth, counters, needCounter || needFilter, predicate, predicateTest, "?o", "true", card, undefined);
        var withObject = this.arcCount(schema, label, prefixes, depth, counters, needFilter, predicate, predicateTest, object, objectTest, card, code);
        byPredicate.append(withObject.sparql);
        if (needFilter)
            byPredicate.append(lead + "FILTER (" + byPredicate.counter + " = " + withObject.counter + ")\n");
        return byPredicate;
    },
    arcDump: function (schema, label, prefixes, depth, variables, predicate, predicateTest, object, objectTest, card, code) {
        var lead = pad(depth, '    ');
        return new RDF.QueryClause(undefined, lead+"?"+label+" "+predicate+" "+object+" .\n");
    },
    arcSelect: function (schema, as, prefixes, depth, counters, predicate, predicateTest, object, objectTest) {
        var lead = pad(depth, '    ');
        var countSelect = '';
        var counter = undefined;
        var str =
            lead + "  { " + as + " " +
            predicate + " " + object +
            " . FILTER (" +
            predicateTest + " && " + objectTest + ") BIND (" + as + " AS ?s) BIND (" + predicate + " AS ?p) }";
        return new RDF.QueryClause(counter, str);
    },

    // @<foo>
    ValueReference: function (label, _pos) {
        this._ = 'ValueReference'; this.label = label; this._pos = _pos;
        this.toString = function (orig, schema) {
            var l = this.label.toString(orig);
            if (schema && this.label._ === 'BNode' && l in schema.ruleMap)
                return "{ " + schema.ruleMap[l].toString(orig) + " }";
            else
                return '@' + l;
        },
            this.validate = function (schema, rule, t, point, db, validatorStuff) {
                var ret = new RDF.ValRes();
                schema.dispatch(0, 'enter', rule.codes, rule, t);
                var nestedValidatorStuff = validatorStuff.push(point, rule.nameClass.term); // !!!! s/rule.nameClass.term/t.p/
                var resOrPromise = schema.validatePoint(point, this.label, db, nestedValidatorStuff, true);
                return validatorStuff.async ? resOrPromise.then(post) : post(resOrPromise);
                function post (r) {
                    schema.dispatch(0, 'exit', rule.codes, rule, r);
                    ret.status = r.status;
                    if (r.passed())
                    { ret.status = r.status; ret.matchedTree(rule, t, r); }
                    else
                    { ret.status = RDF.DISPOSITION.FAIL; ret.error_noMatchTree(rule, t, r); }
                    return ret;
                }
            },
            this.SPARQLobject = function (prefixes) {
                return "?o";
            },
            this.SPARQLobjectTest = function (prefixes) {
                return "(isIRI(?o) || isBlank(?o))";
            },
            this.SPARQLobjectJoin = function (schema, label, prefixes, depth, counters, inOpt, predicate, predicateTest, card, code) {
                inOpt = 1;
                var ret = RDF.arcTest(schema, label, prefixes, depth, counters, inOpt, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes), card, code);
                var lead1 = pad(depth, '    ');
                var lead2 = pad(depth+1, '    ');
                var countSelect = '';
                var counter = undefined;
                if (inOpt) {
                    counter = counters.incr(label.lex + "_c");
                    countSelect = " (COUNT(*) AS " + counter + ")";
                }
                try {

                    ret.append(
                        lead1 + "{ SELECT ?" + label.lex + countSelect + " {\n" +
                        lead2 + "{ SELECT ?" + label.lex + " ?" + this.label.lex + " {\n" +
                        lead2 + "  ?" + label.lex + " " + predicate + " ?" + this.label.lex +
                        " . FILTER (" + predicateTest + " && (isIRI(?" + this.label.lex + ") || isBlank(?" + this.label.lex + ")))\n" +
                        lead2 + "} }\n" +
                        schema.SPARQLvalidation3(this.label, prefixes, depth+1, counters).sparql +
                        lead1 + "} GROUP BY ?" + label.lex + " }\n" +
                        lead1 + "FILTER (" + ret.counter + " = " + counter + ")\n");
                    var o = counters.incr(label.lex + '_' + this.label.lex + "_ref");
                    ret.append(
                        lead1 + "OPTIONAL { ?" + label.lex + " " + predicate + " " + o +
                        " . FILTER (" + predicateTest + " && (isIRI(" + o + ") || isBlank(" + o + "))) }\n");
                } catch (e) {
                    if (typeof(e) === 'object' && e._ === 'ValidationRecursion')
                        RDF.message("avoiding cyclic validation of " + e.label.toString());
                    else
                        throw e;
                }
                return ret;
            },
            this.SPARQLobjectDump = function (schema, label, prefixes, depth, variables, predicate, predicateTest, card, code) {
                var s = label.lex;
                var o = label.lex+"_"+predicate.lex;
                if (!(s in variables)) variables[s] = undefined;
                if (!(o in variables)) variables[o] = undefined;
                var ret = RDF.arcDump(schema, s, prefixes, depth, variables, predicate, predicateTest, o, this.SPARQLobjectTest(prefixes), card, code);
                try {
                    var lead1 = pad(depth, '    ');
                    ret.append(lead1 + schema.SPARQLdataDump3(this.label, o, prefixes, depth+1, variables).sparql);
                } catch (e) {
                    if (typeof(e) === 'object' && e._ === 'ValidationRecursion')
                        RDF.message("avoiding cyclic validation of " + e.label.toString());
                    else
                        throw e;
                }
                return ret;
            },
            this.SPARQLobjectSelect = function (schema, label, as, prefixes, depth, counters, predicate, predicateTest) {
                var ret = RDF.arcSelect(schema, as, prefixes, depth, counters, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes));
                var lead1 = pad(depth, '    ');
                var lead2 = pad(depth+1, '    ');
                try {
                    var nestedLabel = counters.incr(as.substr(1) + '_' + this.label.lex + '_ref'); // !! remove '?'s from incr
                    ret.append( " UNION\n" +
                    lead1 + "  {\n" +
                    lead2 + "{ " + as + " " + predicate + " " + nestedLabel +
                    " . FILTER (" + predicateTest + " && (isIRI(" + nestedLabel + ") || isBlank(" + nestedLabel + "))) }\n" +
                    lead2 + "{\n" +
                    schema.SPARQLremainingTriples3(this.label, nestedLabel, prefixes, depth+1, counters).sparql + "\n" +
                    lead2 + "}\n" +
                    lead1 + "  }");
                } catch (e) {
                    if (typeof(e) === 'object' && e._ === 'ValidationRecursion')
                        RDF.message("avoiding cyclic validation of " + e.label.toString());
                    else
                        throw e;
                }
                return ret;
            },
            this.toResourceShapes = function (db, prefixes, sePrefix, rsPrefix, depth) {
                var lead = pad(depth, '    ');
                var seFix = lead + sePrefix + ":";
                var rsFix = lead + rsPrefix + ":";
                return rsFix + "valueShape " + defix(this.label, prefixes) + " ;\n";
            },
            this.toSExpression = function (depth) {
                return "(ValueRef "+this.label.toString()+")";
            },
            this.toHaskell = function (depth) {
                return "(ValueRef "+this.label.toString()+")";
            };
    },

    // IRI | LITERAL | xsd:integer
    ValueTerm: function (term, _pos) {
        this._ = 'ValueTerm'; this.term = term; this._pos = _pos;
        this.toString = function (orig, schema) {
            return this.term.toString(orig);
        },
            this.validate = function (schema, rule, t, point, db, validatorStuff) {
                var ret = new RDF.ValRes();
                if (point._ == this.term._ && point.lex == this.term.lex) {
                    ret.status = RDF.DISPOSITION.PASS;
                    ret.matched(rule, t);
                } else {
                    ret.status = RDF.DISPOSITION.FAIL;
                    ret.error_noMatch(rule, t);
                }
                return validatorStuff.async ? Promise.resolve(ret) : ret;
            },
            this.SPARQLobject = function (prefixes) {
                return "?o";
            },
            this.SPARQLobjectTest = function (prefixes) {
                var s = this.term.toString();
                if (s == "<http://www.w3.org/2013/ShEx/ns#Literal>") return "isLiteral(?o)";
                if (s == "<http://www.w3.org/2013/ShEx/ns#NonLiteral>") return "(isIRI(?o) || isBlank(?o))";
                if (s == "<http://www.w3.org/2013/ShEx/ns#IRI>") return "isIRI(?o)";
                if (s == "<http://www.w3.org/2013/ShEx/ns#BNode>") return "isBlank(?o)";
                return "(isLiteral(?o) && dataterm(?o) = " + defix(this.term, prefixes) + ")";
            },
            this.SPARQLobjectJoin = function (schema, label, prefixes, depth, counters, inOpt, predicate, predicateTest, card, code) {
                return RDF.arcTest(schema, label, prefixes, depth, counters, inOpt, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes), card, code);
            },
            this.SPARQLobjectDump = function (schema, label, prefixes, depth, variables, predicate, predicateTest, card, code) {
                return RDF.arcDump(schema, label, prefixes, depth, variables, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes), card, code);
            },
            this.SPARQLobjectSelect = function (schema, label, as, prefixes, depth, counters, predicate, predicateTest) {
                return RDF.arcSelect(schema, as, prefixes, depth, counters, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes));
            },
            this.toResourceShapes = function (db, prefixes, sePrefix, rsPrefix, depth) {
                var lead = pad(depth, '    ');
                var seFix = lead + sePrefix + ":";
                var rsFix = lead + rsPrefix + ":";
                return rsFix + "valueTerm " + defix(this.term, prefixes) + " ;\n";
            },
            this.toSExpression = function (depth) {
                return "(ValueTerm "+this.term.toString()+")";
            },
            this.toHaskell = function (depth) {
                return "(ValueTerm "+this.term.toString()+")";
            };
    },

    // IRI | LITERAL | xsd:integer
    ValueType: function (type, _pos) {
        this._ = 'ValueType'; this.type = type; this._pos = _pos;
        this.toString = function (orig, schema) {
            return this.type.toString(orig);
        },
            this.validate = function (schema, rule, t, point, db, validatorStuff) {
                function passIf (b) {
                    if (b) { ret.status = RDF.DISPOSITION.PASS; ret.matched(rule, t); }
                    else { ret.status = RDF.DISPOSITION.FAIL; ret.error_noMatch(rule, t); }
                }
                var ret = new RDF.ValRes();
                if      (this.type.toString() == "<http://www.w3.org/2013/ShEx/ns#Literal>")
                    passIf(point._ == "RDFLiteral");
                else if (this.type.toString() == "<http://www.w3.org/2013/ShEx/ns#IRI>")
                    passIf(point._ == "IRI");
                else if (this.type.toString() == "<http://www.w3.org/2013/ShEx/ns#BNode>")
                    passIf(point._ == "BNode");
                else if (this.type.toString() == "<http://www.w3.org/2013/ShEx/ns#NonLiteral>")
                    passIf(point._ == "BNode" || point._ == "IRI");
                else if (point._ == "RDFLiteral") {
                    if (point.datatype === undefined) {
                        passIf(this.type.toString() == "<http://www.w3.org/2001/XMLSchema#string>");
                    } else {
                        passIf(point.datatype.toString() == this.type.toString());
                    }
                } else { ret.status = RDF.DISPOSITION.FAIL; ret.error_noMatch(rule, t); }
                return validatorStuff.async ? Promise.resolve(ret) : ret;
            },
            this.SPARQLobject = function (prefixes) {
                return "?o";
            },
            this.SPARQLobjectTest = function (prefixes) {
                var s = this.type.toString();
                if (s == "<http://www.w3.org/2013/ShEx/ns#Literal>") return "isLiteral(?o)";
                if (s == "<http://www.w3.org/2013/ShEx/ns#NonLiteral>") return "(isIRI(?o) || isBlank(?o))";
                if (s == "<http://www.w3.org/2013/ShEx/ns#IRI>") return "isIRI(?o)";
                if (s == "<http://www.w3.org/2013/ShEx/ns#BNode>") return "isBlank(?o)";
                return "(isLiteral(?o) && datatype(?o) = " + defix(this.type, prefixes) + ")";
            },
            this.SPARQLobjectJoin = function (schema, label, prefixes, depth, counters, inOpt, predicate, predicateTest, card, code) {
                return RDF.arcTest(schema, label, prefixes, depth, counters, inOpt, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes), card, code);
            },
            this.SPARQLobjectDump = function (schema, label, prefixes, depth, variables, predicate, predicateTest, card, code) {
                return RDF.arcDump(schema, label, prefixes, depth, variables, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes), card, code);
            },
            this.SPARQLobjectSelect = function (schema, label, as, prefixes, depth, counters, predicate, predicateTest) {
                return RDF.arcSelect(schema, as, prefixes, depth, counters, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes));
            },
            this.toResourceShapes = function (db, prefixes, sePrefix, rsPrefix, depth) {
                var lead = pad(depth, '    ');
                var seFix = lead + sePrefix + ":";
                var rsFix = lead + rsPrefix + ":";
                return rsFix + "valueType " + defix(this.type, prefixes) + " ;\n";
            },
            this.toSExpression = function (depth) {
                return "(ValueType "+this.type.toString()+")";
            },
            this.toHaskell = function (depth) {
                return "(ValueType "+this.type.toString()+")";
            };
    },

    // (1 2 3)
    ValueSet: function (values, _pos) {
        this._ = 'ValueSet'; this.values = values; this._pos = _pos;
        this.toString = function (orig, schema) {
            return '(' + this.values.map(function (v) { return v.toString(orig); }).join(' ') + ')';
        },
            this.validate = function (schema, rule, t, point, db, validatorStuff) {
                var _ValueSet = this;
                var ret = null;
                function match (ret1) {
                    if (ret1.status == RDF.DISPOSITION.PASS)
                        ret = ret1;
                }
                function done () {
                    if (ret)
                        return ret;
                    else {
                        var ret2 = new RDF.ValRes();
                        { ret2.status = RDF.DISPOSITION.FAIL; ret2.error_noMatch(rule, t); }
                        return validatorStuff.async ? Promise.resolve(ret2) : ret2;
                    }
                }
                if (validatorStuff.async) {
                    return Promise.all(this.values.map(function (value) {
                        return value.validate(schema, rule, t, point, db, validatorStuff).then(match);
                    })).then(done);
                } else {
                    this.values.forEach(function (value) {
                        match(value.validate(schema, rule, t, point, db, validatorStuff));
                    });
                    return done();
                }
            },
            this.SPARQLobject = function (prefixes) {
                return "?o";
            },
            this.SPARQLobjectTest = function (prefixes) {
                return "(" + this.values.map(function (v) {
                        return "?o = " + defix(v.term, prefixes);
                    }).join(" || ") + ")";
            },
            this.SPARQLobjectJoin = function (schema, label, prefixes, depth, counters, inOpt, predicate, predicateTest, card, code) {
                return RDF.arcTest(schema, label, prefixes, depth, counters, inOpt, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes), card, code);
            },
            this.SPARQLobjectDump = function (schema, label, prefixes, depth, variables, predicate, predicateTest, card, code) {
                return RDF.arcDump(schema, label, prefixes, depth, variables, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes), card, code);
            },
            this.SPARQLobjectSelect = function (schema, label, as, prefixes, depth, counters, predicate, predicateTest) {
                return RDF.arcSelect(schema, as, prefixes, depth, counters, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes));
            },
            this.toResourceShapes = function (db, prefixes, sePrefix, rsPrefix, depth) {
                var lead = pad(depth, '    ');
                var seFix = lead + sePrefix + ":";
                var rsFix = lead + rsPrefix + ":";
                return rsFix + "allowedValue " + this.values.map(function (v) {
                        return defix(v, prefixes);
                    }).join(' , ') + " ;\n";
            },
            this.toSExpression = function (depth) {
                return "(ValueSet "+(this.values.map(function(ex){return ex.toString();}).join(' '))+")";
            },
            this.toHaskell = function (depth) {
                return "(ValueSet "+(this.values.map(function(ex){return ex.toString();}).join(' '))+")";
            };
    },

    // . - <foo> - <bar>~
    ValueWild: function (exclusions, _pos) {
        this._ = 'ValueWild'; this.exclusions = exclusions; this._pos = _pos;
        this.toString = function (orig, schema) {
            var x = exclusions.map(function (t) { return t.toString(orig); });
            x.unshift('.');
            return x.join(' ');
        },
            this.validate = function (schema, rule, t, point, db, validatorStuff) {
                for (var i = 0; i < this.exclusions.length; ++i) {
                    if (this.exclusions[i].matches(point)) {
                        var ret1 = new RDF.ValRes();
                        { ret1.status = RDF.DISPOSITION.FAIL; ret1.error_noMatch(rule, t); }
                        return validatorStuff.async ? Promise.resolve(ret1) : ret1;
                    }
                }
                var ret2 = new RDF.ValRes();
                { ret2.status = RDF.DISPOSITION.PASS; ret2.matched(rule, t); }
                return validatorStuff.async ? Promise.resolve(ret2) : ret2;
            },
            this.SPARQLobject = function (prefixes) {
                return "?o";
            },
            this.SPARQLobjectTest = function (prefixes) {
                if (exclusions.length === 0)
                    return "true";
                return "(" + this.exclusions.map(function (v) {
                        return "?o !" + v.asSPARQLfilter(prefixes);
                    }).join(" && ") + ")";
            },
            this.SPARQLobjectJoin = function (schema, label, prefixes, depth, counters, inOpt, predicate, predicateTest, card, code) {
                return RDF.arcTest(schema, label, prefixes, depth, counters, inOpt, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes), card, code);
            },
            this.SPARQLobjectDump = function (schema, label, prefixes, depth, variables, predicate, predicateTest, card, code) {
                return RDF.arcDump(schema, label, prefixes, depth, variables, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes), card, code);
            },
            this.SPARQLobjectSelect = function (schema, label, as, prefixes, depth, counters, predicate, predicateTest) {
                return RDF.arcSelect(schema, as, prefixes, depth, counters, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes));
            },
            this.toResourceShapes = function (db, prefixes, sePrefix, rsPrefix, depth) {
                return "# haven't made up some schema for ValueWild yet.\n";
            },
            this.toSExpression = function (depth) {
                return "(ValueWild "+(this.exclusions.map(function(ex){return ex.toString();}).join(' '))+")";
            },
            this.toHaskell = function (depth) {
                return "(ValueWild "+(this.exclusions.map(function(ex){return ex.toString();}).join(' '))+")";
            };
    },

    // <foo>~
    ValuePattern: function (term, exclusions, _pos) {
        this._ = 'ValuePattern'; this.term = term; this.exclusions = exclusions; this._pos = _pos;
        this.toString = function (orig, schema) {
            return this.term.toString(orig) + '~' + this.exclusions.map(function (ex) { return ' - ' + ex.toString(orig); }).join('');
        },
            this.validate = function (schema, rule, t, point, db, validatorStuff) {
                for (var i = 0; i < this.exclusions.length; ++i) {
                    if (this.exclusions[i].toString() === point.toString()) {
                        var ret1 = new RDF.ValRes();
                        { ret1.status = RDF.DISPOSITION.FAIL; ret1.error_noMatch(rule, t); }
                        return validatorStuff.async ? Promise.resolve(ret1) : ret1;
                    }
                }

                if (point.datatype.lex.substr(0,this.term.lex.length) !== this.term.lex) {
                    var ret2 = new RDF.ValRes();
                    { ret2.status = RDF.DISPOSITION.FAIL; ret2.error_noMatch(rule, t); }
                    return validatorStuff.async ? Promise.resolve(ret2) : ret2;
                }
                var ret3 = new RDF.ValRes();
                { ret3.status = RDF.DISPOSITION.PASS; ret3.matched(rule, t); }
                return validatorStuff.async ? Promise.resolve(ret3) : ret3;
            },
            this.SPARQLobject = function (prefixes) {
                return "?o";
            },
            this.SPARQLobjectTest = function (prefixes) {
                var ret = '';
                ret += "(regex(STR(?o), \"^" + this.term.lex + "\"))";
                if (this.exclusions.length > 0)
                    ret += "(" + this.exclusions.map(function (v) {
                        return "?o !" + v.asSPARQLfilter(prefixes);
                    }).join(" && ") + ")";
                return ret;
            },
            this.SPARQLobjectJoin = function (schema, label, prefixes, depth, counters, inOpt, predicate, predicateTest, card, code) {
                // throw "SPARQLobjectJoin of ValuePattern " + this.toString() + " needs attention.";
                return RDF.arcTest(schema, label, prefixes, depth, counters, inOpt, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes), card, code);
            },
            this.SPARQLobjectDump = function (schema, label, prefixes, depth, variables, predicate, predicateTest, card, code) {
                // throw "SPARQLobjectJoin of ValuePattern " + this.toString() + " needs attention.";
                return RDF.arcDump(schema, label, prefixes, depth, variables, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes), code);
            },
            this.SPARQLobjectSelect = function (schema, label, as, prefixes, depth, counters, predicate, predicateTest) {
                // throw "SPARQLobjectSelect of ValuePattern " + this.toString() + " needs attention.";
                return RDF.arcSelect(schema, as, prefixes, depth, counters, predicate, predicateTest, this.SPARQLobject(prefixes), this.SPARQLobjectTest(prefixes));
            },
            this.toResourceShapes = function (db, prefixes, sePrefix, rsPrefix, depth) {
                return "# haven't made up some schema for ValuePattern yet (POWDER?).\n";
            },
            this.toSExpression = function (depth) {
                return "(ValuePattern "+this.term.toString()+")";
            },
            this.toHaskell = function (depth) {
                return "(ValuePattern "+this.term.toString()+")";
            };
    },

    AtomicRule: function (negated, reversed, additive, nameClass, valueClass, min, max, codes, _pos, _req_lev) {
        this._ = 'AtomicRule'; this.negated = negated; this.reversed = reversed; this.additive = additive; this.nameClass = nameClass; this.valueClass = valueClass; this.min = min; this.max = max; this.codes = codes; this._pos = _pos; this.req_lev = _req_lev;
        this.ruleID = undefined;
        this.setRuleID = function (ruleID) { this.ruleID = ruleID; };
        this.label = undefined;
        this.setLabel = function (label) { this.label = label; };
        this.toKey = function () { return this.label.toString() + ' ' + this.toString(); };
        this.toString = function (orig, schema) {
            var ret = '';
            if (reversed) ret += '^';
            ret += nameClass.toString(orig) + ' ';
            ret += valueClass.toString(orig, schema);
            if (min === 1 && max === 1) {
            } else if (min === 0 && max === 1) {
                ret += '?';
            }  else if (min === 0 && max === undefined) {
                ret += '*';
            }  else if (min === 1 && max === undefined) {
                ret += '+';
            } else {
                ret += '{' + min;
                if (max !== undefined) { ret += ', ' + max; }
                ret += '}';
            }
            var AtomicRule = this;
            Object.keys(this.codes).map(function (k) { ret += " " + AtomicRule.codes[k].toString(); });
            return ret;
        };
        this.colorize = function (charmap, idMap, termStringToIds) {
            var ruleId = "r" + idMap.add(this.toKey());
            this.label.assignId(charmap, ruleId+"_s"); // @@ could idMap.addMember(...), but result is more noisy
            if (this.valueClass._ == 'ValueReference') { // not very OO
                this.valueClass.label.assignId(charmap, ruleId+"_ref");
                termStringToIds.add(this.valueClass.label.toString(true), this.valueClass.label.id);
            }
            charmap.insertBefore(this._pos.offset, "<span id='"+ruleId+"' class='rule'>", 0);
            charmap.insertAfter(this._pos.offset+this._pos.width, "</span>", 0);
            var AtomicRule = this;
            Object.keys(this.codes).map(function (k) {
                var code = AtomicRule.codes[k];
                charmap.insertBefore(code._pos.offset, "<span id='"+ruleId+"_"+k+"' class='code'>", 0);
                charmap.insertAfter(code._pos.offset+code._pos.width, "</span>", 0);
            });
        };
        // only returns âˆ…|ðœƒ if inOpt
        // ArcRule: if (inOpt âˆ§ SIZE(matchName)=0) if (min=0) return ðœƒ else return âˆ…;
        // if(SIZE(matchName)<min|>max) return ð•—;
        // vs=matchName.map(valueClass(v,_,g,false)); if(âˆƒð•—) return ð•—; return dispatch('post', ð•¡);
        this.validate = function (schema, point, inOpt, db, validatorStuff) {
            var matched = 0;
            var ret = new RDF.ValRes();
            ret.status = RDF.DISPOSITION.PASS;
            var _AtomicRule = this;
            function handleError (e) {
                var message =
                    [["text", "exception testing " + point.toString() + " against:"],
                        ["code", _AtomicRule.toString()],
                        ["text", "[["],
                        ["NestedError", e],
                        ["text", "]]"]
                    ];
                throw RDF.StructuredError(message);
            }

            var rOrP = db.triplesMatching(this.reversed ? null : point,
                this.nameClass._ === 'NameTerm' ? this.nameClass.term : null,
                this.reversed ? point : null,
                validatorStuff);

            return validatorStuff.async ?
                rOrP.then(testTriples).catch(handleError) :
                testTriples(rOrP);
            function testTriples (matchName) {
                matchName = matchName.filter(function (t) {
                    return _AtomicRule.nameClass.match(t.p);
                });
                var pet = null;
                if (inOpt && matchName.length === 0)
                { ret.status = min === 0 ? RDF.DISPOSITION.ZERO : RDF.DISPOSITION.NONE; ret.matchedEmpty(_AtomicRule);
                    if (validatorStuff.async) pet = Promise.resolve(ret);
                }
                else if (matchName.length < _AtomicRule.min)
                { ret.status = RDF.DISPOSITION.FAIL; ret.error_belowMin(_AtomicRule.min, _AtomicRule);
                    if (validatorStuff.async) pet = Promise.resolve(ret);
                }
                //             else if (matchName.length > _AtomicRule.max)
                //                 { ret.status = RDF.DISPOSITION.FAIL; ret.error_aboveMax(_AtomicRule.max, _AtomicRule, matchName[_AtomicRule.max]); }
                else {
                    var passes = [];
                    var fails = [];
                    var promises = [];
                    matchName.forEach(function (t) {
                        if (_AtomicRule.valueClass._ == 'ValueReference')
                            schema.dispatch(0, 'link', _AtomicRule.codes, null, t);
                        var resOrPromise = _AtomicRule.valueClass.validate(schema, _AtomicRule, t,
                            _AtomicRule.reversed ? t.s : t.o,
                            db, validatorStuff);
                        if (validatorStuff.async)
                            resOrPromise = resOrPromise.then(noteResults);
                        else
                            noteResults(resOrPromise);
                        function noteResults (r) {
                            if (_AtomicRule.valueClass._ != 'ValueReference')
                                schema.dispatch(0, 'visit', _AtomicRule.codes, r, t);
                            if (!r.passed() ||
                                schema.dispatch(0, 'post', _AtomicRule.codes, r, t) == RDF.DISPOSITION.FAIL)
                                fails.push({t:t, r:r});
                            else
                                passes.push({t:t, r:r});
                            return r;
                        }
                        if (validatorStuff.async)
                            promises.push(resOrPromise);
                    });
                    function postTest () {
                        if (inOpt && passes.length === 0) {
                            ret.status = min === 0 ? RDF.DISPOSITION.ZERO : RDF.DISPOSITION.NONE;
                            ret.matchedEmpty(_AtomicRule);
                        } else if (passes.length < _AtomicRule.min) {
                            ret.status = RDF.DISPOSITION.FAIL;
                            ret.error_belowMin(_AtomicRule.min, _AtomicRule);
                        } else if (_AtomicRule.max !== null && passes.length > _AtomicRule.max) {
                            ret.status = RDF.DISPOSITION.FAIL;
                            ret.error_aboveMax(_AtomicRule.max, _AtomicRule, passes[_AtomicRule.max].r);
                        }
                        if (ret.status == RDF.DISPOSITION.FAIL) {
                            for (var iFails1 = 0; iFails1 < fails.length; ++iFails1)
                                ret.add(fails[iFails1].r);
                        } else {
                            for (var iPasses = 0; iPasses < passes.length; ++iPasses)
                                ret.add(passes[iPasses].r);
                            for (var iFails2 = 0; iFails2 < fails.length; ++iFails2)
                                if (!_AtomicRule.additive)
                                    ret.missed(fails[iFails2].r);
                        }
                    }
                    if (validatorStuff.async)
                        pet = Promise.all(promises).then(function () {
                            postTest();
                            return ret;
                        }).catch(function (e) {
                            debugger;
                            return Promise.reject(e);
                        });
                    else
                        postTest();
                }
                function handleNegation (ret) {
                    if (_AtomicRule.negated) {
                        if (ret.status == RDF.DISPOSITION.FAIL) {
                            ret.status = RDF.DISPOSITION.PASS;
                            ret.errors = [];
                        } else if (ret.status == RDF.DISPOSITION.PASS) {
                            ret.status = RDF.DISPOSITION.FAIL;
                            ret.error_aboveMax(0, _AtomicRule, matchName[0]); // !! take a triple from passes
                        }
                    }
                    return ret;
                }
                

                if (validatorStuff.async) {
                    return pet.then(function () {
                        ret = handleNegation(ret);
                        if(["MAY", "SHOULD", "SHOULD NOT"].indexOf(_AtomicRule.req_lev) !== -1){
                            ret.status = RDF.DISPOSITION.PASS;
                        }
                        return ret;
                    });
                } else {
                    ret = handleNegation(ret);
                    if(["MAY", "SHOULD", "SHOULD NOT"].indexOf(_AtomicRule.req_lev) !== -1){
                        ret.status = RDF.DISPOSITION.PASS;
                    }
                    return ret;
                }

            }
        };
        this.SPARQLvalidation = function (schema, label, prefixes, depth, counters, inOpt) {
            var lead = pad(depth, '    ');
            var ret =
                this.valueClass.SPARQLobjectJoin(schema, label, prefixes, depth, counters, inOpt,
                    this.nameClass.SPARQLpredicate(prefixes),
                    this.nameClass.SPARQLpredicateTest(prefixes),
                    // if we are in an optional, we mustn't test card constraints.
                    inOpt ? undefined : {min:this.min, max:this.max},
                    this.codes.sparql);
            ret.min = this.min;
            ret.max = this.max;
            return ret;
        };
        this.SPARQLdataDump = function (schema, label, prefixes, depth, variables) {
            var lead = pad(depth, '    ');
            if (this.nameClass._ != 'NameTerm')
                throw "unable to dump data in non-constant nameClass " + this.nameClass.toString();
            var ret =
                this.valueClass.SPARQLobjectDump(schema, label, prefixes, this.min === 0 ? depth + 1 : depth, variables,
                    this.nameClass.term,
                    this.nameClass.SPARQLpredicateTest(prefixes), // ignored for now.
                    {min:this.min, max:this.max}, this.codes.sparql);
            if (this.min === 0) {
                ret.prepend(lead + "OPTIONAL {\n");
                ret.append(lead + "}\n");
            }
            return ret;
        };
        this.SPARQLremainingTriples = function (schema, label, as, prefixes, depth, counters) {
            var lead = pad(depth, '    ');
            var ret =
                this.valueClass.SPARQLobjectSelect(schema, label, as, prefixes, depth, counters,
                    this.nameClass.SPARQLpredicate(prefixes),
                    this.nameClass.SPARQLpredicateTest(prefixes));
            return ret;
        };
        this.toResourceShapes = function (db, prefixes, sePrefix, rsPrefix, depth) {
            var lead = pad(depth, '    ');
            var seFix = lead + sePrefix + ":";
            var rsFix = lead + rsPrefix + ":";
            var ret = '';
            ret += this.nameClass.toResourceShapes(db, prefixes, sePrefix, rsPrefix, depth);
            ret += this.valueClass.toResourceShapes(db, prefixes, sePrefix, rsPrefix, depth);
            ret += ResourceShapeCardinality(this.min, this.max, sePrefix, rsPrefix, seFix, rsFix);
            if (this.ruleID) // !!! some day this will be a bnode
                for (var i = 0; i < db.triples.length; ++i) {
                    var t = db.triples[i];
                    if (t.s.toString() == this.ruleID.toString()) {
                        ret += lead + defix(t.p, prefixes) + " " + defix(t.o, prefixes) + " ;\n";
                        db.triples.splice(i, 1);
                        --i;
                    }
                }
            var AtomicRule = this;
            Object.keys(this.codes).map(function (k) {
                ret += AtomicRule.codes[k].toResourceShapes(db, prefixes, sePrefix, rsPrefix, depth);
            });
            return ret;
        };
        this.toResourceShapes_inline = function (schema, db, prefixes, sePrefix, rsPrefix, depth) {
            if (this.ruleID &&
                (this.ruleID._ !== 'BNode' ||
                db.triplesMatching(undefined, undefined, this.ruleID).length !== 0))
                return rsPrefix + ":property " + this.ruleID.toString();
            var lead = pad(depth, '    ');
            var seFix = lead + sePrefix + ":";
            var rsFix = lead + rsPrefix + ":";
            var ret = '';
            ret += rsPrefix + ":property " + "[\n";
            ret += this.toResourceShapes(db, prefixes, sePrefix, rsPrefix, depth+1);
            ret += lead + "]";
            return ret;
        };
        this.toResourceShapes_standalone = function (schema, db, prefixes, sePrefix, rsPrefix, depth) {
            if (!this.ruleID ||
                (this.ruleID._ === 'BNode' &&
                db.triplesMatching(undefined, undefined, this.ruleID).length === 0))
                return '';
            var lead = pad(depth, '    ');
            var seFix = lead + sePrefix + ":";
            var rsFix = lead + rsPrefix + ":";
            var ret = '';
            ret += this.ruleID.toString() + "\n";
            ret += this.toResourceShapes(db, prefixes, sePrefix, rsPrefix, depth);
            ret += ".\n";
            return ret;
        };
        this.toSExpression = function (depth) {
            var lead = pad(depth, '    ');
            return lead + "(ArcRule " + this.min + " " + this.max +" " +
                this.nameClass.toSExpression(depth+1) +" " +
                this.valueClass.toSExpression(depth+1) +
                codesToSExpression(this.codes, depth+1) + ")\n";
        };
        this.toHaskell = function (depth) {
            var lead = pad(depth, '    ');
            return lead + "(Arcrule " + this.min + " " + this.max +" " +
                this.nameClass.toHaskell(depth+1) +" " +
                this.valueClass.toHaskell(depth+1) +
                codesToHaskell(this.codes, depth+1) + ")\n";
        };
    },

    ConcomitantRule: function (valueClass, min, max, codes, _pos) {
        this._ = 'ConcomitantRule'; this.valueClass = valueClass; this.min = min; this.max = max; this.codes = codes; this._pos = _pos;
        this.nameClass = {term: RDF.IRI("http://www.w3.org/2013/ShEx/Definition#concomitantRelation") };
        this.ruleID = undefined;
        this.setRuleID = function (ruleID) { this.ruleID = ruleID; };
        this.label = undefined;
        this.setLabel = function (label) { this.label = label; };
        this.toKey = function () { return this.label.toString() + ' ' + this.toString(); };
        this.toString = function (orig, schema) {
            var ret = '';
//            if (reversed) ret += '^';
//            ret += nameClass.toString(orig) + ' ';
            ret += "CONCOMITANT ";
            ret += valueClass.toString(orig, schema);
            if (min === 1 && max === 1) {
            } else if (min === 0 && max === 1) {
                ret += '?';
            }  else if (min === 0 && max === undefined) {
                ret += '*';
            }  else if (min === 1 && max === undefined) {
                ret += '+';
            } else {
                ret += '{' + min;
                if (max !== undefined) { ret += ', ' + max; }
                ret += '}';
            }
            var ConcomitantRule = this;
            Object.keys(this.codes).map(function (k) { ret += " " + ConcomitantRule.codes[k].toString(); });
            return ret;
        };
        this.colorize = function (charmap, idMap, termStringToIds) {
            var ruleId = "r" + idMap.add(this.toKey());
            this.label.assignId(charmap, ruleId+"_s"); // @@ could idMap.addMember(...), but result is more noisy
            if (this.valueClass._ == 'ValueReference') { // not very OO
                this.valueClass.label.assignId(charmap, ruleId+"_ref");
                termStringToIds.add(this.valueClass.label.toString(true), this.valueClass.label.id);
            }
            charmap.insertBefore(this._pos.offset, "<span id='"+ruleId+"' class='rule'>", 0);
            charmap.insertAfter(this._pos.offset+this._pos.width, "</span>", 0);
            var ConcomitantRule = this;
            Object.keys(this.codes).map(function (k) {
                var code = ConcomitantRule.codes[k];
                charmap.insertBefore(code._pos.offset, "<span id='"+ruleId+"_"+k+"' class='code'>", 0);
                charmap.insertAfter(code._pos.offset+code._pos.width, "</span>", 0);
            });
        };
        // only returns âˆ…|ðœƒ if inOpt
        // Concomittant: if (inOpt âˆ§ SIZE(matchName)=0) if (min=0) return ðœƒ else return âˆ…;
        // if(SIZE(matchName)<min|>max) return ð•—;
        // vs=matchName.map(valueClass(v,_,g,false)); if(âˆƒð•—) return ð•—; return dispatch('post', ð•¡);
        this.validate = function (schema, point, inOpt, db, validatorStuff) {
            var matched = 0;
            var ret = new RDF.ValRes();
            ret.status = RDF.DISPOSITION.PASS;
            var _ConcomitantRule = this;
            var seen = {};
            var matchName = db.uniqueSubjects();
            function handleError (e) {
                var message =
                    [["text", "exception testing " + point.toString() + " against:"],
                        ["code", _AtomicRule.toString()],
                        ["text", "[["],
                        ["NestedError", e],
                        ["text", "]]"]
                    ];
                throw RDF.StructuredError(message);
            }
            if (inOpt && matchName.length === 0)
            { ret.status = min === 0 ? RDF.DISPOSITION.ZERO : RDF.DISPOSITION.NONE; ret.matchedEmpty(_ConcomitantRule);
                return validatorStuff.async ? Promise.resolve(ret) : ret;
            }
            else if (matchName.length < _ConcomitantRule.min)
            { ret.status = RDF.DISPOSITION.FAIL; ret.error_belowMin(_ConcomitantRule.min, _ConcomitantRule);
                return validatorStuff.async ? Promise.resolve(ret) : ret;
            }
//             else if (matchName.length > _ConcomitantRule.max)
//                 { ret.status = RDF.DISPOSITION.FAIL; ret.error_aboveMax(_ConcomitantRule.max, _ConcomitantRule, matchName[_ConcomitantRule.max]); }
            else {
                var passes = [];
                var promises = [];
                matchName.forEach(function (s) {
                    var t = RDF.Triple(point, _ConcomitantRule.nameClass.term, s); // make up connecting triple for reporting
                    if (_ConcomitantRule.valueClass._ == 'ValueReference')
                        schema.dispatch(0, 'link', _ConcomitantRule.codes, null, t);
                    var resOrPromise = _ConcomitantRule.valueClass.validate(schema, _ConcomitantRule, t,
                        s,
                        db, validatorStuff);
                    if (validatorStuff.async)
                        resOrPromise = resOrPromise.then(noteResults);
                    else
                        noteResults(resOrPromise);
                    function noteResults (r) {
                        if (_ConcomitantRule.valueClass._ != 'ValueReference')
                            schema.dispatch(0, 'visit', _ConcomitantRule.codes, r, t);
                        if (r.passed() &&
                            schema.dispatch(0, 'post', _ConcomitantRule.codes, r, t) != RDF.DISPOSITION.FAIL)
                            passes.push({t:t, r:r});
                    }
                    if (validatorStuff.async)
                        promises.push(resOrPromise);
                });
                function postTest () {
                    if (inOpt && passes.length === 0) {
                        ret.status = min === 0 ? RDF.DISPOSITION.ZERO : RDF.DISPOSITION.NONE;
                        ret.matchedEmpty(_ConcomitantRule);
                    } else if (passes.length < _ConcomitantRule.min) {
                        ret.status = RDF.DISPOSITION.FAIL;
                        ret.error_belowMin(_ConcomitantRule.min, _ConcomitantRule);
                    } else if (_ConcomitantRule.max !== null && passes.length > _ConcomitantRule.max) {
                        ret.status = RDF.DISPOSITION.FAIL;
                        ret.error_aboveMax(_ConcomitantRule.max, _ConcomitantRule, passes[_ConcomitantRule.max].r);
                    }
                    if (ret.status != RDF.DISPOSITION.FAIL)
                        for (var iPasses = 0; iPasses < passes.length; ++iPasses)
                            ret.add(passes[iPasses].r);
                    return ret;
                }
                if (validatorStuff.async)
                    return Promise.all(promises).then(function () {
                        postTest();
                        return ret;
                    }).catch(function (e) {
                        debugger;
                        return Promise.reject(e);
                    });
                else {
                    postTest();
                    return ret;
                }
            }
        };
        this.SPARQLvalidation = function (schema, label, prefixes, depth, counters, inOpt) {
            var lead = pad(depth, '    ');
            var ret =
                this.valueClass.SPARQLobjectJoin(schema, label, prefixes, depth, counters, inOpt,
                    "?p",
                    "true",
                    // if we are in an optional, we mustn't test card constraints.
                    {min:this.min, max:this.max},
                    this.codes.sparql);
            ret.min = this.min;
            ret.max = this.max;
            return ret;
        };
        this.SPARQLdataDump = function (schema, label, prefixes, depth, variables) {
            var lead = pad(depth, '    ');
            if (true)
                throw "unable to dump data in concomitant nameClass";
            var ret =
                this.valueClass.SPARQLobjectDump(schema, label, prefixes, this.min === 0 ? depth + 1 : depth, variables,
                    this.nameClass.term,
                    this.nameClass.SPARQLpredicateTest(prefixes), // ignored for now.
                    {min:this.min, max:this.max}, this.codes.sparql);
            if (this.min === 0) {
                ret.prepend(lead + "OPTIONAL {\n");
                ret.append(lead + "}\n");
            }
            return ret;
        };
        this.SPARQLremainingTriples = function (schema, label, as, prefixes, depth, counters) {
            var lead = pad(depth, '    ');
            var ret =
                this.valueClass.SPARQLobjectSelect(schema, label, as, prefixes, depth, counters,
                    "?p",
                    "true");
            return ret;
        };
        this.toResourceShapes = function (db, prefixes, sePrefix, rsPrefix, depth) {
            var lead = pad(depth, '    ');
            var seFix = lead + sePrefix + ":";
            var rsFix = lead + rsPrefix + ":";
            var ret = '';
            ret += rsFix + "name \"" + "???" + "\" ;\n" +
            seFix + "concomitantShape true ;\n";
            //ret += this.nameClass.toResourceShapes(db, prefixes, sePrefix, rsPrefix, depth);
            ret += this.valueClass.toResourceShapes(db, prefixes, sePrefix, rsPrefix, depth);
            ret += ResourceShapeCardinality(this.min, this.max, sePrefix, rsPrefix, seFix, rsFix);
            if (this.ruleID) // !!! some day this will be a bnode
                for (var i = 0; i < db.triples.length; ++i) {
                    var t = db.triples[i];
                    if (t.s.toString() == this.ruleID.toString()) {
                        ret += lead + defix(t.p, prefixes) + " " + defix(t.o, prefixes) + " ;\n";
                        db.triples.splice(i, 1);
                        --i;
                    }
                }
            var ConcomitantRule = this;
            Object.keys(this.codes).map(function (k) {
                ret += ConcomitantRule.codes[k].toResourceShapes(db, prefixes, sePrefix, rsPrefix, depth);
            });
            return ret;
        };
        this.toResourceShapes_inline = function (schema, db, prefixes, sePrefix, rsPrefix, depth) {
            if (this.ruleID &&
                (this.ruleID._ !== 'BNode' ||
                db.triplesMatching(undefined, undefined, this.ruleID).length !== 0))
                return rsPrefix + ":property " + this.ruleID.toString();
            var lead = pad(depth, '    ');
            var seFix = lead + sePrefix + ":";
            var rsFix = lead + rsPrefix + ":";
            var ret = '';
            ret += rsPrefix + ":property " + "[\n";
            ret += this.toResourceShapes(db, prefixes, sePrefix, rsPrefix, depth+1);
            ret += lead + "]";
            return ret;
        };
        this.toResourceShapes_standalone = function (schema, db, prefixes, sePrefix, rsPrefix, depth) {
            if (!this.ruleID ||
                (this.ruleID._ === 'BNode' &&
                db.triplesMatching(undefined, undefined, this.ruleID).length === 0))
                return '';
            var lead = pad(depth, '    ');
            var seFix = lead + sePrefix + ":";
            var rsFix = lead + rsPrefix + ":";
            var ret = '';
            ret += this.ruleID.toString() + "\n";
            ret += this.toResourceShapes(db, prefixes, sePrefix, rsPrefix, depth);
            ret += ".\n";
            return ret;
        };
        this.toSExpression = function (depth) {
            var lead = pad(depth, '    ');
            return lead + "(ArcRule " + this.min + " " + this.max +" " +
//                this.nameClass.toSExpression(depth+1) +" " +
                this.valueClass.toSExpression(depth+1) +
                codesToSExpression(this.codes, depth+1) + ")\n";
        };
        this.toHaskell = function (depth) {
            var lead = pad(depth, '    ');
            return lead + "(Arcrule " + this.min + " " + this.max +" " +
//                this.nameClass.toHaskell(depth+1) +" " +
                this.valueClass.toHaskell(depth+1) +
                codesToHaskell(this.codes, depth+1) + ")\n";
        };
    },

    UnaryRule: function (rule, opt, codes, _pos) {
        this._ = 'UnaryRule'; this.rule = rule; this.opt = opt; this.codes = codes; this._pos = _pos;
        this.ruleID = undefined;
        this.setRuleID = function (ruleID) { this.ruleID = ruleID; };
        this.label = undefined;
        this.setLabel = function (label) { this.label = label; this.rule.setLabel(label); };
        this.toKey = function () { return this.label.toString() + ' ' + this.toString(); };
        this.toString = function (orig) {
            var ret = "(" + rule.toString(orig) + ")";
            if (this.opt) {
                ret += '?';
            }
            var UnaryRule = this;
            Object.keys(this.codes).map(function (k) { ret += ' %' + k + '{' + UnaryRule.codes[k] + '%}'; });
            return ret;
        };
        this.colorize = function (charmap, idMap, termStringToIds) {
            this.rule.colorize(charmap, idMap, termStringToIds);
            // var ruleId = "r" + idMap.add(this.toKey());
            // // ugh, toString() in order to get offsets for charmap inserts
            // var ret = "(" + rule.toString(); + ")";
            // if (this.opt) {
            //     ret += '?';
            // }
            // if (this.codes)
            //     Object.keys(this.codes).map(function (k) {
            //         charmap.insertBefore(this._pos.offset, "<span id='"+ruleId+"' class='code'>", ret.length);
            //         ret += ' %' + k + '{' + this.codes[k] + '%}';
            //         charmap.insertBefore(this._pos.offset, "</span>", ret.length);
            //     })
        };
        // GroupRule: v=validity(r,p,g,inOpt|opt); if(ð•—|ðœƒ) return v;
        // if(âˆ…) {if(inOpt) return âˆ… else if (opt) return ð•¡ else return ð•—}; return dispatch('post', );
        this.validate = function (schema, point, inOpt, db, validatorStuff) {
            var _UnaryRule = this;
            schema.dispatch(0, 'enter', this.codes, this, {o:point}); // !! lie! it's the *subject*!
            var resOrPromise = this.rule.validate(schema, point, inOpt || this.opt, db, validatorStuff);
            return validatorStuff.async ? resOrPromise.then(post) : post(resOrPromise);
            function post (v) {
                schema.dispatch(0, 'exit', _UnaryRule.codes, this, null);
                var ret = new RDF.ValRes();
                ret.status = v.status;
                ret.matchedGroup(_UnaryRule, {o:point}, v);
                if (v.status == RDF.DISPOSITION.FAIL || v.status == RDF.DISPOSITION.ZERO)
                    ; // v.status = RDF.DISPOSITION.FAIL; -- avoid dispatch below
                else if (v.status == RDF.DISPOSITION.NONE) {
                    // if (inOpt) v.status = RDF.DISPOSITION.NONE; else
                    if (_UnaryRule.opt)
                        v.status = RDF.DISPOSITION.PASS;
                    else
                        v.status = RDF.DISPOSITION.FAIL;
                } else if (v.status != RDF.DISPOSITION.FAIL)
                    v.status = schema.dispatch(0, 'post', _UnaryRule.codes, v, v.matches);
                return ret;
            }
        };
        this.SPARQLvalidation = function (schema, label, prefixes, depth, counters, inOpt) {
            var lead = pad(depth, '    ');
            var countSelect = '';
            var counter = undefined;
            if (inOpt) {
                counter = counters.incr(label.lex + "_c");
                countSelect = " (COUNT(*) AS " + counter + ")";
            }
            var ret = this.rule.SPARQLvalidation(schema, label, prefixes, depth+1, counters, this.opt ? true : false);
            ret.prepend(lead + "{\n"); // SELECT ?" + label.lex + countSelect + " {\n"
            ret.append(lead + "}\n"); // GROUP BY ?" + label.lex;
            // ret += SPARQLCardinality(this.opt ? 0 : 1, 1) + "}\n";
            return ret;
        },
            this.SPARQLdataDump = function (schema, label, prefixes, depth, variables) {
                return this.rule.SPARQLdataDump(schema, label, prefixes, depth, variables);
            },
            this.SPARQLremainingTriples = function (schema, label, as, prefixes, depth, counters) {
                return this.rule.SPARQLremainingTriples(schema, label, as, prefixes, depth, counters);
            },
            this.toResourceShapes_inline = function (schema, db, prefixes, sePrefix, rsPrefix, depth) {
                if (this.ruleID)
                    return sePrefix + ":ruleGroup " + this.ruleID.toString();
                var lead = pad(depth, '    ');
                var seFix = lead + sePrefix + ":";
                var rsFix = lead + rsPrefix + ":";
                var ret = '';
                ret += sePrefix + ":ruleGroup " + "[\n";
                ret += lead + ResourceShapeCardinality(this.opt === undefined ? 1 : 0, 1, sePrefix, rsPrefix, seFix, rsFix);
                ret += lead + "    " + this.rule.toResourceShapes_inline(schema, db, prefixes, sePrefix, rsPrefix, depth+1);
                ret += lead + "]";
                return ret;
            };
        this.toResourceShapes_standalone = function (schema, db, prefixes, sePrefix, rsPrefix, depth) {
            if (!this.ruleID)
                return '';
            var lead = pad(depth, '    ');
            var seFix = lead + sePrefix + ":";
            var rsFix = lead + rsPrefix + ":";
            var ret = '';
            ret += this.ruleID.toString() + "\n";
            ret += lead + ResourceShapeCardinality(this.opt === undefined ? 1 : 0, 1, sePrefix, rsPrefix, seFix, rsFix);
            ret += this.rule.toResourceShapes_standalone(schema, db, prefixes, sePrefix, rsPrefix, depth);
            ret += ".\n";
            return ret;
        };
//    UnaryRule: function (rule, opt, codes, _pos) {
        this.toSExpression = function (depth) {
            var lead = pad(depth, '    ');
            return lead + "(GroupRule " + (this.opt?":optional":"") +"\n" +
                this.rule.toSExpression(depth+1) +
                codesToSExpression(this.codes, depth+1) + lead + ")\n";
        };
        this.toHaskell = function (depth) {
            var lead = pad(depth, '    ');
            return lead + "(GroupRule " + (this.opt?":optional":"") +"\n" +
                this.rule.toHaskell(depth+1) +
                codesToHaskell(this.codes, depth+1) + lead + ")\n";
        };
    },

    IncludeRule: function (include, _pos) {
        this._ = 'IncludeRule'; this.include = include; this._pos = _pos;
        this.ruleID = undefined;
        this.setRuleID = function (ruleID) { this.ruleID = ruleID; };
        this.label = undefined;
        this.setLabel = function (label) {  };
        this.toKey = function () { return this.label.toString() + ' ' + this.toString(); };
        this.toString = function (orig) {
            return '& ' + this.include.toString(orig);
        };
        this.colorize = function (charmap, idMap, termStringToIds) {
            // @@@ hilight include this.rule.colorize(charmap, idMap, termStringToIds);
        };
        this.validate = function (schema, point, inOpt, db, validatorStuff) {
            return schema.validatePoint(point, this.include, db, validatorStuff, false);
        };
        this.SPARQLvalidation = function (schema, label, prefixes, depth, counters, inOpt) {
            return schema.ruleMap[this.include].SPARQLvalidation(schema, label, prefixes, depth, counters, false);
        },
            this.SPARQLdataDump = function (schema, label, prefixes, depth, variables) {
                return schema.ruleMap[this.include].SPARQLdataDump(schema, label, prefixes, depth, variables);
            },
            this.SPARQLremainingTriples = function (schema, label, as, prefixes, depth, counters) {
                return schema.ruleMap[this.include].SPARQLremainingTriples(schema, label, as, prefixes, depth, counters);
            },
            this.toResourceShapes_inline = function (schema, db, prefixes, sePrefix, rsPrefix, depth) {
                return schema.ruleMap[this.include].toResourceShapes_inline(schema, db, prefixes, sePrefix, rsPrefix, depth);
            };
        this.toResourceShapes_standalone = function (schema, db, prefixes, sePrefix, rsPrefix, depth) {
            return schema.ruleMap[this.include].toResourceShapes_standalone(schema, db, prefixes, sePrefix, rsPrefix, depth);
        };
//    IncludeRule: function (include) {
        this.toSExpression = function (depth) {
            var lead = pad(depth, '    ');
            return lead +
                "(IncludeRule " +
                this.parent +
                ")\n";
        };
        this.toHaskell = function (depth) {
            var lead = pad(depth, '    ');
            return lead +
                "(Includerule " +
                this.parent +
                ")\n";
        };
    },

    // Place-holder rule for e.g. empty parent classes.
    EmptyRule: function (_pos) {
        this._ = 'EmptyRule'; this._pos = _pos;
        this.ruleID = undefined;
        this.setRuleID = function (ruleID) { this.ruleID = ruleID; };
        this.label = undefined;
        this.setLabel = function (label) {  };
        this.toKey = function () { return "@@empty@@"; };
        this.toString = function () {
            return "";
        };
        this.colorize = function (charmap, idMap, termStringToIds) {
        };
        this.validate = function (schema, point, inOpt, db, validatorStuff) {
            var ret = new RDF.ValRes();
            ret.status = inOpt ? RDF.DISPOSITION.NONE : RDF.DISPOSITION.PASS; // nod agreeably
            return validatorStuff.async ? Promise.resolve(ret) : ret;
        };
        this.SPARQLvalidation = function (schema, label, prefixes, depth, counters, inOpt) {
            return new RDF.QueryClause(undefined, "");
        },
            this.SPARQLdataDump = function (schema, label, prefixes, depth, variables) {
                return new RDF.QueryClause(undefined, "");
            },
            this.SPARQLremainingTriples = function (schema, label, as, prefixes, depth, counters) {
                return new RDF.QueryClause(undefined, "");
            },
            this.toResourceShapes_inline = function (schema, db, prefixes, sePrefix, rsPrefix, depth) {
                return "";
            };
        this.toResourceShapes_standalone = function (schema, db, prefixes, sePrefix, rsPrefix, depth) {
            return "";
        };
//    EmptyRule: function () {
        this.toSExpression = function (depth) {
            var lead = pad(depth, '    ');
            return lead + "(EmptyRule)";
        };
        this.toHaskell = function (depth) {
            var lead = pad(depth, '    ');
            return lead + "Emptyrule";
        };
    },

    AndRule: function (conjoints, _pos) {
        this._ = 'AndRule'; this.conjoints = conjoints; this._pos = _pos;
        this.ruleID = undefined;
        this.setRuleID = function (ruleID) { this.ruleID = ruleID; };
        this.label = undefined;
        this.setLabel = function (label) { this.label = label; this.conjoints.map(function (r) { r.setLabel(label); }) ;};
        this.toKey = function () { return this.label.toString() + ' ' + this.toString(); };
        this.toString = function (orig) {
            return this.conjoints.map(function (conj) {
                return '    ' + conj.toString(orig);
            }).join(",\n");
        };
        this.colorize = function (charmap, idMap, termStringToIds) {
            // var ruleId = "r" + idMap.add(this.toKey());
            for (var i = 0; i < this.conjoints.length; ++i) {
                var conj = this.conjoints[i];
                conj.colorize(charmap, idMap, termStringToIds);
            }
        };

        // AndRule: vs=conjoints.map(validity(_,p,g,o)); if(âˆƒð•—) return ð•—;
        // if(âˆƒð•¡âˆ§âˆƒâˆ…) return ð•—; if(âˆ„ð•¡âˆ§âˆ„âˆ…) return ðœƒ else if(âˆƒð•¡) return ð•¡ else return âˆ…
        // Note, this FAILs an empty disjunction.
        this.validate = function (schema, point, inOpt, db, validatorStuff) {
            var ret = new RDF.ValRes();
            var seenFail = false;
            var allPass = RDF.DISPOSITION.PASS;
            var passes = [];
            var empties = [];
            var resOrPromises = []; // list of results or promises of results.
            this.conjoints.forEach(function (conj) {
                var resOrPromise = conj.validate(schema, point, inOpt, db, validatorStuff);
                if (validatorStuff.async)
                    resOrPromises.push(resOrPromise.then(testConjunct));
                else
                    resOrPromises.push(testConjunct(resOrPromise));
                function testConjunct (r) {
                    if (r.status == RDF.DISPOSITION.FAIL)
                        seenFail = true;
                    if (r.status == RDF.DISPOSITION.PASS)
                    // seenPass = true;
                        passes.push(r);
                    else
                        allPass = RDF.DISPOSITION.NONE;
                    if (r.status == RDF.DISPOSITION.NONE)
                    // seenEmpty = true;
                        empties.push(r);
                    return r;
                }
            });
            var _AndRule = this;
            return validatorStuff.async ?
                Promise.all(resOrPromises).then(testAggregate) :
                testAggregate(resOrPromises);
            function testAggregate (rz) {
                rz.forEach(function (r) {
                    ret.add(r);
                });
                if (passes.length && empties.length)
                { ret.status = RDF.DISPOSITION.FAIL; ret.error_mixedOpt(passes, empties, _AndRule); }
                else if (seenFail)
                    ret.status = RDF.DISPOSITION.FAIL;
                else if (!passes.length && !empties.length)
                    ret.status = RDF.DISPOSITION.ZERO;
                else
                    ret.status = allPass;
                return ret;
            }
        };
        this.SPARQLvalidation = function (schema, label, prefixes, depth, counters, inOpt) {
            var ret = '';
            var subs = [];
            var firstNonZero = undefined;
            for (var i = 0; i < this.conjoints.length; ++i) {
                var sub = this.conjoints[i].SPARQLvalidation(schema, label, prefixes, depth, counters, inOpt);
                ret += sub.sparql;
                if (inOpt) {
                    subs.push(sub);
                    if (firstNonZero === undefined && sub.min !== 0)
                        firstNonZero = i;
                }
            }
            if (inOpt) {
                var empty = subs.map(function (s) {
                    return s.counter + "=0";
                }).join(" && ");
                var nonEmpty = subs.map(function (s) {
                    var r = s.counter + ">=" + s.min;
                    if (s.max !== undefined)
                        r += "&&"+s.counter + "<=" + s.max;
                    return r;
                }).join(" && ");
                ret += pad(depth, '    ') + "FILTER (" + empty + " || " + nonEmpty + ")\n";
            }

            var qc;
            if (inOpt) {
                qc = new RDF.QueryClause(subs[firstNonZero].variable, ret);
                qc.min = subs[firstNonZero].min;
                qc.max = subs[firstNonZero].max;
            } else
                qc = new RDF.QueryClause(undefined, ret);
            return qc;
        },
            this.SPARQLdataDump = function (schema, label, prefixes, depth, variables) {
                var ret = '';
                var subs = [];
                var firstNonZero = undefined;
                for (var i = 0; i < this.conjoints.length; ++i) {
                    var sub = this.conjoints[i].SPARQLdataDump(schema, label, prefixes, depth, variables);
                    ret += sub.sparql;
                }
                return new RDF.QueryClause(undefined, ret);
            },
            this.SPARQLremainingTriples = function (schema, label, as, prefixes, depth, counters) {
                var ret = '';
                for (var i = 0; i < this.conjoints.length; ++i) {
                    var sub = this.conjoints[i].SPARQLremainingTriples(schema, label, as, prefixes, depth, counters);
                    ret += sub.sparql;
                    if (i !== this.conjoints.length - 1)
                        ret += " UNION\n";
                }
                return new RDF.QueryClause(undefined, ret);
            },
            this.toResourceShapes_inline = function (schema, db, prefixes, sePrefix, rsPrefix, depth) {
                if (this.ruleID)
                    return rsPrefix + ":conjoint " + this.ruleID.toString();
                var lead = pad(depth, '    ');
                var ret = '';
                for (var i = 0; i < this.conjoints.length; ++i) {
                    if (i > 0)
                        ret += lead;
                    ret += this.conjoints[i].toResourceShapes_inline(schema, db, prefixes, sePrefix, rsPrefix, depth) + " ;\n";
                }
                return ret;
            };
        this.toResourceShapes_standalone = function (schema, db, prefixes, sePrefix, rsPrefix, depth) {
            if (!this.ruleID)
                return '';
            var lead = pad(depth, '    ');
            var seFix = lead + sePrefix + ":";
            var rsFix = lead + rsPrefix + ":";
            var ret = '';
            ret += this.ruleID.toString() + "\n";
            for (var i = 0; i < this.conjoints.length; ++i)
                ret += this.conjoints[i].toResourceShapes_standalone(schema, db, prefixes, sePrefix, rsPrefix, depth);
            return ret;
        };
        this.toSExpression = function (depth) {
            var lead = pad(depth, '    ');
            return lead + "(AndRule\n" +
                this.conjoints.map(function(conj) {
                    return conj.toSExpression(depth+1);
                }).join("") +
                lead + ")\n";
        };
        this.toHaskell = function (depth) {
            var lead = pad(depth, '    ');
            return lead + "(And\n" +
                this.conjoints.map(function(conj) {
                    return conj.toHaskell(depth+1);
                }).join("") +
                lead + ")\n";
        };
        this.prepend = function (elts) {
            this.conjoints = elts.concat(this.conjoints);
        };
    },

    OrRule: function (disjoints, _pos) {
        this._ = 'OrRule'; this.disjoints = disjoints; this._pos = _pos;
        this.ruleID = undefined;
        this.setRuleID = function (ruleID) { this.ruleID = ruleID; };
        this.label = undefined;
        this.setLabel = function (label) { this.label = label; this.disjoints.map(function (r) { r.setLabel(label); }) ;};
        this.toKey = function () { return (this.label ? this.label.toString() + ' ' : '') + this.toString(); };
        this.toString = function (orig) {
            return '(' + this.disjoints.map(function (disj) {
                    return '(' + disj.toString(orig) + ')';
                }).join("|\n") + ')';
        },
            this.colorize = function (charmap, idMap, termStringToIds) {
                // var ruleId = "r" + idMap.add(this.toKey());
                for (var i = 0; i < this.disjoints.length; ++i) {
                    var disj = this.disjoints[i];
                    disj.colorize(charmap, idMap, termStringToIds);
                }
            };
        // âˆƒ!x -> true if there's exactly one x in vs
        // OrRule: vs=disjoints.map(validity(_,p,g,o)); if(âˆ„ð•¡âˆ§âˆ„âˆ…âˆ§âˆ„ðœƒ) return ð•—;
        // if(âˆƒ!ð•¡) return ð•¡; if(âˆƒ!ðœƒ) return ðœƒ else return ð•—;
        this.validate = function (schema, point, inOpt, db, validatorStuff) {
            var ret = new RDF.ValRes();
            var allErrors = true;
            var passCount = 0;
            var indefCount = 0;
            var failures = [];
            var promises = [];
            this.disjoints.forEach(function (disj) {
                var resOrPromise = disj.validate(schema, point, inOpt, db, validatorStuff);
                if (validatorStuff.async)
                    promises.push(resOrPromise.then(testExclusiveness));
                else
                    testExclusiveness(resOrPromise);
                function testExclusiveness (r) {
                    if (r.status == RDF.DISPOSITION.FAIL)
                        failures.push(r);
                    else {
                        allErrors = false;
                        ret.add(r);
                        if (r.status == RDF.DISPOSITION.PASS)
                            ++passCount;
                        else if (r.status == RDF.DISPOSITION.ZERO)
                            ++indefCount;
                    }
                }
            });
            var _OrRule = this;
            return validatorStuff.async ? Promise.all(promises).then(checkResult) : checkResult();
            function checkResult () {
                if (allErrors || passCount > 1)
                    ret.status = RDF.DISPOSITION.FAIL;
                else if (passCount)
                    ret.status = RDF.DISPOSITION.PASS;
                else if (indefCount)
                    ret.status = RDF.DISPOSITION.ZERO;
                else
                    ret.status = RDF.DISPOSITION.FAIL;
                if (ret.status === RDF.DISPOSITION.FAIL)
                    ret.error_or(failures, _OrRule);
                return ret;
            }
        };
        this.SPARQLvalidation = function (schema, label, prefixes, depth, counters, inOpt) {
            var lead1 = pad(depth, '    ');
            var lead2 = pad(depth+1, '    ');
            var countSelect = '';
            var counter = undefined;
            if (inOpt) {
                counter = counters.incr(label.lex + "_c");
                countSelect = " (COUNT(*) AS " + counter + ")";
            }
            var ret = lead1 + "{ SELECT ?" + label.lex + countSelect + " WHERE {\n" + lead2 + "{\n";
            for (var i = 0; i < this.disjoints.length; ++i) {
                if (i !== 0)
                    ret += lead2 + "} UNION {\n";
                ret += this.disjoints[i].SPARQLvalidation(schema, label, prefixes, depth+2, counters, inOpt).sparql;
            }
            ret += lead2 + "}\n" +
            lead1 + "} GROUP BY ?" + label.lex + " HAVING (COUNT(*) = 1)}\n"; // make sure we pass only one side of the union
            return new RDF.QueryClause(counter, ret);
        };
        this.SPARQLdataDump = function (schema, label, prefixes, depth, variables) {
            var lead1 = pad(depth, '    ');
            var ret = lead1 + "OPTIONAL {\n";
            for (var i = 0; i < this.disjoints.length; ++i) {
                if (i !== 0)
                    ret += lead1 + "} OPTIONAL {\n";
                ret += this.disjoints[i].SPARQLdataDump(schema, label, prefixes, depth+1, variables).sparql;
            }
            ret += lead1 + "}\n";
            return new RDF.QueryClause(undefined, ret);
        };
        this.SPARQLremainingTriples = function (schema, label, as, prefixes, depth, counters) {
            var ret = '';
            for (var i = 0; i < this.disjoints.length; ++i) {
                var sub = this.disjoints[i].SPARQLremainingTriples(schema, label, as, prefixes, depth, counters);
                ret += sub.sparql;
                if (i !== this.disjoints.length - 1)
                    ret += " UNION\n";
            }
            return new RDF.QueryClause(undefined, ret);
        },
            this.toResourceShapes_inline = function (schema, db, prefixes, sePrefix, rsPrefix, depth) {
                if (this.ruleID)
                    return rsPrefix + ":disjoint " + this.ruleID.toString();
                var lead = pad(depth, '    ');
                var seFix = lead + sePrefix + ":";
                var rsFix = lead + rsPrefix + ":";
                var ret = '';
                ret += sePrefix + ":choice " + "[\n";
                for (var i = 0; i < this.disjoints.length; ++i) {
                    if (i > 0)
                        ret += "\n";
                    if (this.disjoints[i]._ === 'AndRule') {
                        ret += "    " + seFix + "ruleGroup [\n";
                        ret += lead + "        " + this.disjoints[i].toResourceShapes_inline(schema, db, prefixes, sePrefix, rsPrefix, depth+2);
                        ret += lead + "    ] ;\n";
                    } else
                        ret += lead + "    " + this.disjoints[i].toResourceShapes_inline(schema, db, prefixes, sePrefix, rsPrefix, depth+1) + " ;";
                }
                ret += lead + "]";
                return ret;
            };
        this.toResourceShapes_standalone = function (schema, db, prefixes, sePrefix, rsPrefix, depth) {
            if (!this.ruleID)
                return '';
            var lead = pad(depth, '    ');
            var seFix = lead + sePrefix + ":";
            var rsFix = lead + rsPrefix + ":";
            var ret = '';
            ret += this.ruleID.toString() + "\n";
            for (var i = 0; i < this.disjoints.length; ++i)
                ret += this.disjoints[i].toResourceShapes_standalone(schema, db, prefixes, sePrefix, rsPrefix, depth+1);
            return ret;
        };
        this.toSExpression = function (depth) {
            var lead = pad(depth, '    ');
            return lead + "(OrRule\n" +
                this.disjoints.map(function(disj) {
                    return disj.toSExpression(depth+1);
                }).join("") +
                lead + ")\n";
        };
        this.toHaskell = function (depth) {
            var lead = pad(depth, '    ');
            return lead + "(Or\n" +
                this.disjoints.map(function(disj) {
                    return disj.toHaskell(depth+1);
                }).join("") +
                lead + ")\n";
        };
    },

    // Example (unsafe) javascript semantic action handler.
    // Can be used like: schema.eventHandlers = {js: RDF.jsHandler};
    jsHandler: {
        _callback: function (code, valRes, context) {
            eval("function action(_) {" + code + "}");
            ret = action(context, { message: function (msg) { RDF.message(msg); } });
            var status = RDF.DISPOSITION.PASS;
            if (ret === false)
            { status = RDF.DISPOSITION.FAIL; valRes.error_badEval(code); }
            return status;
        },
        begin: function (code, valRes, context) { return this._callback(code, valRes, context); },
        post: function (code, valRes, context) { return this._callback(code, valRes, context); }
    },

    // Example XML generator.
    // Can be used like:
    //   schema.eventHandlers = {GenX: RDF.GenXHandler(document.implementation,
    //                                                 new XMLSerializer())};
    GenXHandler: function (DOMImplementation, XMLSerializer) {
        return {
            _DOMImplementation:DOMImplementation,
            _XMLSerializer:XMLSerializer,
            when: 1,
            text: null,
            _stack: [], // {top:el1, bottom:eln} for some path el1/el2/eln
            _doc: null,
            _parse: function (str) {
                var index = 0;
                var name = "unspecifiedTag";
                var ns = "";
                var attr = false;
                var val = function (v) { return v; };
                str = str.trim();
                var m = str.match(/^(?:\[([0-9-]+)\])?(@)?([^ \t]*)(?:[ \t]+(\$|=|!)([^ \t]*)(?:[ \t]+(\$|=|!)([^ \t]*)(?:[ \t]+(\$|=|!)([^ \t]*))?)?)?/);
                if (m === null)
                    throw "\"" + str + "\" is not a valid GenX instruction.";
                if (m[1])
                    index = parseInt(m[1]);
                if (m[2])
                    attr = true;
                var parents = m[3].split('/');
                if (parents) {
                    name = parents.pop();
                    if (name[0] == '@') {
                        attr = true;
                        name = name.substr(1);
                    }
                } else {
                    parents = [];
                    name = m[3];
                }
                for (i = 4; i < m.length; i += 2)
                    if (m[i] == '$') {
                        ns = m[i+1];
                    } else if (m[i] == '=') {
                        var pr = "val = function (v) { return v.substr(";
                        var po = "); }";
                        var m2;
                        if ((m2 = m[i+1].match(/^substr\(([0-9]+)\)$/)))
                            eval(pr + m2[1] + po);
                        else if ((m2 = m[i+1].match(/^substr\(([0-9]+),([0-9]+)\)$/)))
                            eval(pr + m2[1] + ", " + m2[2] + po);
                        else if (m[i+1] === '')
                            eval("val = function (v) { return ''; };");
                        else
                            throw "\"" + m[i+1] + "\" is unsupported";
                    } else if (m[i] == '!' && m[i+1] == 'debugger') {
                        debugger;
                    }
                return { index:index, ns:ns, attr:attr, name:name, parents:parents, val:val };
            },
            _assign: function (now, p, val) {
                var parents = [];
                for (var i = 0; i < p.parents.length; ++i) {
                    var newEl = this._createElement(p.ns, p.parents[i]);
                    parents.push(newEl);
                    now.appendChild(newEl);
                    now = newEl;
                }
                val = p.val(val);
                if (p.attr) {
                    if (p.index > 0)
                        now = now.childNodes[p.index];
                    else if (p.index < 0)
                        now = now.childNodes[now.childNodes.length+p.index];
                    now.setAttribute(p.name, val);
                    return null;
                } else {
                    element = this._createElement(p.ns, p.name);
                    if (val !== '')
                        element.appendChild(this._doc.createTextNode(val));
                    if (parents.length) {
                        now.appendChild(element);
                        return {top:parents[0], bottom:element};
                    } else
                        return {top:element, bottom:element};
                }
            },
            _createElement: function (ns, name) {
                var newEl;
                if (this._doc === null) {
                    this._doc = this._DOMImplementation.createDocument
                    (ns, name, undefined);
                    if (ns !== undefined) // unnecessary in chromium. nec in https://github.com/jindw/xmldom
                        this._doc.childNodes[0].setAttribute("xmlns", ns);
                    newEl = this._doc.childNodes[0];
                } else {
                    newEl = this._doc.createElement(name);
                }
                return newEl;
            },
            _ensureRoot: function (code) {
                if (this._stack.length === 0) {
                    throw "GenX directive \""+code+"\" requires a GenX begin action before the start, e.g. %GenX{ MyRootElement $http://a.example/ %}\nstart = ...";
                }
            },
            // Begin and End FindTypes functions are called without a
            // corresponding code in the schema.
            beginFindTypes: function () {
                var el = this._createElement("http://www.w3.org/2013/ShEx/", "findTypesRoot");
                // Unconditionally push a findTypesRoot element.
                this._stack.push({top:el, bottom:el});
            },
            endFindTypes: function () {
                var now = this._stack[this._stack.length-1];
                // See if there's anything but a findTypesRoot.
                if (this._doc.children[0].children.length !== 0)
                    this.text = this._XMLSerializer.serializeToString(this._doc);
            },

            begin: function (code, valRes, context) {
                var p = this._parse(code);
                if (this._stack.length) { // in a findtypes container
                    var now = this._stack[this._stack.length-1];
                    var elements = this._assign(now.bottom, p, '');
                    this._stack.push(elements);
                } else {
                    var el = this._createElement(p.ns, p.name);
                    this._stack.push({top:el, bottom:el});
                }
            },
            end: function (code, valRes, context) {
                var now = this._stack.pop();
                RDF.message(this._doc);
                if (this._stack.length) { // in a findtypes container
                    if (context.status == RDF.DISPOSITION.PASS)
                        this._stack[this._stack.length-1].bottom.appendChild(now.top);
                } else {
                    this.text = this._XMLSerializer.serializeToString(this._doc);
                }
            },
            enter: function (code, valRes, context) {
                this._ensureRoot(code);
                var now = this._stack[this._stack.length-1];
                var p = this._parse(code);
                if (p.attr) {
                    now.bottom.setAttribute(p.name, context.o.lex);
                } else {
                    var elements = this._assign(now.bottom, p, context.o.lex);
                    this._stack.push(elements);
                }
            },
            exit: function (code, valRes, context) {
                var p = this._parse(code);
                if (p.attr) {
                    // was set on the way in.
                } else {
                    var now = this._stack.pop();
                    if (this._stack.length) {
                        var target = this._stack[this._stack.length-1].bottom;
                        if (p.index)
                            target = target.childNodes[p.index];
                        target.appendChild(now.top);
                    }
                }
            },
            visit: function (code, valRes, context) {
                this._ensureRoot(code);
                var now = this._stack[this._stack.length-1];
                var p = this._parse(code);
                var elements = this._assign(now.bottom, p, context.o.lex);
                if (elements)
                    now.bottom.appendChild(elements.bottom);
            }
        };
    },

    // Example JSON generator.
    // Can be used like:
    //   schema.eventHandlers = {GenJ: RDF.GenJHandler()};
    GenJHandler: function () {
        return {
            when: 1,
            text: null,
            _stack: [],
            _context: null,
            _doc: null,
            _needId: false,
            _nsToPrefix: null,
            _parse: function (str) {
                var name = "unspecifiedTag";
                var subjId = false;
                str = str.trim();
                var m = str.match(/^([^ @\t]*)?[ \t]*(\@id)?/);
                if (m === null)
                    throw "\"" + str + "\" is not a valid GenJ instruction.";
                name = m[1];
                if (m[2])
                    subjId = true;
                return { subjId:subjId, name:name };
            },
            _getNamespace: function (iri) {
                var slash = iri.lastIndexOf('/');
                var end = iri.lastIndexOf('#');
                if (slash == -1 && end == -1)
                    return 'iri';
                if (slash > end)
                    end = slash;
                var ns = iri.substr(0, end+1);
                var lname = iri.substr(end+1);
                if (ns in this._nsToPrefix) {
                    return this._nsToPrefix[ns]+':'+lname;
                } else {
                    var prefix = 'ns'+Object.keys(this._nsToPrefix).length;
                    this._nsToPrefix[ns] = prefix;
                    this._context[prefix] = ns;
                    return prefix+':'+lname;
                }
            },
            _registerPredicate: function (tag, iri, dt) {
                var pname = this._getNamespace(iri);
                if (dt) {
                    this._context[tag] = { '@id': pname, '@type': this._getNamespace(dt) };
                } else {
                    this._context[tag] = pname;
                }
            },
            _assign: function (now, attr, value) {
                if (attr in now) {
                    if (!(now[attr] instanceof Array))
                        now[attr] = [now[attr]];
                    now[attr].push(value);
                } else
                    now[attr] = value;
            },
            begin: function (code, valRes, context) {
                this._stack.splice(0, this._stack.length);
                var p = this._parse(code);
                if (p.subjId)
                    this._needId = true;
                this._context = {};
                this._nsToPrefix = {};
                this._doc = { '@context': this._context };
                this._stack.push(this._doc);
            },
            end: function (code, valRes, context) {
                RDF.message(this._doc);
                this.text = JSON.stringify(this._doc);
            },
            enter: function (code, valRes, context) {
                var now = this._stack[this._stack.length-1];
                var p = this._parse(code);
                var element = {};
                this._registerPredicate(p.name, context.p.lex, null);
                this._assign(now, p.name, element);
                if (p.subjId)
                    this._needId = true;
                this._stack.push(element);
            },
            exit: function (code, valRes, context) {
                var now = this._stack.pop();
            },
            visit: function (code, valRes, context) {
                var now = this._stack[this._stack.length-1];
                if (this._needId) {
                    now['@id'] = context.s.lex;
                    this._needId = false;
                }
                var p = this._parse(code);
                this._assign(now, p.name, context.o.lex);
                this._registerPredicate(p.name, context.p.lex,
                    context.o._ == 'RDFLiteral' && context.o.datatype &&
                    context.o.datatype.lex != 'http://www.w3.org/2001/XMLSchema#string' ?
                        context.o.datatype.lex :
                        null);
            }
        };
    },

    // Simple normalizer.
    // Can be used like:
    //   schema.eventHandlers = {GenN: RDF.GenNHandler()};
    // invoke with
    //   %GenN{ %}
    GenNHandler: function () {
        function _add (code, valRes, context) {
            this._doc.push(RDF.Triple(context.s, context.p, context.o));
        }
        return {
            when: 1,
            text: null,
            _doc: null,
            begin: function (code, valRes, context) {
                context.register(["visit", "link"]);
                this._doc = [];
            },
            end: function (code, valRes, context) {
                this.text = this._doc.map(function (t) {
                    return t.toString()+"\n";
                }).join('');
            },
            link: _add,
            visit: _add
        };
    },

    // RDF rewriter.
    // Can be used like:
    //   schema.eventHandlers = {GenR: RDF.GenRHandler()};
    // invoke with
    //   %GenR{"always":true%}
    //  always: whether to default to outputing a triple if there's no code.
    GenRHandler: function () {
        return {
            when: 1,
            text: null,
            begin: function (code, valRes, context) {

                var conf = {};
                try {
                    var ob = JSON.parse('{'+code+'}');
                    conf = ob;
                } catch (e) {}

                function Var (lex) {
                    this._ = 'Var'; this.lex = lex;
                }
                var varMap = {};
                function resolveVar (term) {
                    if (term._ == 'Var')
                        return term.lex in varMap ?
                            varMap[term.lex] :
                            null;
                    return term;
                }

                var doc = [];
                var iriResolver = context.iriResolver;

                var _add = function (code, valRes, context) {
                    var i;
                    var RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
                    var XSD_NS = 'http://www.w3.org/2001/XMLSchema#'
                    var skipSpace = function () {
                        var Space = /^[ \t\n\r\v]+/;
                        var s = code.substr(i).match(Space);
                        if (s)
                            i += s[0].length;
                    };
                    function getToken () {
                        var Token = /^[a-zA-Z_][a-zA-Z0-9_.-]*/;
                        var Double = /^[+-]?(?:[0-9]+\.[0-9]*[eE][+-]?[0-9]+|\.[0-9]+[eE][+-]?[0-9]+|[0-9]+[eE][+-]?[0-9]+)/;
                        var Decimal = /^[+-]?[0-9]*\.[0-9]+/;
                        var Integer = /^[+-]?[0-9]+/;
                        var ch = code[i];
                        var token = null;
                        if (ch == '\'' || ch == '"') {
                            var delim = ch;
                            var end1 = code.indexOf(delim, i+1);
                            while (code[end1-1] == '/' && end1 < code.length)
                                end1 = code.indexIf(delim, end1+1);
                            if (end1 == -1)
                                throw code.substr(i);
                            var ret1 = RDF.RDFLiteral(code.substr(i+1, end1-i-1), undefined, undefined, RDF.Position0());
                            i = end1+1;
                            return ret1;
                        } else if (ch.match(Integer)) {
                            var val = code.substr(i).match(Integer);
                            val = val[0]; // guaranteed to match at least one char.
                            i += val.length;
                            var ret2 = RDF.RDFLiteral(val, undefined, RDF.IRI(XSD_NS+"integer", RDF.Position0()), RDF.Position0());
                            return ret2;
                        } else if (ch == '_' && code[i+1] == ':') {
                            var s1 = code.substr(i+2).match(Token)[0];
                            i += 2+s1.length;
                            return RDF.BNode(s1, RDF.Position0());
                        } else if (ch == '<') {
                            var end2 = code.indexOf('>', i);
                            if (end2 == -1)
                                throw code.substr(i);
                            var s2 = code.substr(i+1, end2-i-1);
                            i = end2+1;
                            return RDF.IRI(iriResolver.getAbsoluteIRI(s2), RDF.Position0());
                        } else if (ch == 'a' && !code[i+1].match(/[a-zA-Z_0-9]/)) {
                            ++i;
                            return RDF.IRI(iriResolver.getAbsoluteIRI(RDF_NS+"type"), RDF.Position0());
                        } else if (ch == '||') { // maybe "a" || "b" is close to EBV("a") || EBV("b")
                            ++i;
                            return {_:'Op', f: function (l, r) {
                                return RDF.RDFLiteral(l.lex || r.lex, undefined, RDF.IRI(XSD_NS+"boolean", RDF.Position0()))
                            }};
                        } else if (ch == '&&') { // maybe "a" && "b" is close to EBV("a") && EBV("b")
                            ++i;
                            return {_:'Op', f: function (l, r) {
                                return RDF.RDFLiteral(l.lex && r.lex, undefined, RDF.IRI(XSD_NS+"boolean", RDF.Position0()))
                            }};
                        } else if (ch == '+') {
                            ++i;
                            return {_:'Op', f: function (l, r) {
                                return RDF.RDFLiteral(l.lex + (+r.lex), undefined, l.datatype)
                            }};
                        } else if (ch == '-') {
                            ++i;
                            return {_:'Op', f: function (l, r) {
                                return RDF.RDFLiteral(l.lex - (+r.lex), undefined, l.datatype)
                            }};
                        } else if (ch == '*') {
                            ++i;
                            return {_:'Op', f: function (l, r) {
                                return RDF.RDFLiteral(l.lex * (+r.lex), undefined, l.datatype)
                            }};
                        } else if (ch == '/') {
                            ++i;
                            return {_:'Op', f: function (l, r) {
                                return RDF.RDFLiteral(l.lex / (+r.lex), undefined, l.datatype)
                            }};
                        } else if (ch == ':') {
                            var lname = code.substr(++i).match(Token);
                            i += lname[0].length;
                            return RDF.IRI(iriResolver.getAbsoluteIRI(iriResolver.getPrefix("")+lname[0]), RDF.Position0());
                        } else if (ch.match(Token)) {
                            var first = code.substr(i).match(Token);
                            first = first[0]; // guaranteed to match at least one char.
                            i += first.length;
                            // A token might start
                            if (code[i] == ':') {
                                // a pname,
                                var lname = code.substr(++i).match(Token);
                                lname = lname ? lname[0] : '';
                                i += lname.length;
                                return RDF.IRI(iriResolver.getAbsoluteIRI(iriResolver.getPrefix(first)+lname), RDF.Position0());
                            } else if (code[i] == '(') {
                                // a function,
                                first = first.toUpperCase();
                                ++i;
                                skipSpace();
                                var params = [];
                                while (code[i] != ')') {
                                    var t = getToken();
                                    if (t._ === 'Op')
                                        params[params.length-1] = t.f(params[params.length-1], getToken());
                                    else
                                        params.push(resolveVar(t));
                                    skipSpace();
                                    if (code[i] == ',') {
                                        ++i;
                                        skipSpace();
                                    }
                                }
                                ++i;
                                skipSpace();

                                var guid = (function() { // http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript#answer-105074
                                    function s4() {
                                        return Math.floor((1 + Math.random()) * 0x10000)
                                            .toString(16)
                                            .substring(1);
                                    }
                                    return function() {
                                        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                                            s4() + '-' + s4() + s4() + s4();
                                    };
                                })();
                                var numerics = [
                                    XSD_NS+"integer",
                                    XSD_NS+"decimal",
                                    XSD_NS+"float",
                                    XSD_NS+"double",
                                    XSD_NS+"nonPositiveInteger",
                                    XSD_NS+"negativeInteger",
                                    XSD_NS+"long",
                                    XSD_NS+"int",
                                    XSD_NS+"short",
                                    XSD_NS+"byte",
                                    XSD_NS+"nonNegativeInteger",
                                    XSD_NS+"unsignedLong",
                                    XSD_NS+"unsignedInt",
                                    XSD_NS+"unsignedShort",
                                    XSD_NS+"unsignedByte",
                                    XSD_NS+"positiveInteger"
                                ];
                                // http://stackoverflow.com/questions/2731579/convert-an-xml-schema-date-string-to-a-javascript-date#question
                                var xmlDateToJavascriptDate = function(xmlDate) {
                                    // It's times like these you wish Javascript supported multiline regex specs
                                    var re = /^([0-9]{4,})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(\.[0-9]+)?(Z|([+-])([0-9]{2}):([0-9]{2}))?$/;
                                    var match = xmlDate.match(re);
                                    if (!match)
                                        return null;

                                    var all = match[0];
                                    var year = match[1];  var month = match[2];  var day = match[3];
                                    var hour = match[4];  var minute = match[5]; var second = match[6];
                                    var milli = match[7];
                                    var z_or_offset = match[8];  var offset_sign = match[9];
                                    var offset_hour = match[10]; var offset_minute = match[11];

                                    if (offset_sign) { // ended with +xx:xx or -xx:xx as opposed to Z or nothing
                                        var direction = (offset_sign == "+" ? 1 : -1);
                                        hour =   parseInt(hour)   + parseInt(offset_hour)   * direction;
                                        minute = parseInt(minute) + parseInt(offset_minute) * direction;
                                    }
                                    var utcDate = Date.UTC(year, Number(month)-1, day, hour, minute, second, (milli || 0));
                                    return new Date(utcDate);
                                }
                                if (false) {
// Functions on RDF Terms 17.4.2 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-rdfTerms
//     isIRI 17.4.2.1 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-isIRI
                                } else if (first == "ISIRI") {
                                    return RDF.RDFLiteral(params[0]._ == 'IRI' ? 'true' : 'false', undefined, RDF.IRI(XSD_NS+"boolean", RDF.Position0()), RDF.Position0());
//     isBlank 17.4.2.2 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-isBlank
                                } else if (first == "ISBLANK") {
                                    return RDF.RDFLiteral(params[0]._ == 'BNode' ? 'true' : 'false', undefined, RDF.IRI(XSD_NS+"boolean", RDF.Position0()), RDF.Position0());
//     isLiteral 17.4.2.3 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-isLiteral
                                } else if (first == "ISLITERAL") {
                                    return RDF.RDFLiteral(params[0]._ == 'RDFLiteral' ? 'true' : 'false', undefined, RDF.IRI(XSD_NS+"boolean", RDF.Position0()), RDF.Position0());
//     isNumeric 17.4.2.4 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-isNumeric
                                } else if (first == "ISNUMERIC") {
                                    return RDF.RDFLiteral(numerics.indexOf(params[0].datatype.lex) == -1 ? 'false' : 'true', undefined, RDF.IRI(XSD_NS+"boolean", RDF.Position0()), RDF.Position0());
//     str 17.4.2.5 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-str
                                } else if (first == "STR") {
                                    return RDF.RDFLiteral(params[0].lex, undefined, undefined, RDF.Position0());
//     lang 17.4.2.6 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-lang
                                } else if (first == "LANG") {
                                    return RDF.RDFLiteral(params[0].langtag, undefined, undefined, RDF.Position0());
//     datatype 17.4.2.7 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-datatype
                                } else if (first == "DATATYPE") {
                                    return RDF.IRI(params[0].datatype, RDF.Position0());
//     IRI 17.4.2.8 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-iri
                                } else if (first == "IRI") {
                                    return RDF.IRI(iriResolver.getAbsoluteIRI(params[0].lex), RDF.Position0());
//     BNODE 17.4.2.9 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-bnode
                                } else if (first == "BNODE") {
                                    return RDF.BNode(params[0].lex, RDF.Position0());
//     STRDT 17.4.2.10 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-strdt
                                } else if (first == "STRDT") {
                                    function pad (str, max) {
                                        return str.length < max ? pad("0" + str, max) : str;
                                    }
                                    var lex = params[0].lex;
                                    var target = params[1];
                                    if (target.lex === "http://www.w3.org/2001/XMLSchema#time") {
                                        var m = lex.match(/^([0-9]+):([0-9]+):([0-9]+)(.*)$/);
                                        if (m)
                                            lex = ""+pad(m[1], 2)+":"+pad(m[2], 2)+":"+pad(m[3], 2)+m[4];
                                    }
                                    else if (target.lex === "http://www.w3.org/2001/XMLSchema#date") {
                                        var m = lex.match(/^([0-9]+)-([0-9]+)-([0-9]+)(.*)$/);
                                        if (m)
                                            lex = ""+m[1]+"-"+pad(m[2], 2)+"-"+pad(m[3], 2)+m[4];
                                    }

                                    return RDF.RDFLiteral(lex, undefined, target, RDF.Position0());
//     STRLANG 17.4.2.11 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-strlang
                                } else if (first == "STRLANG") {
                                    return RDF.RDFLiteral(params[0].lex, RDF.LangTag(params[1].lex, RDF.Position0()), undefined, RDF.Position0());
//     UUID 17.4.2.12 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-uuid
                                } else if (first == "STRLEN") {
                                    return RDF.IRI("urn:uuid:"+guid(), RDF.Position0());
//     STRUUID 17.4.2.13 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-struuid
                                } else if (first == "STRLEN") {
                                    return RDF.RDFLiteral(guid(), undefined, undefined, RDF.Position0());
// Functions on Strings 17.4.3 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-strings
//     STRLEN 17.4.3.2 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-strlen
                                } else if (first == "STRLEN") {
                                    return RDF.RDFLiteral(params[0].lex.length, undefined, RDF.IRI(XSD_NS+"integer", RDF.Position0()), RDF.Position0());
//     SUBSTR 17.4.3.3 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-substr
                                } else if (first == "SUBSTR") {
                                    var substring = params.length == 3 ?
                                        params[0].lex.substr(params[1].lex, params[2].lex) :
                                        params[0].lex.substr(params[1].lex);
                                    return RDF.RDFLiteral(substring, undefined, undefined, RDF.Position0());
//     UCASE 17.4.3.4 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-ucase
                                } else if (first == "UCASE") {
                                    return RDF.RDFLiteral(params[0].lex.toUpperCase(), undefined, undefined, RDF.Position0());
//     LCASE 17.4.3.5 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-lcase
                                } else if (first == "LCASE") {
                                    return RDF.RDFLiteral(params[0].lex.toLowerCase(), undefined, undefined, RDF.Position0());
//     STRSTARTS 17.4.3.6 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-strstarts
                                } else if (first == "STRSTARTS") {
                                    return RDF.RDFLiteral(params[0].lex.indexOf(params[1].lex) === 0 ? 'true' : 'false', undefined, RDF.IRI(XSD_NS+"boolean", RDF.Position0()), RDF.Position0());
//     STRENDS 17.4.3.7 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-strends
                                } else if (first == "STRENDS") {
                                    return RDF.RDFLiteral(params[0].lex.lastIndexOf(params[1].lex) == params[0].lex.length - params[1].lex.length ? 'true' : 'false', undefined, RDF.IRI(XSD_NS+"boolean", RDF.Position0()), RDF.Position0());
//     CONTAINS 17.4.3.8 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-contains
                                } else if (first == "CONTAINS") {
                                    return RDF.RDFLiteral(params[0].lex.indexOf(params[1].lex) != -1 ? 'true' : 'false', undefined, RDF.IRI(XSD_NS+"boolean", RDF.Position0()), RDF.Position0());
//     STRBEFORE 17.4.3.9 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-strbefore
                                } else if (first == "STRBEFORE") {
                                    return RDF.RDFLiteral(params[0].lex.substr(0, params[0].lex.indexOf(params[1].lex)), RDF.Position0());
//     STRAFTER 17.4.3.10 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-strafter
                                } else if (first == "STRAFTER") {
                                    return RDF.RDFLiteral(params[0].lex.substr(params[0].lex.indexOf(params[1].lex) + params[1].lex.length), undefined, undefined, RDF.Position0());
//     ENCODE_FOR_URI 17.4.3.11 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-encode
                                } else if (first == "ENCODE_FOR_URI") {
                                    return RDF.RDFLiteral(encodeURIComponent(params[0].lex), undefined, undefined, RDF.Position0());
//     CONCAT 17.4.3.12 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-concat
                                } else if (first == "CONCAT") {
                                    var concat = params.map(function (p) { return p.lex; }).join('');
                                    return RDF.RDFLiteral(concat, undefined, undefined, RDF.Position0());
//     langMatches 17.4.3.13 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-langMatches
                                } else if (first == "LANGMATCHES") {
                                    var tag = params[0].lex.toUpperCase();
                                    var pattern = params[1].lex.toUpperCase();
                                    var val = "false";
                                    if (tag == pattern)
                                        val = "true";
                                    else if (pattern == "*")
                                        val = tag === '' ? "false" : "true";
                                    else (tag.substr(0, pattern.length) == pattern && (tag.length == pattern.length || tag[pattern.length] == '-'))
                                    val == "true";
                                    return RDF.RDFLiteral(val, undefined, RDF.IRI(XSD_NS+"boolean", RDF.Position0()), RDF.Position0());
//     REGEX 17.4.3.14 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-regex
                                } else if (first == "REGEX") {
                                    var re = params.length == 3 ?
                                        new RegExp(params[1].lex, params[2].lex) :
                                        new RegExp(params[1].lex);
                                    return RDF.RDFLiteral(params[0].lex.match(re) != -1 ? 'true' : 'false', undefined, RDF.IRI(XSD_NS+"boolean", RDF.Position0()), RDF.Position0());
//     REPLACE 17.4.3.15 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-replace
                                } else if (first == "SUBSTR") {
                                    var re = params.length == 3 ?
                                        new RegExp(params[1].lex, params[2].lex) :
                                        new RegExp(params[1].lex);
                                    return RDF.RDFLiteral(params[0].lex.replace(re), undefined, undefined, RDF.Position0());
// Functions on Numerics 17.4.4 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-numerics
//     abs 17.4.4.1 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-abs
                                } else if (first == "ABS") {
                                    var v = Math.abs(params[0].lex);
                                    return RDF.RDFLiteral(v, undefined, params[0].datatype, RDF.Position0());
//     round 17.4.4.2 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-round
                                } else if (first == "ROUND") {
                                    var v = Math.round(params[0].lex);
                                    return RDF.RDFLiteral(v, undefined, params[0].datatype, RDF.Position0());
//     ceil 17.4.4.3 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-ceil
                                } else if (first == "CEIL") {
                                    var v = Math.ceil(params[0].lex);
                                    return RDF.RDFLiteral(v, undefined, params[0].datatype, RDF.Position0());
//     floor 17.4.4.4 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-floor
                                } else if (first == "FLOOR") {
                                    var v = Math.floor(params[0].lex);
                                    return RDF.RDFLiteral(v, undefined, params[0].datatype, RDF.Position0());
//     RAND 17.4.4.5 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#idp2130040
                                } else if (first == "RAND") {
                                    var v = Math.random();
                                    return RDF.RDFLiteral(v, undefined, RDF.IRI(XSD_NS+"double", RDF.Position0()), RDF.Position0());
// Functions on Dates and Times 17.4.5 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-date-time
//     now 17.4.5.1 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-now
                                } else if (first == "NOW") {
                                    var now = new Date();
                                    function AddZero(num) {
                                        return (num >= 0 && num < 10) ? "0" + num : num + "";
                                    }
                                    var strDateTime = [[now.getUTCFullYear(), AddZero(now.getUTCMonth() + 1), AddZero(now.getUTCDate())].join("-"),
                                            [AddZero(now.getUTCHours()), AddZero(now.getUTCMinutes()), AddZero(now.getUTCSeconds())].join(":")]
                                            .join("T")+"+"+AddZero(Math.floor(now.getUTCTimezoneOffset()/60))+":"+AddZero(now.getUTCTimezoneOffset()%60);
                                    return RDF.RDFLiteral(strDateTime, undefined, RDF.IRI(XSD_NS+"dateTime"), RDF.Position0());
//     year 17.4.5.2 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-year
                                } else if (first == "YEAR") {
                                    var d = xmlDateToJavascriptDate(params[0].lex);
                                    return RDF.RDFLiteral(d.getUTCFullYear(), undefined, RDF.IRI(XSD_NS+"integer", RDF.Position0()), RDF.Position0());
//     month 17.4.5.3 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-month
                                } else if (first == "MONTH") {
                                    var d = xmlDateToJavascriptDate(params[0].lex);
                                    return RDF.RDFLiteral(d.getUTCMonth()+1, undefined, RDF.IRI(XSD_NS+"integer"), RDF.Position0());
//     day 17.4.5.4 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-day
                                } else if (first == "DAY") {
                                    var d = xmlDateToJavascriptDate(params[0].lex);
                                    return RDF.RDFLiteral(d.getUTCDate(), undefined, RDF.IRI(XSD_NS+"integer", RDF.Position0()), RDF.Position0());
//     hours 17.4.5.5 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-hours
                                } else if (first == "HOURS") {
                                    var d = xmlDateToJavascriptDate(params[0].lex);
                                    return RDF.RDFLiteral(d.getUTCHours(), undefined, RDF.IRI(XSD_NS+"integer", RDF.Position0()), RDF.Position0());
//     minutes 17.4.5.6 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-minutes
                                } else if (first == "MINUTES") {
                                    var d = xmlDateToJavascriptDate(params[0].lex);
                                    return RDF.RDFLiteral(d.getUTCMinutes(), undefined, RDF.IRI(XSD_NS+"integer", RDF.Position0()), RDF.Position0());
//     seconds 17.4.5.7 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-seconds
                                } else if (first == "SECONDS") {
                                    var d = xmlDateToJavascriptDate(params[0].lex);
                                    return RDF.RDFLiteral(d.getUTCSeconds(), undefined, RDF.IRI(XSD_NS+"integer", RDF.Position0()), RDF.Position0());
//     timezone 17.4.5.8 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-timezone
                                } else if (first == "TIMEZONE") {
                                    var re = /^([0-9]{4,})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(\.[0-9]+)?(Z|([+-])([0-9]{2}):([0-9]{2}))?$/;
                                    var match = params[0].lex.match(re);
                                    var z_or_offset = match[8];  var offset_sign = match[9];
                                    var offset_hour = match[10]; var offset_minute = match[11];
                                    var lex = "PT0S";
                                    if (z_or_offset != "Z") {
                                        lex = (offset_sign == "-" ? "-" : "") + "PT"
                                        + (offset_hour === 0 ? "" : offset_hour/1+"H")
                                        + (offset_minute === 0 ? "" : offset_minute/1+"M");
                                    }
                                    return RDF.RDFLiteral(lex, undefined, RDF.IRI(XSD_NS+"integer", RDF.Position0()), RDF.Position0());
//     tz 17.4.5.9 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-tz
                                } else if (first == "TZ") {
                                    var re = /^([0-9]{4,})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(\.[0-9]+)?(Z|([+-])([0-9]{2}):([0-9]{2}))?$/;
                                    var match = params[0].lex.match(re);
                                    var z_or_offset = match[8];
                                    return RDF.RDFLiteral((z_or_offset || ""), undefined, RDF.IRI(XSD_NS+"integer", RDF.Position0()), RDF.Position0());
// Hash Functions 17.4.6 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-hash
//     MD5 17.4.6.1 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-md5
//     SHA1 17.4.6.2 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-sha1
//     SHA256 17.4.6.3 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-sha256
//     SHA384 17.4.6.4 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-sha384
//     SHA512 17.4.6.5 http://www.w3.org/TR/2013/REC-sparql11-query-20130321/#func-sha512

                                } else {
                                    throw first;
                                }
                            } else {
                                // or a variable name
                                // return new this.Var(s, RDF.Position0());
                                // js scoping is such a PITA!
                                return {_: 'Var', lex: first};
                            }
                        } else {
                            throw code.substr(i);
                        }
                    }
                    if (code) {

                        for (i = 0; i < code.length; ) {
                            var start = i;
                            varMap['s'] = context.s;
                            varMap['p'] = context.p;
                            varMap['o'] = context.o;
                            skipSpace();
                            if (i == code.length)
                                continue;
                            var lvalue = getToken();
                            skipSpace();
                            var ch = code[i];
                            if (ch == '=') {
                                ++i;
                                skipSpace();
                                if (lvalue._ != 'Var')
                                    throw (code.substr(i));
                                var v = resolveVar(getToken());
                                varMap[lvalue.lex] = v;
                            } else {
                                var s = resolveVar(lvalue);
                                var p = resolveVar(getToken());
                                skipSpace();
                                var o = resolveVar(getToken());
                                try {
                                    doc.push(RDF.Triple(s, p, o));
                                } catch (e) {
                                    message("Skipping: \"" + e + "\"\n"
                                    +"while instantiating \"" + code.substr(start, i-start) + "\".");
                                }
                            }
                            skipSpace();
                            if (code[i] == '.') {
                                ++i;
                                skipSpace();
                            }
                        }
                    } else if ('always' in conf && conf['always'] == true) {
                        doc.push(RDF.Triple(context.s, context.p, context.o));
                    }
                }

                this.link = _add;
                this.visit = _add;
                this.end = function (code, valRes, context) {
                    RDF.message(doc);
                    this.text = doc.map(function (t) {
                        return t.toString()+"\n";
                    }).join('');
                }
                if ('always' in conf && conf['always'] == true)
                    context.register(["visit", "link"]);
            },
            link: null,
            visit: null
        };
    },

    Schema: function (_pos) {
        this._ = 'Schema'; this._pos = _pos;
        this.ruleMap = {};
        this.ruleLabels = [];
        this.startRule = undefined;
        this.eventHandlers = {};
        this.derivedShapes = {}; // Map parent name to array of 1st generation childrens' rules.
        this.isVirtualShape = {};
        this.init = {};
        this.comments = [];

        this.hasDerivedShape = function (parent, child) {
            if (!(parent.toString() in this.derivedShapes))
                this.derivedShapes[parent.toString()] = [];
            this.derivedShapes[parent.toString()].push(child);
        }
        this.markVirtual = function (shape) {
            this.isVirtualShape[shape.label.toString()] = true;
        }
        this.getRuleMapClosure = function (name) {
            var key = name.toString();
            var _Schema = this;
            // @@ inject hierarchy here
            //    this.derivedShapes = {};
            //    this.isVirtualShape = {};

            // Ugly late-binding of names 'cause they're not known when hasDerivedShape is called.
            // probably over-complicated way to concatonate descendents.
            function children (parent) {
                return _Schema.derivedShapes[parent]
                    ? [parent].concat(_Schema.derivedShapes[parent].map(function (el) {
                    return children(el.label.toString());
                }).reduce(function (a, b) { return [].concat(a, b) } ))
                    : [parent];
            }
            var disjoints = children(key);
            disjoints = disjoints.filter(function (el) {
                return !_Schema.isVirtualShape[el];
            });
            if (disjoints.length === 0)
                throw "no available shape or derived shapes for " + key;
            disjoints = disjoints.map(function (el) {
                return _Schema.ruleMap[el];
            });
            if (disjoints.length === 1)
                return disjoints[0];
            return new RDF.OrRule(disjoints, RDF.Position2(this.ruleMap[key].line, this.ruleMap[key].column));
        };
        this.serializeRule = function (label) {
            var ret = '';
            var rule = this.ruleMap[label];
            if (rule._ == 'UnaryRule') {
                ret += label + ' {\n' + rule.rule.toString() + '\n}';
                Object.keys(rule.codes).map(function (k) { ret += ' %' + k + '{' + rule.codes[k] + '%}'; })
                ret += "\n\n";
            } else if (rule._ == 'IncludeRule') {
                ret += ": ";
                rule.parents.forEach(function (p) { ret += p.toString(); });
                ret += label + ' {\n' + rule.rule.toString() + '\n}';
                ret += "\n\n";
            } else {
                ret += label + ' {\n' + rule.toString() + '\n}\n\n';
            }
            return ret;
        };
        this.toString = function (orig) {
            var ret = '';

            var Schema = this;
            if (this.init)
                Object.keys(this.init).map(function (k) { ret += Schema.init[k] + "\n"; })
            if (this.startRule)
                ret += "start = " + this.startRule.toString(orig) + "\n\n";
            for (var label in this.ruleMap)
                ret += this.serializeRule(label);
            return ret;
        };
        this.add = function (label, rule) {
            var key = label.toString();
            if (this.ruleMap[key])
                throw "unexpected duplicate rule label: " + key;
            this.ruleLabels.push(label);
            this.ruleMap[key] = rule;
        }
        this.addComment = function (c) {
            this.comments.push(c);
        },
            this.colorize = function (charmap) {
                var idMap = IntStringMap();
                var termStringToIds = StringIdMap();
                var ruleId = "init";
                //this.label.assignId(charmap, ruleId+"_s"); // @@ could idMap.addMember(...), but result is more noisy
                var AtomicRule = this;
                Object.keys(this.init).map(function (k) {
                    var code = AtomicRule.init[k];
                    charmap.insertBefore(code._pos.offset, "<span id='"+ruleId+"_"+k+"' class='code'>", 0);
                    charmap.insertAfter(code._pos.offset+code._pos.width, "</span>", 0);
                });
                for (var i = 0; i < this.ruleLabels.length; ++i) {
                    var label = this.ruleLabels[i];
                    this.ruleMap[label.toString()].colorize(charmap, idMap, termStringToIds);
                    // colorizing assigns ids; add to term map after colorizing
                    termStringToIds.add(label.toString(true), label.id);
                }
                if (this.startRule) {
                    this.startRule.assignId(charmap, "start");
                    termStringToIds.add(this.startRule.toString(true), this.startRule.id);
                }
                // for (var label in this.ruleMap)
                //     this.ruleMap[label].colorize(charmap, idMap, termStringToIds);
                var commentId = "sc";
                for (var i = 0; i < this.comments.length; ++i) {
                    var comment = this.comments[i];
                    charmap.insertBefore(comment._pos.offset, "<span id='"+commentId+"_"+i+"' class='comment'>", 0);
                    charmap.insertAfter(comment._pos.offset+comment._pos.width, "</span>", 0);
                };
                return {idMap:idMap, termStringToIds:termStringToIds};
            };
        this.termResults = {}; // temp cache hack -- makes schema validation non-reentrant
        this.validatePoint = function (point, as, db, validatorStuff, subShapes) {
            // cyclic recursion guard says "am i verifying point as an as in this closure mode?"
            // with closure: start=<a> <a> { <p1> @<a> } / <s1> <p1> <s1> .
            //  w/o closure: start={ <p1> @<a> } VIRTUAL <a> { <p2> (1) } <b> & <a> {  } ! <s1> <p1> [ <p2> 2 ] .
            var asStr = as.toString();
            if (!(asStr in this.ruleMap))
                throw "rule " + asStr + " not found in schema";
            var key = point.toString() + ' @' + asStr + "," + subShapes;
            var resOrPromise = this.termResults[key];
            if (resOrPromise === undefined) {
                var tmp = new RDF.ValRes(); // temporary empty solution
                tmp.status = RDF.DISPOSITION.PASS; // matchedEmpty(this.ruleMap[asStr]);
                this.termResults[key] = validatorStuff.async ? Promise.resolve(tmp) : tmp;

                var closedSubGraph;
                if (validatorStuff.closedShapes)
                    closedSubGraph = db.triplesMatching(point, null, null);

                var rule = subShapes ? this.getRuleMapClosure(as) : this.ruleMap[asStr];
                resOrPromise = rule.validate(this, point, false, db, validatorStuff);

                // Make sure we used all of the closedSubGraph.
                if (validatorStuff.closedShapes) {
                    if (validatorStuff.async)
                        resOrPromise = resOrPromise.then(checkRemaining).catch(function (e) {
                            debugger;
                            return Promise.reject(e);
                        });
                    else
                        checkRemaining(resOrPromise);
                    function checkRemaining (res) {
                        if (res.passed()) {
                            var remaining = closedSubGraph.filter(function (t) {
                                var r = res.triples();
                                for (var i = 0; i < r.length; ++i)
                                    if (r[i] === t)
                                        return false;
                                return true;
                            });
                            if (remaining.length)
                            { res.status = RDF.DISPOSITION.FAIL; res.error_noMatchExtra(rule, remaining); }
                        }
                        return res;
                    }
                }
                this.termResults[key] = resOrPromise;
            }
            return validatorStuff.async ? resOrPromise.then(function (res) { return Promise.resolve(res); }) : resOrPromise;
        };

        this.closeShapes = function (point, as, db, validatorStuff, subShapes) {
            var _Schema = this;
            var resOrPromise = this.validatePoint(point, as, db, validatorStuff, subShapes);
            return validatorStuff.async ?
                resOrPromise.then(post).catch(function (e) {
                    debugger;
                    return Promise.reject(e);
                }) :
                post(resOrPromise);
            function post (ret) {
                if (ret.status == RDF.DISPOSITION.PASS) {
                    _Schema.dispatch(1, 'begin', _Schema.init, null, {iriResolver: validatorStuff.iriResolver});
                    var what = ret.postInvoke(_Schema, validatorStuff);
                    _Schema.dispatch(1, 'end', _Schema.init, null, ret);
                    var seen = ret.triples();
                    var missed = ret.misses.filter(function (m) { // triplesMatch
                        return seen.filter(function (t) {
                            return m.triple.toString() == t.toString();
                        }).length ? false : true;
                    })
                    if (missed.length) {
                        ret.status = RDF.DISPOSITION.FAIL;
                        ret.errors = missed;
                    }
                }
                return ret;
            }
        };

        // usual interface for validating a pointed graph
        this.validate = function (point, as, db, validatorStuff, subShapes) {
            var callbacksAlwaysInvoked = this.alwaysInvoke;
            this.dispatch(0, 'begin', this.init, null, {
                iriResolver: validatorStuff.iriResolver,
                register: function (handlerName, events) {
                    if (!Array.isArray(events))
                        events = [events];
                    for (var i = 0; i < events.length; ++i) {
                        var event = events[i];
                        if (!(event in callbacksAlwaysInvoked))
                            callbacksAlwaysInvoked[event] = [];
                        callbacksAlwaysInvoked[event].push(handlerName);
                    }
                }
            });
            var schema = this;
            var resOrPromise = this.closeShapes(point, as, db, validatorStuff, subShapes);
            function post (ret) {
                schema.dispatch(0, 'end', this.init, null, ret);
                return ret;
            }
            return validatorStuff.async ?
                resOrPromise.then(function (ret) {
                    post(ret);
                    return ret;
                }).catch(function (e) {
                    debugger;
                    return Promise.reject(e);
                }) :
                post(resOrPromise);
        };

        this.findTypes = function (db, subjects, validatorStuff) {
            var ret = new RDF.ValRes(); // accumulate validation successes.
            ret.status = RDF.DISPOSITION.PASS;

            for (var handler in this.handlers)
                if ('beginFindTypes' in this.handlers[handler])
                    this.handlers[handler]['beginFindTypes']();
            // For each (distinct) subject node s,
            var promises = [];
            var schema = this;
            subjects.forEach(function (s) {
                // for each rule label ruleLabel,
                schema.ruleLabels.forEach(function (ruleLabel) {

                    // if the labeled rule not VIRTUAL,
                    if (!schema.isVirtualShape[ruleLabel.toString()]) {

                        // var closedSubGraph = db.triplesMatching(s, null, null); @@ needed?

                        var instSh = RDF.IRI("http://open-services.net/ns/core#instanceShape", RDF.Position0());
                        var nestedValidatorStuff = validatorStuff.push(s, instSh);
                        var resOrPromise = schema.validate(s, ruleLabel, db, nestedValidatorStuff, false);
                        if (validatorStuff.async) {
                            resOrPromise.then(postValidate).catch(function (e) {
                                console.dir(e);
                                debugger;
                                RDF.message(e);
                            });
                            promises.push(resOrPromise);
                        } else {
                            postValidate(resOrPromise);
                        }
                        function postValidate (res) {
                            // If it passed or is indeterminate,
                            if (res.status !== RDF.DISPOSITION.FAIL) {

                                // record the success.
                                RDF.message(s.toString() + " is a " + ruleLabel.toString());
                                var t = RDF.Triple(s, RDF.IRI("http://open-services.net/ns/core#instanceShape", RDF.Position0()), ruleLabel);
                                ret.matchedTree(schema.ruleMap[ruleLabel], t, res);
                            }
                        }
                    }
                });
            });
            function invokeHandlers () {
                for (var handler in schema.handlers)
                    if ('endFindTypes' in schema.handlers[handler])
                        schema.handlers[handler]['endFindTypes']();
                return ret;
            }
            return validatorStuff.async ? Promise.all(promises).then(invokeHandlers) : invokeHandlers();
        };
        this.dispatch = function (when, event, codes, valRes, context) {
            var handlers = this.handlers;
            function callHandler (handlerName, event, code, valRes, context) {
                // add handlerName to register closure.
                var f = null;
                if (context && "register" in context) {
                    f = context.register;
                    context.register = function (events) {
                        f(handlerName, events);
                    };
                }

                // invoke
                var ret = null;
                var error = null;
                try {
                    ret = handlers[handlerName][event](code, valRes, context);
                } catch (e) {
                    var message =
                        [["actionCategory", RDF.actionCategory.ACTION],
                            ["text", "exception invoking:"],
                            ["code", "handlers["+handlerName+"]["+event+"](\""+code+"\", valRes, "+context+")"],
                            ["text", "[["],
                            ["NestedError", e],
                            ["text", "]]"]
                        ];
                    error = RDF.StructuredError(message);
                }

                // restore old register function
                if (f)
                    context.register = f;
                if (error)
                    throw error;
                return ret;
            }
            if (event in this.alwaysInvoke)
                for (var i = 0; i < this.alwaysInvoke[event].length; ++i) {
                    var handlerName = this.alwaysInvoke[event][i];
                    if (!(handlerName in codes)) { // Skip handlers which will be called below.
                        var ex = callHandler(handlerName, event, null, valRes, context);
                        if (ex == RDF.DISPOSITION.FAIL)
                            return RDF.DISPOSITION.FAIL;
                    }
                }
            for (var handlerName in codes)
                if (this.handlers[handlerName] && this.handlers[handlerName][event] && this.handlers[handlerName].when === when) {
                    var ex = callHandler(handlerName, event, codes[handlerName].code, valRes, context);
                    if (ex == RDF.DISPOSITION.FAIL)
                        return RDF.DISPOSITION.FAIL;
                }
            return RDF.DISPOSITION.PASS;
        };
        this.seen = {};
        this.SPARQLvalidation2 = function (func, prefixes, prepend, append) {
            if (!this.startRule)
                throw "schema needs a startRule";
            var start = this.startRule.toString();
            this.seen = {};
            this.seen[start] = start;
            var counters = {
                state: {},
                incr: function (label) {
                    if (this.state[label] === undefined)
                        this.state[label] = 0;
                    return "?" + label + this.state[label]++;
                }
            };
            try {
                return prepend
                    + func(this.ruleMap[start], this, this.startRule, prefixes, 1, counters, false).sparql
                    + append;
            } catch (e) {
                var m = "failed to generate SPARQL validation query because:\n" + e;
                RDF.message(m);
                return m;
            }
        };
        this.SPARQLvalidation = function (prefixes) {
            return this.SPARQLvalidation2(
                function (rule, schema, label, prefixes, depth, counters, inOpt) {
                    return rule.SPARQLvalidation(schema, label, prefixes, depth, counters, inOpt);
                }, prefixes,
                RDF.SPARQLprefixes(prefixes) + "ASK {\n", "}\n");
        }
        this.SPARQLremainingTriples = function (prefixes) {
            var ret = this.SPARQLvalidation2(
                function (rule, schema, label, prefixes, depth, counters, inOpt) {
                    return rule.SPARQLvalidation(schema, label, prefixes, depth, counters, inOpt);
                }, prefixes,
                RDF.SPARQLprefixes(prefixes) + "\
SELECT ?s ?p ?o {\n\
  { ?s ?p ?o } MINUS\n\
  {\n","    {\n");
            ret += this.SPARQLvalidation2(
                function (rule, schema, label, prefixes, depth, counters, inOpt) {
                    return rule.SPARQLremainingTriples(schema, label, "?"+label.lex, prefixes, depth, counters);
                }, prefixes, "", "");
            ret += "\n\
    }\n\
  }\n\
}\n";
            return ret;
        }
        this.SPARQLvalidation3 = function (label, prefixes, depth, counters) {
            var start = label.toString();
            if (this.seen[start])
                throw new RDF.ValidationRecursion(this.seen[start]);
            if (!this.ruleMap[start])
                throw new RDF.UnknownRule(start);

            this.seen[start] = label;
            return this.ruleMap[start].SPARQLvalidation(this, label, prefixes, depth, counters, false)
        };
        this.SPARQLdataDump3 = function (start, label, prefixes, depth, counters) {
            if (this.seen[start])
                throw new RDF.ValidationRecursion(this.seen[start]);
            if (!this.ruleMap[start])
                throw new RDF.UnknownRule(start);

            this.seen[start] = label;
            return this.ruleMap[start].SPARQLdataDump(this, label, prefixes, depth, counters, false)
        };
        this.SPARQLremainingTriples3 = function (label, as, prefixes, depth, counters) {
            var start = label.toString();
            if (this.seen[start])
                throw new RDF.ValidationRecursion(this.seen[start]);
            if (!this.ruleMap[start])
                throw new RDF.UnknownRule(start);

            this.seen[start] = label;
            return this.ruleMap[start].SPARQLremainingTriples(this, label, as, prefixes, depth, counters)
        };
        this.SPARQLdataDump = function (prefixes) {
            var variables = [];
            var ret = this.SPARQLvalidation2(
                function (rule, schema, label, prefixes, depth, counters, inOpt) {
                    return rule.SPARQLdataDump(schema, {lex:'start'}, // <-- dirty hack to emulate RDF term
                        prefixes, depth, variables);
                }, prefixes, '');
            ret = RDF.SPARQLprefixes(prefixes) + "SELECT "+Object.keys(variables).map(function (s) { return '?'+s; }).join(' ')+" {\n" + ret + "}\n";
            return ret;
        }
        this.toResourceShapes = function (prefixes, sePrefix, rsPrefix) {
            var ret = RDF.SPARQLprefixes(prefixes);
            dbCopy = this.db.clone();
            for (var label in this.ruleMap) {
                var rule = this.ruleMap[label];
                ret += label + " a " + rsPrefix + ":ResourceShape ;\n"
                ret += "    " + rule.toResourceShapes_inline(this, dbCopy, prefixes, sePrefix, rsPrefix, 1) + " .\n";
            }
            for (var label in this.ruleMap) {
                var rule = this.ruleMap[label];
                ret += rule.toResourceShapes_standalone(this, dbCopy, prefixes, sePrefix, rsPrefix, 1);
            }
            if (dbCopy.length() !== 0)
                ret += "# remaining triples:\n" + dbCopy.toString();
            return ret;
        };
        this.toSExpression = function (depth) {
            if (depth === undefined) depth=0;
            var Schema = this;
            return "(Schema\n"
                + Object.keys(this.ruleMap).map(function (k) {
                    return "'(" + k + "\n"
                        + Schema.ruleMap[k].toSExpression(depth+1)
                        +" )\n"
                }).join("")+")";
        };
        this.toHaskell = function (depth) {
            if (depth === undefined) depth=0;
            var Schema = this;
            return "(Schema\n"
                + Object.keys(this.ruleMap).map(function (k) {
                    return "(" + k + "->\n"
                        + Schema.ruleMap[k].toHaskell(depth+1)
                        +" )\n"
                }).join("")+")";
        };
        this.partition = function (includes, looseEnds, needed) {
            looseEnds = typeof looseEnds !== 'undefined' ? looseEnds : {};
            needed = typeof needed !== 'undefined' ? needed : {};
            var uses = {};
            var Schema = this; // this is apparently unavailable in _walk.
            function _walk (rule, parents) {
                function _dive (into) {
                    if (parents.indexOf(into) === -1) {
                        parents.map(function (p) {
                            if (uses[p] === undefined)
                                uses[p] = [];
                            uses[p].push(into);
                        });
                        var next = Schema.ruleMap[into];
                        if (next === undefined) {
                            if (looseEnds[into] === undefined)
                                looseEnds[into] = { p:[] };
                            var p = parents[parents.length-1];
                            if (looseEnds[into][p] === undefined)
                                looseEnds[into][p] = [];
                            looseEnds[into][p].push(rule.toString());
                        } else {
                            parents.push(into);
                            _walk(next, parents);
                            parents.pop();
                        }
                    }
                };
                switch (rule._) {
                    case "AtomicRule":
                        if (rule.valueClass._== "ValueReference")
                            _dive(rule.valueClass.label.toString());
                        break;
                    case "UnaryRule":
                        _walk(rule.rule, parents);
                        break;
                    case "IncludeRule":
                        _dive(rule.include.toString());
                        break;
                    case "EmptyRule":
                        break;
                    case "AndRule":
                        for (var conj = 0; conj < rule.conjoints.length; ++conj)
                            _walk(rule.conjoints[conj], parents);
                        break;
                    case "OrRule":
                        for (var disj = 0; disj < rule.disjoints.length; ++disj)
                            _walk(rule.disjoints[disj], parents);
                        break;
                    default: throw "what's a \"" + rule._ + "\"?"
                }
            };
            for (var ri = 0; ri < this.ruleLabels.length; ++ri) {
                var ruleLabel = this.ruleLabels[ri];
                if (!this.isVirtualShape[ruleLabel.toString()])
                    _walk(this.ruleMap[ruleLabel], [ruleLabel]); // this.getRuleMapClosure
            }

            //for (var p in uses) {
            for (var i = 0; i < includes.length; ++i) {
                var p = includes[i];
                needed[p] = true;
                for (var c in uses[p]) needed[uses[p][c]] = true;
            }


            ret = new RDF.Schema(this._pos);
            ret.startRule = this.startRule;
            ret.eventHandlers = this.eventHandlers;
            ret.derivedShapes = {};
            ret.isVirtualShape = {};
            ret.init = this.init;
            for (var ri = 0; ri < this.ruleLabels.length; ++ri) {
                var ruleLabel = this.ruleLabels[ri];
                var ruleLabelStr = ruleLabel.toString();
                if (needed[ruleLabelStr]) {
                    ret.derivedShapes[ruleLabelStr] = this.derivedShapes[ruleLabelStr];
                    if (this.isVirtualShape[ruleLabelStr])
                        ret.isVirtualShape[ruleLabelStr] = true;
                    ret.add(ruleLabel, this.ruleMap[ruleLabelStr]);
                }
            }
            return ret;
        };
    },

    ValRes: function () {
        function renderRule (rule, triple, depth, schemaIdMap, dataIdMap, solutions, classNames) {
            var sOrdinal = solutions.length;
            var rs = rule.toString(true);
            var rOrdinal = schemaIdMap.getInt(rule.toKey());
            var tOrdinal = '';
            var to;
            if (triple) {
                var ts = triple.toString();
                // May be called with no renderable data.
                tOrdinal = dataIdMap ? dataIdMap.getInt(ts) : null;
                var to = triple.s.toString(true) + " " + triple.p.toString(true) + " " + triple.o.toString(true) + " .";
                solutions.push({rule:rOrdinal, triple:tOrdinal});
            } else {
                solutions.push({rule:rOrdinal});
            }

            var ret = pad(depth)
                + "<span id=\"s"+sOrdinal+"\" onClick='hilight(["+sOrdinal+"], ["+rOrdinal+"], ["+tOrdinal+"]);'>";

            ret += "<span class='" + (classNames['schema'] || 'schema') + "'>"
            + rs.replace(/</gm, '&lt;').replace(/>/gm, '&gt;')
            + "</span>"

            if (triple)
                ret += " matched by "
                + "<span class='" + (classNames['data'] || 'data') + "'>"
                + to.replace(/</gm, '&lt;').replace(/>/gm, '&gt;')
                + "</span>";

            ret += "</span>";
            return ret;
        }
        function renderFailure (rule, triple, depth, schemaIdMap, dataIdMap, solutions, classNames, lead, mid) {
            var sOrdinal = solutions.length;
            var rs = rule.toString();
            var rOrdinal = schemaIdMap.getInt(rule.toKey());

            // Dance akwardly around the non-indexing of non-atomic rules.
            if (rOrdinal !== undefined)
                classNames.addErrorClass("r", [rOrdinal]);
            else
                rOrdinal = '';
            // otherwise would just     classNames.addErrorClass("r", [rOrdinal]);

            // document.getElementById("r"+rOrdinal).classList.add("error");
            var tOrdinal = '', ts;
            if (triple) {
                ts = triple.toString();
                if (dataIdMap) {
                    tOrdinal = dataIdMap.getInt(ts)
                    classNames.addErrorClass("", dataIdMap.getMembers(tOrdinal));
                    // document.getElementById("t"+tOrdinal).classList.add("error");
                }
            }
            var newSolution = {};
            if (rOrdinal !== '') newSolution["rule"] = rOrdinal;
            if (tOrdinal !== '') newSolution["triple"] = tOrdinal;

            var ret = pad(depth)
                + "<span id=\"s"+sOrdinal+"\" onClick='hilight(["+sOrdinal+"], ["+rOrdinal+"], ["+tOrdinal+"]);' class=\"error\">" + lead;

            if (triple)
                ret += "<span class='" + (classNames['data'] || 'data') + "'>"
                + ts.replace(/</gm, '&lt;').replace(/>/gm, '&gt;')
                + "</span>";

            ret += mid
            + "<span class='" + (classNames['schema'] || 'schema') + "'>"
            + rs.replace(/</gm, '&lt;').replace(/>/gm, '&gt;')
            + "</span>"

            ret += "</span>";
            return ret;
        }
        RuleMatch = function (rule, triple) {
            this._ = 'RuleMatch'; this.status = RDF.DISPOSITION.PASS; this.rule = rule; this.triple = triple;
            this.toString = function (depth) {
                return pad(depth) + this.rule.toString() + " matched by "
                    + this.triple.toString();
            };
            this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                return renderRule(this.rule, this.triple, depth, schemaIdMap, dataIdMap, solutions, classNames);
            };
            this.postInvoke = function (schema, validatorStuff) {
                schema.dispatch(1, 'link', this.rule.codes, null, this.triple);
                schema.dispatch(1, 'visit', this.rule.codes, this.rule, this.triple);
                schema.dispatch(1, 'post', this.rule.codes, this.rule, this.triple);
                return [this.triple];
            }
            this.triples = function () {
                return [this.triple];
            }
        },
            RuleMatchTree = function (rule, triple, r) {
                this._ = 'RuleMatchTree'; this.status = RDF.DISPOSITION.PASS; this.rule = rule; this.triple = triple; this.r = r;
                this.toString = function (depth) {
                    return pad(depth) + this.rule.toString() + " matched by "
                        + this.triple.toString() + "\n" + this.r.toString(depth+1);
                };
                this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                    return renderRule(this.rule, this.triple, depth, schemaIdMap, dataIdMap, solutions, classNames)
                        + "\n" + this.r.toHTML(depth+1, schemaIdMap, dataIdMap, solutions, classNames);
                };
                this.postInvoke = function (schema, validatorStuff) {
                    schema.dispatch(1, 'link', this.rule.codes, null, this.triple);
                    schema.dispatch(1, 'enter', this.rule.codes, this.rule, this.triple);
                    var ret = this.r.postInvoke(schema, validatorStuff);
                    schema.dispatch(1, 'exit', this.rule.codes, this.rule, this);
                    schema.dispatch(1, 'post', this.rule.codes, this.rule, this.triple);
                    ret.unshift(this.triple);
                    return ret;
                }
                this.triples = function () {
                    var ret = this.r.triples();
                    ret.unshift(this.triple);
                    return ret;
                }
            },
            RuleMatchEmpty = function (rule) {
                this._ = 'RuleMatchEmpty'; this.status = RDF.DISPOSITION.PASS; this.rule = rule;
                this.toString = function (depth) {
                    return pad(depth) + this.rule.toString() + " permitted to not match";
                };
                this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                    return pad(depth) + renderRule(this.rule, undefined, depth, schemaIdMap, dataIdMap, solutions, classNames) + " permitted to not match";
                };
                this.postInvoke = function (schema, validatorStuff) {
                    return [];
                }
                this.triples = function () {
                    return [];
                }
            },
            RuleMatchGroup = function (rule, point, r) {
                this._ = 'RuleMatchGroup'; this.status = RDF.DISPOSITION.PASS; this.rule = rule; this.point = point; this.r = r;
                this.toString = function (depth) {
                    return this.r.toString(depth);
                };
                this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                    return this.r.toHTML(depth, schemaIdMap, dataIdMap, solutions, classNames);
                };
                this.postInvoke = function (schema, validatorStuff) {
                    schema.dispatch(1, 'enter', this.rule.codes, this.rule, {o:this.point});
                    var ret = this.r.postInvoke(schema, validatorStuff);
                    schema.dispatch(1, 'exit', this.rule.codes, this.rule, null);
                    return ret;
                }
                this.triples = function () {
                    return this.r.triples();
                }
            },
            this._ = 'ValRes'; this.matches = []; this.errors = [], this.misses = [], this.tripleToRules = {};
        this.postInvoke = function (schema, validatorStuff) {
            var ret = [];
            if (this.status != RDF.DISPOSITION.FAIL)
                for (var i = 0; i < this.matches.length; ++i)
                    if (this.matches[i].status == RDF.DISPOSITION.PASS) {
                        ret = ret.concat(this.matches[i].postInvoke(schema, validatorStuff));
                    }
            return ret;
        }
        this.triples = function () {
            var ret = [];
            if (this.status != RDF.DISPOSITION.FAIL)
                for (var i = 0; i < this.matches.length; ++i)
                    if (this.matches[i].status == RDF.DISPOSITION.PASS)
                        ret = ret.concat(this.matches[i].triples());
            return ret;
        }

        this.tripleToRule = function (triple, rm) {
            var key = triple.toString();
            if (!this.tripleToRules[key])
                this.tripleToRules[key] = [];
            this.tripleToRules[key].push(rm);
        },
            this.copyMatchedTriples = function (from) {
                for (var key in from.tripleToRules) {
                    if (!this.tripleToRules[key])
                        this.tripleToRules[key] = [];
                    for (var i in from.tripleToRules[key])
                        this.tripleToRules[key].push(from.tripleToRules[key]);
                }
            }
        this.seen = function (triple) {
            var key = triple.toString();
            return !!this.tripleToRules[key];
        },
            this.matched = function (rule, triple) {
                var ret = new RuleMatch(rule, triple);
                this.matches.push(ret);
                this.tripleToRule(triple, ret);
                return ret;
            },
            this.matchedTree = function (rule, triple, r) {
                var ret = new RuleMatchTree(rule, triple, r);
                this.matches.push(ret);
                this.tripleToRule(triple, ret);
                this.copyMatchedTriples(r);
                return ret;
            },
            this.matchedEmpty = function (rule) {
                var ret = new RuleMatchEmpty(rule);
                this.matches.push(ret);
                return ret;
            },
            this.matchedGroup = function (rule, point, r) {
                var ret = new RuleMatchGroup(rule, point, r);
                this.matches.push(ret);
                return ret;
            },

            RuleFail = function (rule, triple) {
                this._ = 'RuleFail'; this.status = RDF.DISPOSITION.FAIL; this.rule = rule; this.triple = triple;
                this.toString = function (depth) {
                    return pad(depth) + "expected " + this.triple.toString()
                        + " to match " + this.rule.toString();
                };
                this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                    return renderFailure(this.rule, this.triple, depth, schemaIdMap, dataIdMap, solutions, classNames, "expected ", " to match ");
                }
            },
            this.error_noMatch = function (rule, triple)  {
                this.errors.push(new RuleFail(rule, triple));
            },
            RuleFailTree = function (rule, triple, r) {
                this._ = 'RuleFailTree'; this.status = RDF.DISPOSITION.FAIL; this.rule = rule; this.triple = triple; this.r = r;
                this.toString = function (depth) {
                    return pad(depth) + "expected " + this.triple.toString()
                        + " to match " + this.rule.toString()
                        + "\n" + r.toString(depth+1);
                };
                this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                    return renderFailure(this.rule, this.triple, depth, schemaIdMap, dataIdMap, solutions, classNames, "expected ", " to match ")
                        + "\n" + this.r.toHTML(depth+1, schemaIdMap, dataIdMap, solutions, classNames);
                }
            },
            this.error_noMatchTree = function (rule, triple, r)  {
                this.errors.push(new RuleFailTree(rule, triple, r));
            },

            RuleFailExtra = function (rule, triples) {
                this._ = 'RuleFailExtra'; this.status = RDF.DISPOSITION.FAIL; this.rule = rule; this.triples = triples;
                this.toString = function (depth) {
                    return pad(depth) + "expected " + this.triples.toString()
                        + " to be covered by " + this.rule.toString();
                };
                this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                    return renderFailure(this.rule, this.triples[0], depth, schemaIdMap, dataIdMap, solutions, classNames, "expected ", " to be covered by ");
                }
            },
            this.error_noMatchExtra = function (rule, triples, r)  {
                this.errors.push(new RuleFailExtra(rule, triples, r));
            },

            RuleFailValue = function (rule, triple) {
                this._ = 'RuleFailValue'; this.status = RDF.DISPOSITION.FAIL; this.rule = rule; this.triple = triple;
                this.toString = function (depth) {
                    return pad(depth) + "expected object of " + this.triple.toString()
                        + " to match value of " + this.rule.toString();
                };
                this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                    return renderFailure(this.rule, this.triple, depth, schemaIdMap, dataIdMap, solutions, classNames, "expected object of ", " to match value of ");
                }
            },
            this.error_wrongValue = function (rule, triple)  {
                this.errors.push(new RuleFailValue(rule, triple));
            },
            RuleFailEval = function (codeObj, solution) {
                this._ = 'RuleFailEval'; this.codeObj = codeObj; this.solution = solution;
                this.toString = function (depth) {
                    return pad(depth) + "eval of {" + this.codeObj + "} rejected [[\n"
                        + solution.matches.map(function (m) {
                            return m.toString(depth+1)+"\n";
                        }).join("") + "    ]]";
                };
                this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                    var sOrdinal = solutions.length;
                    solutions.push({}); // @@ needed?

                    var ret = pad(depth)
                        + "<span id=\"s"+sOrdinal+"\" onClick='hilight(["+sOrdinal+"], [], []);' class=\"error\">"
                        + "eval of {" + this.codeObj + "} rejected [[\n"
                        + solution.matches.map(function (m) {
                            return m.toString(2).replace(/</gm, '&lt;').replace(/>/gm, '&gt;')+"\n";
                        }).join("") + "    ]]"
                        + "</span>";
                    return ret;
                }
            },
            this.error_badEval = function (codeObj)  {
                this.errors.push(new RuleFailEval(codeObj, this));
            },
            RuleFailMax = function (max, rule, triple) {
                this._ = 'RuleFailMax'; this.max = max; this.status = RDF.DISPOSITION.FAIL; this.rule = rule; this.triple = triple;
                this.toString = function (depth) {
                    return pad(depth) + this.triple.toString()
                        + " exceeds max cardinality " + this.max
                        + " of " + this.rule.toString();
                };
                this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                    return renderFailure(this.rule, this.triple, depth, schemaIdMap, dataIdMap, solutions, classNames, "", " exceeds max cardinality " + this.max + " of ");
                }
            },
            this.error_aboveMax = function (max, rule, triple)  {
                this.errors.push(new RuleFailMax(max, rule, triple));
            },
            RuleFailMin = function (min, rule) {
                this._ = 'RuleFailMin'; this.min = min; this.status = RDF.DISPOSITION.FAIL; this.rule = rule;
                this.toString = function (depth) {
                    return pad(depth) + "expected at least " + this.min
                        + " matches of " + this.rule.toString();
                };
                this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                    return pad(depth) + renderFailure(this.rule, undefined, depth, schemaIdMap, dataIdMap, solutions, classNames, "expected at least " + this.min + " matches of ", "");
                }
            },
            this.error_belowMin = function (min, rule) {
                this.errors.push(new RuleFailMin(min, rule));
            },
            RuleFailOr = function (failures, rule) {
                this._ = 'RuleFailOr'; this.failures = failures; this.status = RDF.DISPOSITION.FAIL; this.rule = rule;
                this.toString = function (depth) {
                    return pad(depth) + "no matches of " + this.rule.toString()
                        + "[[" + this.failures.map(function (f) {
                            return pad(depth+1) + f.toString(depth+1);
                        }).join("\n|  ") + "]]";
                };
                this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                    return pad(depth) + renderFailure(this.rule, undefined, depth, schemaIdMap, dataIdMap, solutions, classNames, "no matches of ", "")
                        + "[[" + this.failures.map(function (f) {
                            return pad(depth+1) + f.toHTML(depth+1, schemaIdMap, dataIdMap, solutions, classNames);
                        }).join("\n|  ") + "]]";
                }
            },
            this.error_or = function (failures, rule) {
                this.errors.push(new RuleFailOr(failures, rule));
            },

            RuleFailMixedOpt = function (passes, empties, rule) {
                this._ = 'RuleFailMixedOpt'; this.passes = passes; this.empties = empties; this.status = RDF.DISPOSITION.FAIL; this.rule = rule;
                this.toString = function (depth) {
                    return pad(depth) + "mixed matches of " + this.rule.toString() + "\n"
                        + "passed: [[" + this.passes.map(function (f) {
                            return pad(depth+1) + f.toString(depth+1);
                        }).join("\n|  ") + "]]\n"
                        + "empty: [[" + this.empties.map(function (f) {
                            return pad(depth+1) + f.toString(depth+1);
                        }).join("\n|  ") + "]]";
                };
                this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                    return pad(depth) + renderFailure(this.rule, undefined, depth, schemaIdMap, dataIdMap, solutions, classNames, "mixed matches of ", "\n")
                        + "passed: [[" + this.passes.map(function (f) {
                            return pad(depth+1) + f.toHTML(depth+1, schemaIdMap, dataIdMap, solutions, classNames);
                        }).join("\n|  ") + "]]\n"
                        + "empty: [[" + this.empties.map(function (f) {
                            return pad(depth+1) + f.toHTML(depth+1, schemaIdMap, dataIdMap, solutions, classNames);
                        }).join("\n|  ") + "]]";
                }
            },
            this.error_mixedOpt = function (passes, empties, rule) {
                this.errors.push(new RuleFailMixedOpt(passes, empties, rule));
            },

            this.add = function (res) {
                for (var i = 0; i < res.matches.length; ++i)
                    this.matches.push(res.matches[i]);
                for (var i = 0; i < res.errors.length; ++i)
                    this.errors.push(res.errors[i]);
                if (res.status == RDF.DISPOSITION.FAIL)
                    this.copyMatchedTriples(res);
                for (var i = 0; i < res.misses.length; ++i)
                    this.misses.push(res.misses[i]);
            },
            this.missed = function (res) {
                this.misses.push.apply(this.misses, res.errors)
            },
            this.passed = function () {
                return this.status == RDF.DISPOSITION.PASS;
                return this.matches.length > 0 && this.errors.length === 0;
            },
            this.toString = function (depth) {
                // don't bother indenting group rules (for now)
                if (this.errors.length === 0 && this.matches.length === 1 && this.matches[0]._ === "RuleMatchGroup")
                    return this.matches[0].toString(depth);

                var p = pad(depth);
                var ret = p + (this.passed() ? "PASS {\n" : "FAIL {\n");
                if (this.errors.length > 0)
                    ret += "Errors:\n" + this.errors.map(function (e) { return ' â˜¹ ' + p + e.toString(depth+1) + "\n"; }).join("") + "Matches:\n";
                ret += this.matches.map(function (m) {
                    return m.toString(depth+1);
                }).join("\n");
                return ret + "\n" + p + "}";
            },
            this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                var p = pad(depth);
                var ret = p + (this.passed() ? "PASS {\n" : "<span class='error'>FAIL</span> {\n");
                if (this.errors.length > 0)
                    ret += "Errors:\n" + this.errors.map(function (e) { return ' â˜¹ ' + p + e.toHTML(depth+1, schemaIdMap, dataIdMap, solutions, classNames) + "\n"; }).join("") + "Matches:\n";
                ret += this.matches.map(function (m) { return m.toHTML(depth+1, schemaIdMap, dataIdMap, solutions, classNames); }).join("\n");
                return ret + "\n" + p + "}";
            }
    },

    ValidatorStuff: function (iriResolver, closedShapes, async) {
        return {
            _: 'ValidatorStuff',
            iriResolver: iriResolver,
            closedShapes: closedShapes,
            async: async,
            pointStack: [],
            push: function (node, predicate) {
                var nestedValidatorStuff = RDF.ValidatorStuff(this.iriResolver, this.closedShapes, this.async);
                this.pointStack.forEach(function (elt) {
                    nestedValidatorStuff.pointStack.push(elt);
                });
                nestedValidatorStuff.pointStack.push([predicate, node]);
                return nestedValidatorStuff;
            }
        };
    },

//    curSchema: new this.Schema()
};

// enumerate inheritance
RDF.IRI.prototype.origText = origText;
RDF.RDFLiteral.prototype.origText = origText;
RDF.LangTag.prototype.origText = origText;
RDF.BNode.prototype.origText = origText;

module.exports = RDF;
},{"promise":11}],2:[function(require,module,exports){
module.exports = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { ShExDoc: peg$parseShExDoc },
        peg$startRuleFunction  = peg$parseShExDoc,

        peg$c0 = peg$FAILED,
        peg$c1 = [],
        peg$c2 = null,
        peg$c3 = function() {
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
        },
        peg$c4 = function(m) { curSchema.init = m; },
        peg$c5 = function(pre, i) { iriResolver.setPrefix(pre, i.lex); },
        peg$c6 = function(i) { iriResolver.setBase(i.lex); },
        peg$c7 = "start",
        peg$c8 = { type: "literal", value: "start", description: "\"start\"" },
        peg$c9 = "=",
        peg$c10 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c11 = function(l) { curSchema.startRule = l; },
        peg$c12 = function(t, m) {
            var r = Object.keys(m).length ? new RDF.UnaryRule(t, false, m, RDF.Position2(line(), column())) : t;
            var b = RDF.BNode(bnodeScope.nextLabel(), RDF.Position5(text(), line(), column(), offset(), 1));
            r.setLabel(b);
            curSchema.add(b, r);
            curSchema.startRule = b;
            return new RDF.ValueReference(b, RDF.Position2(line(), column()));
        },
        peg$c13 = function(v, l, t, m) {
            var r = Object.keys(m).length ? new RDF.UnaryRule(t, false, m, RDF.Position2(line(), column())) : t;
            r.setLabel(l);
            curSchema.add(l, r);
            if (v)
                curSchema.markVirtual(r);
        },
        peg$c14 = function() { return true; },
        peg$c15 = "{",
        peg$c16 = { type: "literal", value: "{", description: "\"{\"" },
        peg$c17 = "}",
        peg$c18 = { type: "literal", value: "}", description: "\"}\"" },
        peg$c19 = function(includes, exp) {
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
        },
        peg$c20 = "&",
        peg$c21 = { type: "literal", value: "&", description: "\"&\"" },
        peg$c22 = function(l) { return new RDF.IncludeRule(l, RDF.Position2(line(), column())); },
        peg$c23 = function(exp, more) {
            if (!more.length) return exp;
            more.unshift(exp)
            return new RDF.OrRule(more, RDF.Position2(line(), column()));
        },
        peg$c24 = "|",
        peg$c25 = { type: "literal", value: "|", description: "\"|\"" },
        peg$c26 = function(exp) { return exp; },
        peg$c27 = function(exp, more) {
            if (!more.length) return exp;
            more.unshift(exp)
            return new RDF.AndRule(more, RDF.Position2(line(), column()));
        },
        peg$c28 = ",",
        peg$c29 = { type: "literal", value: ",", description: "\",\"" },
        peg$c30 = function(i, a) {
            if (curSubject.length > 0)
                curSubject.pop();
            if (i) a.setRuleID(i); // in case it has an ID but no triples.
            return a;
        },
        peg$c31 = function(inc) { return inc; },
        peg$c32 = "(",
        peg$c33 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c34 = ")",
        peg$c35 = { type: "literal", value: ")", description: "\")\"" },
        peg$c36 = function(i, exp, r, c) {
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
        },
        peg$c37 = "$",
        peg$c38 = { type: "literal", value: "$", description: "\"$\"" },
        peg$c39 = function(i) { curSubject.push(i); return i; },
        peg$c40 = /^[A-Z]/,
        peg$c41 = { type: "class", value: "[A-Z]", description: "[A-Z]" },
        peg$c42 = /^[a-z]/,
        peg$c43 = { type: "class", value: "[a-z]", description: "[a-z]" },
        peg$c44 = " ",
        peg$c45 = { type: "literal", value: " ", description: "\" \"" },
        peg$c46 = function(l, r) { return r ? l+r : l; },
        peg$c47 = "`",
        peg$c48 = { type: "literal", value: "`", description: "\"`\"" },
        peg$c49 = "` ",
        peg$c50 = { type: "literal", value: "` ", description: "\"` \"" },
        peg$c51 = function(req_t) { return req_t },
        peg$c52 = "@",
        peg$c53 = { type: "literal", value: "@", description: "\"@\"" },
        peg$c54 = function(l, r, p, c) {
            var v = new RDF.ValueReference(l, RDF.Position5(text(), line(), column(), offset(), l._pos.offset-offset()+l._pos.width));
            var width = v._pos.offset-offset()+v._pos.width;
            if (r)
                width = r.ends-offset();
            else
                r = {min: 1, max: 1};
            var ret = new RDF.ConcomitantRule(v, r.min, r.max, c, RDF.Position5(text(), line(), column(), offset(), width));
            if (p) ret.setRuleID(p);
            return ret;
        },
        peg$c55 = "!",
        peg$c56 = { type: "literal", value: "!", description: "\"!\"" },
        peg$c57 = "^",
        peg$c58 = { type: "literal", value: "^", description: "\"^\"" },
        peg$c59 = "+",
        peg$c60 = { type: "literal", value: "+", description: "\"+\"" },
        peg$c61 = function(req, bang, inverse, addative, n, v, d, r, p, c) {
            if (d)
                throw peg$buildException('default (='+d.toString()+') not currently supported', null, peg$reportedPos);
            var width = v._pos.offset-offset()+v._pos.width;
            if (r)
                width = r.ends-offset();
            else
                r = {min: 1, max: 1};
            var ret = new RDF.AtomicRule(bang?true:false, inverse?true:false, addative?true:false, n, v, r.min, r.max, c, RDF.Position5(text(), line(), column(), offset(), width), req);
            if (p) ret.setRuleID(p);
            return ret;
        },
        peg$c62 = function(i) { return new RDF.NameTerm(i, RDF.Position2(line(), column())); },
        peg$c63 = ".",
        peg$c64 = { type: "literal", value: ".", description: "\".\"" },
        peg$c65 = function(excl) { return new RDF.NameWild(excl.list, RDF.Position2(line(), column())); },
        peg$c66 = function(i, patFlag) {
            return patFlag ? new RDF.NamePattern(i, patFlag[3] ? patFlag[3].list : [], RDF.Position2(line(), column())) : new RDF.NameTerm(i, RDF.Position2(line(), column()));
        },
        peg$c67 = function(l) { return new RDF.ValueReference(l, RDF.Position5(text(), line(), column(), offset(), l._pos.offset-offset()+l._pos.width)); },
        peg$c68 = function(r) {
            var b = RDF.BNode(bnodeScope.nextLabel(), RDF.Position5(text(), line(), column(), offset(), 1));
            r.setLabel(b);
            curSchema.add(b, r);
            return new RDF.ValueReference(b, RDF.Position5(text(), line(), column(), offset(), 1)); // Only hilight open brace.
        },
        peg$c69 = function(s) { return s; },
        peg$c70 = function(t) { return new RDF.ValueType(t, RDF.Position5(text(), line(), column(), offset(), t._pos.width)); },
        peg$c71 = function(n) { return new RDF.ValueType(n, RDF.Position5(text(), line(), column(), offset(), n._pos.width)); },
        peg$c72 = function(s) { return new RDF.ValueSet(s.list, RDF.Position5(text(), line(), column(), offset(), s.ends-offset())); },
        peg$c73 = function(excl) { return new RDF.ValueWild(excl.list, RDF.Position5(text(), line(), column(), offset(), excl.ends-offset())); },
        peg$c74 = function(o) { return o; },
        peg$c75 = ";",
        peg$c76 = { type: "literal", value: ";", description: "\";\"" },
        peg$c77 = function(v) { curPredicate.push(v); },
        peg$c78 = function(o, oz) { curPredicate.pop(); },
        peg$c79 = function(n) { db.add(curSubject.peek(), curPredicate.peek(), n); return n; },
        peg$c80 = function(s) { curSubject.pop(); return s; },
        peg$c81 = "[",
        peg$c82 = { type: "literal", value: "[", description: "\"[\"" },
        peg$c83 = function() {
            var ret = RDF.BNode(bnodeScope.nextLabel(), RDF.Position5(text(), line(), column(), offset(), 1));
            curSubject.push(ret);
            return ret;
        },
        peg$c84 = "]",
        peg$c85 = { type: "literal", value: "]", description: "\"]\"" },
        peg$c86 = function(r) { return r; },
        peg$c87 = function() {
            curListHead.push(null);
            curListTail.push(null);
            insertTripleAt.push(db.triples.length);
            curSubject.push(RDF.BNode(bnodeScope.nextLabel(), RDF.Position5(text(), line(), column()-1, offset()-1, 1)));
            curPredicate.push(RDF.IRI(RDF_NS+'first', RDF.Position5(text(), line(), column(), offset(), 1)));
        },
        peg$c88 = function() {
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
        },
        peg$c89 = function(o) {
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
        },
        peg$c90 = function() {
            if (curSubject.length > 0)
                return curSubject.slice(-1)[0]; // curSubject was set by $_id rule
            var ret = RDF.BNode(bnodeScope.nextLabel(), RDF.Position5(text(), line(), column(), offset(), 1));
            curSubject.push(ret);
            return ret;
        },
        peg$c91 = function(ex) { return ex.length ? {ends: ex[ex.length-1]._pos.offset+ex[ex.length-1]._pos.width , list:ex} : {ends:offset(), list:[]}; },
        peg$c92 = "-",
        peg$c93 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c94 = function(i) { return i; },
        peg$c95 = "*",
        peg$c96 = { type: "literal", value: "*", description: "\"*\"" },
        peg$c97 = function() { return {min: 0, max: undefined, ends: offset()+1}; },
        peg$c98 = function() { return {min: 1, max: undefined, ends: offset()+1}; },
        peg$c99 = "?",
        peg$c100 = { type: "literal", value: "?", description: "\"?\"" },
        peg$c101 = function() { return {min: 0, max: 1, ends: offset()+1}; },
        peg$c102 = function(min, max, c) { return {min: min, max: max === null ? min : max, ends: c}; },
        peg$c103 = function() { return offset()+1; },
        peg$c104 = function(max) { return max ? max : undefined; },
        peg$c105 = function() { return undefined; },
        peg$c106 = function(o, c) { return {ends:c, list:o}; },
        peg$c107 = function(codeList) {
            var ret = {};
            for (var i = 0; i < codeList.length; ++i)
                ret[codeList[i].label] = codeList[i];
            return ret;
        },
        peg$c108 = function(c) { return c; },
        peg$c109 = function(i, patFlag) {
            return new RDF.ValuePattern(i, patFlag[3] ? patFlag[3].list : [], RDF.Position5(text(), line(), column(), offset(), patFlag[1]-offset()));
        },
        peg$c110 = function(i, patFlag) {
            return patFlag
                ? new RDF.ValuePattern(i, patFlag[3] ? patFlag[3].list : [], RDF.Position5(text(), line(), column(), offset(), patFlag[1]-offset()))
                : new RDF.ValueTerm(i, RDF.Position5(text(), line(), column(), offset(), i._pos.width));
        },
        peg$c111 = "~",
        peg$c112 = { type: "literal", value: "~", description: "\"~\"" },
        peg$c113 = function(l) { return new RDF.ValueTerm(l, RDF.Position5(text(), line(), column(), offset(), l._pos.width)); },
        peg$c114 = function(value) { return _literalHere(value, 'double'); },
        peg$c115 = function(value) { return _literalHere(value, 'decimal'); },
        peg$c116 = function(value) { return _literalHere(value, 'integer'); },
        peg$c117 = function(s, l) { return RDF.RDFLiteral(s.lex, l, undefined, RDF.Position5(text(), s.line, s.column, s.offset, s.length+1+l._pos.width)); },
        peg$c118 = "^^",
        peg$c119 = { type: "literal", value: "^^", description: "\"^^\"" },
        peg$c120 = function(s, i) { return RDF.RDFLiteral(s.lex, undefined, i, RDF.Position5(text(), s.line, s.column, s.offset, s.length+2+i._pos.width)); },
        peg$c121 = function(s) { return RDF.RDFLiteral(s.lex, undefined, undefined, RDF.Position5(text(), s.line, s.column, s.offset, s.length)); },
        peg$c122 = "true",
        peg$c123 = { type: "literal", value: "true", description: "\"true\"" },
        peg$c124 = function() { return _literalHere('true', 'boolean'); },
        peg$c125 = "false",
        peg$c126 = { type: "literal", value: "false", description: "\"false\"" },
        peg$c127 = function() { return _literalHere('false', 'boolean'); },
        peg$c128 = function(ln) {
            return RDF.IRI(iriResolver.getAbsoluteIRI(iriResolver.getPrefix(ln.prefix) + ln.lex), RDF.Position5(text(), line(), column(), offset(), ln.width));
        },
        peg$c129 = function(p) { return RDF.IRI(iriResolver.getAbsoluteIRI(iriResolver.getPrefix(p)), RDF.Position5(text(), line(), column(), offset(), p.length+1)); },
        peg$c130 = "%",
        peg$c131 = { type: "literal", value: "%", description: "\"%\"" },
        peg$c132 = /^[a-zA-Z+#_]/,
        peg$c133 = { type: "class", value: "[a-zA-Z+#_]", description: "[a-zA-Z+#_]" },
        peg$c134 = /^[a-zA-Z0-9+#_]/,
        peg$c135 = { type: "class", value: "[a-zA-Z0-9+#_]", description: "[a-zA-Z0-9+#_]" },
        peg$c136 = /^[^%\\]/,
        peg$c137 = { type: "class", value: "[^%\\\\]", description: "[^%\\\\]" },
        peg$c138 = "\\",
        peg$c139 = { type: "literal", value: "\\", description: "\"\\\\\"" },
        peg$c140 = function(label, code) {
            return new RDF.Code(label[0]+label[1].join(''), code.join(''), RDF.Position5(text(), line(), column(), offset(), 1+label.length+1+code.length+4));
        },
        peg$c141 = /^[Vv]/,
        peg$c142 = { type: "class", value: "[Vv]", description: "[Vv]" },
        peg$c143 = /^[Ii]/,
        peg$c144 = { type: "class", value: "[Ii]", description: "[Ii]" },
        peg$c145 = /^[Rr]/,
        peg$c146 = { type: "class", value: "[Rr]", description: "[Rr]" },
        peg$c147 = /^[Tt]/,
        peg$c148 = { type: "class", value: "[Tt]", description: "[Tt]" },
        peg$c149 = /^[Uu]/,
        peg$c150 = { type: "class", value: "[Uu]", description: "[Uu]" },
        peg$c151 = /^[Aa]/,
        peg$c152 = { type: "class", value: "[Aa]", description: "[Aa]" },
        peg$c153 = /^[Ll]/,
        peg$c154 = { type: "class", value: "[Ll]", description: "[Ll]" },
        peg$c155 = function() { return RDF.IRI('http://www.w3.org/2013/ShEx/ns#IRI', RDF.Position5(text(), line(), column(), offset(), 3)); },
        peg$c156 = /^[Ee]/,
        peg$c157 = { type: "class", value: "[Ee]", description: "[Ee]" },
        peg$c158 = function() { return RDF.IRI('http://www.w3.org/2013/ShEx/ns#Literal', RDF.Position5(text(), line(), column(), offset(), 3)); },
        peg$c159 = /^[Bb]/,
        peg$c160 = { type: "class", value: "[Bb]", description: "[Bb]" },
        peg$c161 = /^[Nn]/,
        peg$c162 = { type: "class", value: "[Nn]", description: "[Nn]" },
        peg$c163 = /^[Oo]/,
        peg$c164 = { type: "class", value: "[Oo]", description: "[Oo]" },
        peg$c165 = /^[Dd]/,
        peg$c166 = { type: "class", value: "[Dd]", description: "[Dd]" },
        peg$c167 = function() { return RDF.IRI('http://www.w3.org/2013/ShEx/ns#BNode', RDF.Position5(text(), line(), column(), offset(), 3)); },
        peg$c168 = function() { return RDF.IRI('http://www.w3.org/2013/ShEx/ns#NonLiteral', RDF.Position5(text(), line(), column(), offset(), 3)); },
        peg$c169 = "a",
        peg$c170 = { type: "literal", value: "a", description: "\"a\"" },
        peg$c171 = function() { return RDF.IRI(RDF_NS+'type', RDF.Position5(text(), line(), column(), offset(), 1)); },
        peg$c172 = /^[^\0- <>"{}|\^`\\]/,
        peg$c173 = { type: "class", value: "[^\\0- <>\"{}|\\^`\\\\]", description: "[^\\0- <>\"{}|\\^`\\\\]" },
        peg$c174 = function(b, s, e) {
            return RDF.IRI(iriResolver.getAbsoluteIRI(s.join('')), RDF.Position5(text(), line(), column(), offset(), e-b+1));
        },
        peg$c175 = "<",
        peg$c176 = { type: "literal", value: "<", description: "\"<\"" },
        peg$c177 = function() { return offset(); },
        peg$c178 = ">",
        peg$c179 = { type: "literal", value: ">", description: "\">\"" },
        peg$c180 = /^[Cc]/,
        peg$c181 = { type: "class", value: "[Cc]", description: "[Cc]" },
        peg$c182 = /^[Mm]/,
        peg$c183 = { type: "class", value: "[Mm]", description: "[Mm]" },
        peg$c184 = /^[Pp]/,
        peg$c185 = { type: "class", value: "[Pp]", description: "[Pp]" },
        peg$c186 = /^[Ff]/,
        peg$c187 = { type: "class", value: "[Ff]", description: "[Ff]" },
        peg$c188 = /^[Xx]/,
        peg$c189 = { type: "class", value: "[Xx]", description: "[Xx]" },
        peg$c190 = /^[Ss]/,
        peg$c191 = { type: "class", value: "[Ss]", description: "[Ss]" },
        peg$c192 = ":",
        peg$c193 = { type: "literal", value: ":", description: "\":\"" },
        peg$c194 = function(pre) { return pre ? pre : '' },
        peg$c195 = function(pre, l) { 
            return {width: pre.length+1+l.length, prefix:pre, lex:l};
        },
        peg$c196 = "_:",
        peg$c197 = { type: "literal", value: "_:", description: "\"_:\"" },
        peg$c198 = /^[0-9]/,
        peg$c199 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c200 = function(first, rest) {
            return RDF.BNode(bnodeScope.uniqueLabel(first+rest.join('')), RDF.Position5(text(), line(), column(), offset(), 2+first.length+rest.length));
        },
        peg$c201 = function(l, r) { return l+r; },
        peg$c202 = /^[a-zA-Z]/,
        peg$c203 = { type: "class", value: "[a-zA-Z]", description: "[a-zA-Z]" },
        peg$c204 = /^[a-zA-Z0-9]/,
        peg$c205 = { type: "class", value: "[a-zA-Z0-9]", description: "[a-zA-Z0-9]" },
        peg$c206 = function(s) {
            s[1].splice(0, 0, '');
            var str = s[0].join('')+s[1].reduce(function(a,b){return a+b[0]+b[1].join('');});
            return RDF.LangTag(str, RDF.Position5(text(), line(), column()+1, offset()+1, str.length));
        },
        peg$c207 = /^[+\-]/,
        peg$c208 = { type: "class", value: "[+\\-]", description: "[+\\-]" },
        peg$c209 = function(sign, s) { if (!sign) sign=''; return sign+s.join(''); },
        peg$c210 = function(sign, l, d) { if (!sign) sign=''; return sign+l.join('')+'.'+d.join(''); },
        peg$c211 = function(sign, v) { if (!sign) sign=''; return sign+v; },
        peg$c212 = function(m, d, e) { return m.join('')+'.'+d.join('')+e; },
        peg$c213 = function(d, e) { return '.'+d.join('')+e; },
        peg$c214 = function(m, e) { return m.join('')+e; },
        peg$c215 = /^[eE]/,
        peg$c216 = { type: "class", value: "[eE]", description: "[eE]" },
        peg$c217 = function(e, sign, l) { if (!sign) sign=''; return e+sign+l.join(''); },
        peg$c218 = function(b, s, e) { return {line:line(), column:column(), offset:offset(), length:e-b+1, lex:s.join('')}; },
        peg$c219 = "'",
        peg$c220 = { type: "literal", value: "'", description: "\"'\"" },
        peg$c221 = /^[^'\\\n\r]/,
        peg$c222 = { type: "class", value: "[^'\\\\\\n\\r]", description: "[^'\\\\\\n\\r]" },
        peg$c223 = "\"",
        peg$c224 = { type: "literal", value: "\"", description: "\"\\\"\"" },
        peg$c225 = /^[^"\\\n\r]/,
        peg$c226 = { type: "class", value: "[^\"\\\\\\n\\r]", description: "[^\"\\\\\\n\\r]" },
        peg$c227 = function(b, s, e) { return {line:line(), column:column(), offset:offset(), length:e-b+3, lex:s.join('')}; },
        peg$c228 = "'''",
        peg$c229 = { type: "literal", value: "'''", description: "\"'''\"" },
        peg$c230 = /^[^'\\]/,
        peg$c231 = { type: "class", value: "[^'\\\\]", description: "[^'\\\\]" },
        peg$c232 = function(q, c) { // '
            return q ? q+c : c;
        },
        peg$c233 = "''",
        peg$c234 = { type: "literal", value: "''", description: "\"''\"" },
        peg$c235 = "\"\"\"",
        peg$c236 = { type: "literal", value: "\"\"\"", description: "\"\\\"\\\"\\\"\"" },
        peg$c237 = /^[^"\\]/,
        peg$c238 = { type: "class", value: "[^\"\\\\]", description: "[^\"\\\\]" },
        peg$c239 = function(q, c) { // "
            return q ? q+c : c;
        },
        peg$c240 = "\"\"",
        peg$c241 = { type: "literal", value: "\"\"", description: "\"\\\"\\\"\"" },
        peg$c242 = "\\u",
        peg$c243 = { type: "literal", value: "\\u", description: "\"\\\\u\"" },
        peg$c244 = function(s) { return String.fromCharCode(parseInt(s.join(''), 16)); },
        peg$c245 = "\\U",
        peg$c246 = { type: "literal", value: "\\U", description: "\"\\\\U\"" },
        peg$c247 = function(s) {
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
        },
        peg$c248 = /^[tbnrf"'\\]/,
        peg$c249 = { type: "class", value: "[tbnrf\"'\\\\]", description: "[tbnrf\"'\\\\]" },
        peg$c250 = function(r) { // "
            return r=='t' ? '\t'
                 : r=='b' ? '\b'
                 : r=='n' ? '\n'
                 : r=='r' ? '\r'
                 : r=='f' ? '\f'
                 : r=='"' ? '"'
                 : r=='\'' ? '\''
                 : '\\'
        },
        peg$c251 = function(s) { return RDF.BNode(bnodeScope.nextLabel(), RDF.Position5(text(), line(), column(), offset(), s.length+2)); },
        peg$c252 = /^[\xC0-\xD6]/,
        peg$c253 = { type: "class", value: "[\\xC0-\\xD6]", description: "[\\xC0-\\xD6]" },
        peg$c254 = /^[\xD8-\xF6]/,
        peg$c255 = { type: "class", value: "[\\xD8-\\xF6]", description: "[\\xD8-\\xF6]" },
        peg$c256 = /^[\xF8-\u02FF]/,
        peg$c257 = { type: "class", value: "[\\xF8-\\u02FF]", description: "[\\xF8-\\u02FF]" },
        peg$c258 = /^[\u0370-\u037D]/,
        peg$c259 = { type: "class", value: "[\\u0370-\\u037D]", description: "[\\u0370-\\u037D]" },
        peg$c260 = /^[\u037F-\u1FFF]/,
        peg$c261 = { type: "class", value: "[\\u037F-\\u1FFF]", description: "[\\u037F-\\u1FFF]" },
        peg$c262 = /^[\u200C-\u200D]/,
        peg$c263 = { type: "class", value: "[\\u200C-\\u200D]", description: "[\\u200C-\\u200D]" },
        peg$c264 = /^[\u2070-\u218F]/,
        peg$c265 = { type: "class", value: "[\\u2070-\\u218F]", description: "[\\u2070-\\u218F]" },
        peg$c266 = /^[\u2C00-\u2FEF]/,
        peg$c267 = { type: "class", value: "[\\u2C00-\\u2FEF]", description: "[\\u2C00-\\u2FEF]" },
        peg$c268 = /^[\u3001-\uFFFD]/,
        peg$c269 = { type: "class", value: "[\\u3001-\\uFFFD]", description: "[\\u3001-\\uFFFD]" },
        peg$c270 = "_",
        peg$c271 = { type: "literal", value: "_", description: "\"_\"" },
        peg$c272 = /^[\xB7]/,
        peg$c273 = { type: "class", value: "[\\xB7]", description: "[\\xB7]" },
        peg$c274 = /^[\u0300-\u036F]/,
        peg$c275 = { type: "class", value: "[\\u0300-\\u036F]", description: "[\\u0300-\\u036F]" },
        peg$c276 = /^[\u203F-\u2040]/,
        peg$c277 = { type: "class", value: "[\\u203F-\\u2040]", description: "[\\u203F-\\u2040]" },
        peg$c278 = function(b, r) { return r ? b+r : b; },
        peg$c279 = function(l, r) { return '%'+l+r; },
        peg$c280 = /^[A-F]/,
        peg$c281 = { type: "class", value: "[A-F]", description: "[A-F]" },
        peg$c282 = /^[a-f]/,
        peg$c283 = { type: "class", value: "[a-f]", description: "[a-f]" },
        peg$c284 = /^[_~.!$&'()*+,;=\/?#@%\-]/,
        peg$c285 = { type: "class", value: "[_~.!$&'()*+,;=\\/?#@%\\-]", description: "[_~.!$&'()*+,;=\\/?#@%\\-]" },
        peg$c286 = function(x) { return ''; },
        peg$c287 = /^[ \t\r\n]/,
        peg$c288 = { type: "class", value: "[ \\t\\r\\n]", description: "[ \\t\\r\\n]" },
        peg$c289 = function() { return ''; },
        peg$c290 = "#",
        peg$c291 = { type: "literal", value: "#", description: "\"#\"" },
        peg$c292 = /^[^\r\n]/,
        peg$c293 = { type: "class", value: "[^\\r\\n]", description: "[^\\r\\n]" },
        peg$c294 = function(comment) { curSchema.addComment(new RDF.Comment(comment.join(''), RDF.Position5(text(), line(), column(), offset(), comment.length+1))); },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parseShExDoc() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsedirective();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsedirective();
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_ssc_statement();
          if (s3 === peg$FAILED) {
            s3 = peg$c2;
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c3();
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_ssc_statement() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parse_ssc();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsestatement();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsestatement();
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_ssc() {
      var s0, s1;

      s0 = peg$parseshape();
      if (s0 === peg$FAILED) {
        s0 = peg$parsestart();
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseCodeMap();
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c4(s1);
          }
          s0 = s1;
        }
      }

      return s0;
    }

    function peg$parsestatement() {
      var s0;

      s0 = peg$parsedirective();
      if (s0 === peg$FAILED) {
        s0 = peg$parsestart();
        if (s0 === peg$FAILED) {
          s0 = peg$parseshape();
        }
      }

      return s0;
    }

    function peg$parsedirective() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsesparqlPrefix();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsesparqlBase();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parsesparqlPrefix() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseSPARQL_PREFIX();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsePNAME_NS();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseIRIREF();
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c5(s3, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsesparqlBase() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseSPARQL_BASE();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseIRIREF();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c6(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsestart() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5) === peg$c7) {
        s1 = peg$c7;
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c8); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 61) {
            s3 = peg$c9;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c10); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsestartRule();
              if (s5 !== peg$FAILED) {
                s1 = [s1, s2, s3, s4, s5];
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsestartRule() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parselabel();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c11(s1);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsetypeSpec();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parseCodeMap();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c12(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parseshape() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parse_VIRTUAL();
      if (s1 === peg$FAILED) {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parselabel();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsetypeSpec();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseCodeMap();
                if (s6 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c13(s1, s2, s4, s6);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_VIRTUAL() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parseVIRTUAL();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c14();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsetypeSpec() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseinclude();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseinclude();
      }
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 123) {
          s2 = peg$c15;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c16); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseOrExpression();
            if (s4 === peg$FAILED) {
              s4 = peg$c2;
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 125) {
                  s6 = peg$c17;
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c18); }
                }
                if (s6 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c19(s1, s4);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseinclude() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 38) {
        s1 = peg$c20;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c21); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parselabel();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c22(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseOrExpression() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parseAndExpression();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsedisjoint();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parsedisjoint();
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c23(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsedisjoint() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 124) {
        s1 = peg$c24;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c25); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseAndExpression();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c26(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseAndExpression() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parseUnaryExpression();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseconjoint();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parseconjoint();
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c27(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseconjoint() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 44) {
        s1 = peg$c28;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c29); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseUnaryExpression();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c26(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseUnaryExpression() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

      s0 = peg$currPos;
      s1 = peg$parse_id();
      if (s1 === peg$FAILED) {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsearc();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c30(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseinclude();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c31(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parse_id();
          if (s1 === peg$FAILED) {
            s1 = peg$c2;
          }
          if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 40) {
              s2 = peg$c32;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c33); }
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parse_();
              if (s3 !== peg$FAILED) {
                s4 = peg$parseOrExpression();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parse_();
                  if (s5 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 41) {
                      s6 = peg$c34;
                      peg$currPos++;
                    } else {
                      s6 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c35); }
                    }
                    if (s6 !== peg$FAILED) {
                      s7 = peg$parse_();
                      if (s7 !== peg$FAILED) {
                        s8 = peg$parserepeatCount();
                        if (s8 === peg$FAILED) {
                          s8 = peg$c2;
                        }
                        if (s8 !== peg$FAILED) {
                          s9 = peg$parse_();
                          if (s9 !== peg$FAILED) {
                            s10 = peg$parseCodeMap();
                            if (s10 !== peg$FAILED) {
                              peg$reportedPos = s0;
                              s1 = peg$c36(s1, s4, s8, s10);
                              s0 = s1;
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c0;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c0;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        }
      }

      return s0;
    }

    function peg$parse_id() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 36) {
        s1 = peg$c37;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c38); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseiri();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c39(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parselabel() {
      var s0;

      s0 = peg$parseiri();
      if (s0 === peg$FAILED) {
        s0 = peg$parseBlankNode();
      }

      return s0;
    }

    function peg$parseREQ_LEVEL_CHARS_BASE() {
      var s0;

      if (peg$c40.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c41); }
      }
      if (s0 === peg$FAILED) {
        if (peg$c42.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c43); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 32) {
            s0 = peg$c44;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c45); }
          }
        }
      }

      return s0;
    }

    function peg$parseREQ_LEVEL_CHARS() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parseREQ_LEVEL_CHARS_BASE();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseREQ_LEVEL_CHARS();
        if (s2 === peg$FAILED) {
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c46(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseREQ_LEVEL() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 96) {
        s1 = peg$c47;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c48); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseREQ_LEVEL_CHARS();
        if (s2 !== peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c49) {
            s3 = peg$c49;
            peg$currPos += 2;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c50); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c51(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsearc() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16;

      s0 = peg$currPos;
      s1 = peg$parseCONCOMITANT();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 64) {
            s3 = peg$c52;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c53); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parselabel();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parserepeatCount();
                  if (s7 === peg$FAILED) {
                    s7 = peg$c2;
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parse_();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parseproperties();
                      if (s9 === peg$FAILED) {
                        s9 = peg$c2;
                      }
                      if (s9 !== peg$FAILED) {
                        s10 = peg$parse_();
                        if (s10 !== peg$FAILED) {
                          s11 = peg$parseCodeMap();
                          if (s11 !== peg$FAILED) {
                            peg$reportedPos = s0;
                            s1 = peg$c54(s5, s7, s9, s11);
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c0;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseREQ_LEVEL();
        if (s1 === peg$FAILED) {
          s1 = peg$c2;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            s3 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 33) {
              s4 = peg$c55;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c56); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s4 = [s4, s5];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
            if (s3 === peg$FAILED) {
              s3 = peg$c2;
            }
            if (s3 !== peg$FAILED) {
              s4 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 94) {
                s5 = peg$c57;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c58); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  s5 = [s5, s6];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$c0;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$c0;
              }
              if (s4 === peg$FAILED) {
                s4 = peg$c2;
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$currPos;
                if (input.charCodeAt(peg$currPos) === 43) {
                  s6 = peg$c59;
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c60); }
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse_();
                  if (s7 !== peg$FAILED) {
                    s6 = [s6, s7];
                    s5 = s6;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$c0;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$c0;
                }
                if (s5 === peg$FAILED) {
                  s5 = peg$c2;
                }
                if (s5 !== peg$FAILED) {
                  s6 = peg$parsenameClass();
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parse_();
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parsevalueClass();
                      if (s8 !== peg$FAILED) {
                        s9 = peg$parse_();
                        if (s9 !== peg$FAILED) {
                          s10 = peg$parsedefahlt();
                          if (s10 === peg$FAILED) {
                            s10 = peg$c2;
                          }
                          if (s10 !== peg$FAILED) {
                            s11 = peg$parse_();
                            if (s11 !== peg$FAILED) {
                              s12 = peg$parserepeatCount();
                              if (s12 === peg$FAILED) {
                                s12 = peg$c2;
                              }
                              if (s12 !== peg$FAILED) {
                                s13 = peg$parse_();
                                if (s13 !== peg$FAILED) {
                                  s14 = peg$parseproperties();
                                  if (s14 === peg$FAILED) {
                                    s14 = peg$c2;
                                  }
                                  if (s14 !== peg$FAILED) {
                                    s15 = peg$parse_();
                                    if (s15 !== peg$FAILED) {
                                      s16 = peg$parseCodeMap();
                                      if (s16 !== peg$FAILED) {
                                        peg$reportedPos = s0;
                                        s1 = peg$c61(s1, s3, s4, s5, s6, s8, s10, s12, s14, s16);
                                        s0 = s1;
                                      } else {
                                        peg$currPos = s0;
                                        s0 = peg$c0;
                                      }
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$c0;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$c0;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$c0;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c0;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c0;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c0;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parsenameClass() {
      var s0, s1, s2, s3;

      s0 = peg$parse_nmIriStem();
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseRDF_TYPE();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c62(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 46) {
            s1 = peg$c63;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c64); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              s3 = peg$parseexclusions();
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c65(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        }
      }

      return s0;
    }

    function peg$parse_nmIriStem() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parseiri();
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseTILDE();
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseexclusions();
              if (s6 !== peg$FAILED) {
                s3 = [s3, s4, s5, s6];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c0;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c0;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 === peg$FAILED) {
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c66(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsevalueClass() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 64) {
        s1 = peg$c52;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c53); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parselabel();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c67(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsetypeSpec();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c68(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parse_objSingleIriStem();
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c69(s1);
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parsenodeType();
            if (s1 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c70(s1);
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parseiri();
              if (s1 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c71(s1);
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$parsevalueSet();
                if (s1 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c72(s1);
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.charCodeAt(peg$currPos) === 46) {
                    s1 = peg$c63;
                    peg$currPos++;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c64); }
                  }
                  if (s1 !== peg$FAILED) {
                    s2 = peg$parse_();
                    if (s2 !== peg$FAILED) {
                      s3 = peg$parseexclusions();
                      if (s3 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c73(s3);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsenodeType() {
      var s0;

      s0 = peg$parseIRI();
      if (s0 === peg$FAILED) {
        s0 = peg$parseLITERAL();
        if (s0 === peg$FAILED) {
          s0 = peg$parseBNODE();
          if (s0 === peg$FAILED) {
            s0 = peg$parseNONLITERAL();
          }
        }
      }

      return s0;
    }

    function peg$parsedefahlt() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 61) {
        s1 = peg$c9;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c10); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_iri_OR_literal();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c74(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_iri_OR_literal() {
      var s0;

      s0 = peg$parseiri();
      if (s0 === peg$FAILED) {
        s0 = peg$parseliteral();
      }

      return s0;
    }

    function peg$parsepredicateObjectList() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseverb();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseobjectList();
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$currPos;
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 59) {
                s7 = peg$c75;
                peg$currPos++;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c76); }
              }
              if (s7 !== peg$FAILED) {
                s8 = peg$parse_();
                if (s8 !== peg$FAILED) {
                  s9 = [];
                  s10 = peg$currPos;
                  s11 = peg$parseverb();
                  if (s11 !== peg$FAILED) {
                    s12 = peg$parseobjectList();
                    if (s12 !== peg$FAILED) {
                      s11 = [s11, s12];
                      s10 = s11;
                    } else {
                      peg$currPos = s10;
                      s10 = peg$c0;
                    }
                  } else {
                    peg$currPos = s10;
                    s10 = peg$c0;
                  }
                  while (s10 !== peg$FAILED) {
                    s9.push(s10);
                    s10 = peg$currPos;
                    s11 = peg$parseverb();
                    if (s11 !== peg$FAILED) {
                      s12 = peg$parseobjectList();
                      if (s12 !== peg$FAILED) {
                        s11 = [s11, s12];
                        s10 = s11;
                      } else {
                        peg$currPos = s10;
                        s10 = peg$c0;
                      }
                    } else {
                      peg$currPos = s10;
                      s10 = peg$c0;
                    }
                  }
                  if (s9 !== peg$FAILED) {
                    s6 = [s6, s7, s8, s9];
                    s5 = s6;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$c0;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$c0;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$c0;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$c0;
            }
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$currPos;
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 59) {
                  s7 = peg$c75;
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c76); }
                }
                if (s7 !== peg$FAILED) {
                  s8 = peg$parse_();
                  if (s8 !== peg$FAILED) {
                    s9 = [];
                    s10 = peg$currPos;
                    s11 = peg$parseverb();
                    if (s11 !== peg$FAILED) {
                      s12 = peg$parseobjectList();
                      if (s12 !== peg$FAILED) {
                        s11 = [s11, s12];
                        s10 = s11;
                      } else {
                        peg$currPos = s10;
                        s10 = peg$c0;
                      }
                    } else {
                      peg$currPos = s10;
                      s10 = peg$c0;
                    }
                    while (s10 !== peg$FAILED) {
                      s9.push(s10);
                      s10 = peg$currPos;
                      s11 = peg$parseverb();
                      if (s11 !== peg$FAILED) {
                        s12 = peg$parseobjectList();
                        if (s12 !== peg$FAILED) {
                          s11 = [s11, s12];
                          s10 = s11;
                        } else {
                          peg$currPos = s10;
                          s10 = peg$c0;
                        }
                      } else {
                        peg$currPos = s10;
                        s10 = peg$c0;
                      }
                    }
                    if (s9 !== peg$FAILED) {
                      s6 = [s6, s7, s8, s9];
                      s5 = s6;
                    } else {
                      peg$currPos = s5;
                      s5 = peg$c0;
                    }
                  } else {
                    peg$currPos = s5;
                    s5 = peg$c0;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$c0;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$c0;
              }
            }
            if (s4 !== peg$FAILED) {
              s1 = [s1, s2, s3, s4];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseverb() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parseiri();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c77(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseRDF_TYPE();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c77(s1);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseobjectList() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseobject();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$parse_();
          if (s5 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s6 = peg$c28;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c29); }
            }
            if (s6 !== peg$FAILED) {
              s7 = peg$parse_();
              if (s7 !== peg$FAILED) {
                s8 = peg$parseobject();
                if (s8 !== peg$FAILED) {
                  s5 = [s5, s6, s7, s8];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$c0;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$c0;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$c0;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$c0;
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$currPos;
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s6 = peg$c28;
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c29); }
              }
              if (s6 !== peg$FAILED) {
                s7 = peg$parse_();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parseobject();
                  if (s8 !== peg$FAILED) {
                    s5 = [s5, s6, s7, s8];
                    s4 = s5;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$c0;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$c0;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$c0;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$c0;
            }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c78(s2, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseobject() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parseiri();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c79(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseBlankNode();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c79(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsecollection();
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c79(s1);
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parseblankNodePropertyList();
            if (s1 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c79(s1);
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parseliteral();
              if (s1 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c79(s1);
              }
              s0 = s1;
            }
          }
        }
      }

      return s0;
    }

    function peg$parseblankNodePropertyList() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parse_lbracket();
      if (s1 !== peg$FAILED) {
        s2 = peg$parsepredicateObjectList();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_rbracket();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c80(s1);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_lbracket() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 91) {
        s1 = peg$c81;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c82); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c83();
      }
      s0 = s1;

      return s0;
    }

    function peg$parse_rbracket() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 93) {
        s0 = peg$c84;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c85); }
      }

      return s0;
    }

    function peg$parsecollection() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parse_openCollection();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parse_members();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parse_members();
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_closeCollection();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c86(s4);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_openCollection() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 40) {
        s1 = peg$c32;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c33); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c87();
      }
      s0 = s1;

      return s0;
    }

    function peg$parse_closeCollection() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 41) {
        s1 = peg$c34;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c35); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c88();
      }
      s0 = s1;

      return s0;
    }

    function peg$parse_members() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parseobject();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c89(s1);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseproperties() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parse_lbracket1();
      if (s1 !== peg$FAILED) {
        s2 = peg$parsepredicateObjectList();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_rbracket1();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c80(s1);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_lbracket1() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 91) {
        s1 = peg$c81;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c82); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c90();
      }
      s0 = s1;

      return s0;
    }

    function peg$parse_rbracket1() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 93) {
        s0 = peg$c84;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c85); }
      }

      return s0;
    }

    function peg$parseexclusions() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parse_excl();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parse_excl();
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c91(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parse_excl() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 45) {
        s1 = peg$c92;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c93); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseiri();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c94(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parserepeatCount() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 42) {
        s1 = peg$c95;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c96); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c97();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 43) {
          s1 = peg$c59;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c60); }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c98();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 63) {
            s1 = peg$c99;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c100); }
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c101();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parse_openBRACE();
            if (s1 !== peg$FAILED) {
              s2 = peg$parseINTEGER();
              if (s2 !== peg$FAILED) {
                s3 = peg$parse_();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parse_max();
                  if (s4 === peg$FAILED) {
                    s4 = peg$c2;
                  }
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parse_();
                    if (s5 !== peg$FAILED) {
                      s6 = peg$parse_closeBRACE();
                      if (s6 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c102(s2, s4, s6);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          }
        }
      }

      return s0;
    }

    function peg$parse_openBRACE() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 123) {
        s0 = peg$c15;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c16); }
      }

      return s0;
    }

    function peg$parse_closeBRACE() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 125) {
        s1 = peg$c17;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c18); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c103();
      }
      s0 = s1;

      return s0;
    }

    function peg$parse_max() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 44) {
        s1 = peg$c28;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c29); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_upper();
          if (s3 === peg$FAILED) {
            s3 = peg$c2;
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c104(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_upper() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 42) {
        s1 = peg$c95;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c96); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c105();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseINTEGER();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c94(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parsevalueSet() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parse_openPAREN();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parse_values();
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parse_values();
            }
          } else {
            s3 = peg$c0;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_closePAREN();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c106(s3, s4);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_openPAREN() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 40) {
        s0 = peg$c32;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c33); }
      }

      return s0;
    }

    function peg$parse_closePAREN() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 41) {
        s1 = peg$c34;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c35); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c103();
      }
      s0 = s1;

      return s0;
    }

    function peg$parse_values() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsevalueChoice();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c74(s1);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseCodeMap() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parse_codePair();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parse_codePair();
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c107(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parse_codePair() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parseCODE();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c108(s1);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_objSingleIriStem() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parseiri();
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseTILDE();
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseexclusions();
              if (s6 !== peg$FAILED) {
                s3 = [s3, s4, s5, s6];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c0;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c0;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c109(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_objIriStem() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parseiri();
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseTILDE();
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseexclusions();
              if (s6 !== peg$FAILED) {
                s3 = [s3, s4, s5, s6];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c0;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c0;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 === peg$FAILED) {
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c110(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseTILDE() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 126) {
        s1 = peg$c111;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c112); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c103();
      }
      s0 = s1;

      return s0;
    }

    function peg$parsevalueChoice() {
      var s0, s1;

      s0 = peg$parse_objIriStem();
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseliteral();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c113(s1);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseliteral() {
      var s0;

      s0 = peg$parseRDFLiteral();
      if (s0 === peg$FAILED) {
        s0 = peg$parseNumericLiteral();
        if (s0 === peg$FAILED) {
          s0 = peg$parseBooleanLiteral();
        }
      }

      return s0;
    }

    function peg$parseNumericLiteral() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parseDOUBLE();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c114(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseDECIMAL();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c115(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseINTEGER();
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c116(s1);
          }
          s0 = s1;
        }
      }

      return s0;
    }

    function peg$parseRDFLiteral() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseString();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseLANGTAG();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c117(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseString();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c118) {
              s3 = peg$c118;
              peg$currPos += 2;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c119); }
            }
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_();
              if (s4 !== peg$FAILED) {
                s5 = peg$parseiri();
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c120(s1, s5);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseString();
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c121(s1);
          }
          s0 = s1;
        }
      }

      return s0;
    }

    function peg$parseBooleanLiteral() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c122) {
        s1 = peg$c122;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c123); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c124();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 5) === peg$c125) {
          s1 = peg$c125;
          peg$currPos += 5;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c126); }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c127();
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseString() {
      var s0;

      s0 = peg$parseSTRING_LITERAL_LONG1();
      if (s0 === peg$FAILED) {
        s0 = peg$parseSTRING_LITERAL_LONG2();
        if (s0 === peg$FAILED) {
          s0 = peg$parseSTRING_LITERAL1();
          if (s0 === peg$FAILED) {
            s0 = peg$parseSTRING_LITERAL2();
          }
        }
      }

      return s0;
    }

    function peg$parseiri() {
      var s0;

      s0 = peg$parseIRIREF();
      if (s0 === peg$FAILED) {
        s0 = peg$parsePrefixedName();
      }

      return s0;
    }

    function peg$parsePrefixedName() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parsePNAME_LN();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c128(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsePNAME_NS();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c129(s1);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseBlankNode() {
      var s0;

      s0 = peg$parseBLANK_NODE_LABEL();
      if (s0 === peg$FAILED) {
        s0 = peg$parseANON();
      }

      return s0;
    }

    function peg$parseCODE() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 37) {
        s1 = peg$c130;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c131); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        if (peg$c132.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c133); }
        }
        if (s3 !== peg$FAILED) {
          s4 = [];
          if (peg$c134.test(input.charAt(peg$currPos))) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c135); }
          }
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            if (peg$c134.test(input.charAt(peg$currPos))) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c135); }
            }
          }
          if (s4 !== peg$FAILED) {
            s3 = [s3, s4];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 === peg$FAILED) {
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 123) {
            s3 = peg$c15;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c16); }
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            if (peg$c136.test(input.charAt(peg$currPos))) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c137); }
            }
            if (s5 === peg$FAILED) {
              s5 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 92) {
                s6 = peg$c138;
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c139); }
              }
              if (s6 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 37) {
                  s7 = peg$c130;
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c131); }
                }
                if (s7 !== peg$FAILED) {
                  s6 = [s6, s7];
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$c0;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$c0;
              }
            }
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              if (peg$c136.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c137); }
              }
              if (s5 === peg$FAILED) {
                s5 = peg$currPos;
                if (input.charCodeAt(peg$currPos) === 92) {
                  s6 = peg$c138;
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c139); }
                }
                if (s6 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 37) {
                    s7 = peg$c130;
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c131); }
                  }
                  if (s7 !== peg$FAILED) {
                    s6 = [s6, s7];
                    s5 = s6;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$c0;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$c0;
                }
              }
            }
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 37) {
                s5 = peg$c130;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c131); }
              }
              if (s5 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 125) {
                  s6 = peg$c17;
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c18); }
                }
                if (s6 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c140(s2, s4);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseVIRTUAL() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      if (peg$c141.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c142); }
      }
      if (s1 !== peg$FAILED) {
        if (peg$c143.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c144); }
        }
        if (s2 !== peg$FAILED) {
          if (peg$c145.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c146); }
          }
          if (s3 !== peg$FAILED) {
            if (peg$c147.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c148); }
            }
            if (s4 !== peg$FAILED) {
              if (peg$c149.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c150); }
              }
              if (s5 !== peg$FAILED) {
                if (peg$c151.test(input.charAt(peg$currPos))) {
                  s6 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c152); }
                }
                if (s6 !== peg$FAILED) {
                  if (peg$c153.test(input.charAt(peg$currPos))) {
                    s7 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c154); }
                  }
                  if (s7 !== peg$FAILED) {
                    s1 = [s1, s2, s3, s4, s5, s6, s7];
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseIRI() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (peg$c143.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c144); }
      }
      if (s1 !== peg$FAILED) {
        if (peg$c145.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c146); }
        }
        if (s2 !== peg$FAILED) {
          if (peg$c143.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c144); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c155();
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseLITERAL() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      if (peg$c153.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c154); }
      }
      if (s1 !== peg$FAILED) {
        if (peg$c143.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c144); }
        }
        if (s2 !== peg$FAILED) {
          if (peg$c147.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c148); }
          }
          if (s3 !== peg$FAILED) {
            if (peg$c156.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c157); }
            }
            if (s4 !== peg$FAILED) {
              if (peg$c145.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c146); }
              }
              if (s5 !== peg$FAILED) {
                if (peg$c151.test(input.charAt(peg$currPos))) {
                  s6 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c152); }
                }
                if (s6 !== peg$FAILED) {
                  if (peg$c153.test(input.charAt(peg$currPos))) {
                    s7 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c154); }
                  }
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c158();
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseBNODE() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (peg$c159.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c160); }
      }
      if (s1 !== peg$FAILED) {
        if (peg$c161.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c162); }
        }
        if (s2 !== peg$FAILED) {
          if (peg$c163.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c164); }
          }
          if (s3 !== peg$FAILED) {
            if (peg$c165.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c166); }
            }
            if (s4 !== peg$FAILED) {
              if (peg$c156.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c157); }
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c167();
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseNONLITERAL() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

      s0 = peg$currPos;
      if (peg$c161.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c162); }
      }
      if (s1 !== peg$FAILED) {
        if (peg$c163.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c164); }
        }
        if (s2 !== peg$FAILED) {
          if (peg$c161.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c162); }
          }
          if (s3 !== peg$FAILED) {
            if (peg$c153.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c154); }
            }
            if (s4 !== peg$FAILED) {
              if (peg$c143.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c144); }
              }
              if (s5 !== peg$FAILED) {
                if (peg$c147.test(input.charAt(peg$currPos))) {
                  s6 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c148); }
                }
                if (s6 !== peg$FAILED) {
                  if (peg$c156.test(input.charAt(peg$currPos))) {
                    s7 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c157); }
                  }
                  if (s7 !== peg$FAILED) {
                    if (peg$c145.test(input.charAt(peg$currPos))) {
                      s8 = input.charAt(peg$currPos);
                      peg$currPos++;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c146); }
                    }
                    if (s8 !== peg$FAILED) {
                      if (peg$c151.test(input.charAt(peg$currPos))) {
                        s9 = input.charAt(peg$currPos);
                        peg$currPos++;
                      } else {
                        s9 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c152); }
                      }
                      if (s9 !== peg$FAILED) {
                        if (peg$c153.test(input.charAt(peg$currPos))) {
                          s10 = input.charAt(peg$currPos);
                          peg$currPos++;
                        } else {
                          s10 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c154); }
                        }
                        if (s10 !== peg$FAILED) {
                          peg$reportedPos = s0;
                          s1 = peg$c168();
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseRDF_TYPE() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 97) {
        s1 = peg$c169;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c170); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c171();
      }
      s0 = s1;

      return s0;
    }

    function peg$parseIRIREF() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parse_IRIREF_BEGIN();
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c172.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c173); }
        }
        if (s3 === peg$FAILED) {
          s3 = peg$parseUCHAR();
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c172.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c173); }
          }
          if (s3 === peg$FAILED) {
            s3 = peg$parseUCHAR();
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_IRIREF_END();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c174(s1, s2, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_IRIREF_BEGIN() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 60) {
        s1 = peg$c175;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c176); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c177();
      }
      s0 = s1;

      return s0;
    }

    function peg$parse_IRIREF_END() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 62) {
        s1 = peg$c178;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c179); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c177();
      }
      s0 = s1;

      return s0;
    }

    function peg$parseCONCOMITANT() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;

      s0 = peg$currPos;
      if (peg$c180.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c181); }
      }
      if (s1 !== peg$FAILED) {
        if (peg$c163.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c164); }
        }
        if (s2 !== peg$FAILED) {
          if (peg$c161.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c162); }
          }
          if (s3 !== peg$FAILED) {
            if (peg$c180.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c181); }
            }
            if (s4 !== peg$FAILED) {
              if (peg$c163.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c164); }
              }
              if (s5 !== peg$FAILED) {
                if (peg$c182.test(input.charAt(peg$currPos))) {
                  s6 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c183); }
                }
                if (s6 !== peg$FAILED) {
                  if (peg$c143.test(input.charAt(peg$currPos))) {
                    s7 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c144); }
                  }
                  if (s7 !== peg$FAILED) {
                    if (peg$c147.test(input.charAt(peg$currPos))) {
                      s8 = input.charAt(peg$currPos);
                      peg$currPos++;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c148); }
                    }
                    if (s8 !== peg$FAILED) {
                      if (peg$c151.test(input.charAt(peg$currPos))) {
                        s9 = input.charAt(peg$currPos);
                        peg$currPos++;
                      } else {
                        s9 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c152); }
                      }
                      if (s9 !== peg$FAILED) {
                        if (peg$c161.test(input.charAt(peg$currPos))) {
                          s10 = input.charAt(peg$currPos);
                          peg$currPos++;
                        } else {
                          s10 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c162); }
                        }
                        if (s10 !== peg$FAILED) {
                          if (peg$c147.test(input.charAt(peg$currPos))) {
                            s11 = input.charAt(peg$currPos);
                            peg$currPos++;
                          } else {
                            s11 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c148); }
                          }
                          if (s11 !== peg$FAILED) {
                            s1 = [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11];
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c0;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseSPARQL_PREFIX() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (peg$c184.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c185); }
      }
      if (s1 !== peg$FAILED) {
        if (peg$c145.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c146); }
        }
        if (s2 !== peg$FAILED) {
          if (peg$c156.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c157); }
          }
          if (s3 !== peg$FAILED) {
            if (peg$c186.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c187); }
            }
            if (s4 !== peg$FAILED) {
              if (peg$c143.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c144); }
              }
              if (s5 !== peg$FAILED) {
                if (peg$c188.test(input.charAt(peg$currPos))) {
                  s6 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c189); }
                }
                if (s6 !== peg$FAILED) {
                  s1 = [s1, s2, s3, s4, s5, s6];
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseSPARQL_BASE() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (peg$c159.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c160); }
      }
      if (s1 !== peg$FAILED) {
        if (peg$c151.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c152); }
        }
        if (s2 !== peg$FAILED) {
          if (peg$c190.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c191); }
          }
          if (s3 !== peg$FAILED) {
            if (peg$c156.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c157); }
            }
            if (s4 !== peg$FAILED) {
              s1 = [s1, s2, s3, s4];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsePNAME_NS() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsePN_PREFIX();
      if (s1 === peg$FAILED) {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 58) {
          s2 = peg$c192;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c193); }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c194(s1);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsePNAME_LN() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsePNAME_NS();
      if (s1 !== peg$FAILED) {
        s2 = peg$parsePN_LOCAL();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c195(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseBLANK_NODE_LABEL() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c196) {
        s1 = peg$c196;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c197); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsePN_CHARS_U();
        if (s2 === peg$FAILED) {
          if (peg$c198.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c199); }
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseBLANK_NODE_LABEL2();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parseBLANK_NODE_LABEL2();
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c200(s2, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseBLANK_NODE_LABEL2() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s1 = peg$c63;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c64); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseBLANK_NODE_LABEL2();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c201(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsePN_CHARS();
        if (s1 !== peg$FAILED) {
          s2 = peg$parseBLANK_NODE_LABEL2();
          if (s2 === peg$FAILED) {
            s2 = peg$c2;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c46(s1, s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parseLANGTAG() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 64) {
        s1 = peg$c52;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c53); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = [];
        if (peg$c202.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c203); }
        }
        if (s4 !== peg$FAILED) {
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c202.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c203); }
            }
          }
        } else {
          s3 = peg$c0;
        }
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 45) {
            s6 = peg$c92;
            peg$currPos++;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c93); }
          }
          if (s6 !== peg$FAILED) {
            s7 = [];
            if (peg$c204.test(input.charAt(peg$currPos))) {
              s8 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s8 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c205); }
            }
            if (s8 !== peg$FAILED) {
              while (s8 !== peg$FAILED) {
                s7.push(s8);
                if (peg$c204.test(input.charAt(peg$currPos))) {
                  s8 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s8 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c205); }
                }
              }
            } else {
              s7 = peg$c0;
            }
            if (s7 !== peg$FAILED) {
              s6 = [s6, s7];
              s5 = s6;
            } else {
              peg$currPos = s5;
              s5 = peg$c0;
            }
          } else {
            peg$currPos = s5;
            s5 = peg$c0;
          }
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 45) {
              s6 = peg$c92;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c93); }
            }
            if (s6 !== peg$FAILED) {
              s7 = [];
              if (peg$c204.test(input.charAt(peg$currPos))) {
                s8 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s8 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c205); }
              }
              if (s8 !== peg$FAILED) {
                while (s8 !== peg$FAILED) {
                  s7.push(s8);
                  if (peg$c204.test(input.charAt(peg$currPos))) {
                    s8 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s8 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c205); }
                  }
                }
              } else {
                s7 = peg$c0;
              }
              if (s7 !== peg$FAILED) {
                s6 = [s6, s7];
                s5 = s6;
              } else {
                peg$currPos = s5;
                s5 = peg$c0;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$c0;
            }
          }
          if (s4 !== peg$FAILED) {
            s3 = [s3, s4];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c206(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseINTEGER() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (peg$c207.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c208); }
      }
      if (s1 === peg$FAILED) {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c198.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c199); }
        }
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (peg$c198.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c199); }
            }
          }
        } else {
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c209(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseDECIMAL() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (peg$c207.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c208); }
      }
      if (s1 === peg$FAILED) {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c198.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c199); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c198.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c199); }
          }
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 46) {
            s3 = peg$c63;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c64); }
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            if (peg$c198.test(input.charAt(peg$currPos))) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c199); }
            }
            if (s5 !== peg$FAILED) {
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                if (peg$c198.test(input.charAt(peg$currPos))) {
                  s5 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c199); }
                }
              }
            } else {
              s4 = peg$c0;
            }
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c210(s1, s2, s4);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseDOUBLE() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (peg$c207.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c208); }
      }
      if (s1 === peg$FAILED) {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_DOUBLE_VAL();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c211(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_DOUBLE_VAL() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c198.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c199); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c198.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c199); }
          }
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 46) {
          s2 = peg$c63;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c64); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c198.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c199); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c198.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c199); }
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseEXPONENT();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c212(s1, s3, s4);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 46) {
          s1 = peg$c63;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c64); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          if (peg$c198.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c199); }
          }
          if (s3 !== peg$FAILED) {
            while (s3 !== peg$FAILED) {
              s2.push(s3);
              if (peg$c198.test(input.charAt(peg$currPos))) {
                s3 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c199); }
              }
            }
          } else {
            s2 = peg$c0;
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseEXPONENT();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c213(s2, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = [];
          if (peg$c198.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c199); }
          }
          if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              if (peg$c198.test(input.charAt(peg$currPos))) {
                s2 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c199); }
              }
            }
          } else {
            s1 = peg$c0;
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parseEXPONENT();
            if (s2 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c214(s1, s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        }
      }

      return s0;
    }

    function peg$parseEXPONENT() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (peg$c215.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c216); }
      }
      if (s1 !== peg$FAILED) {
        if (peg$c207.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c208); }
        }
        if (s2 === peg$FAILED) {
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          if (peg$c198.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c199); }
          }
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              if (peg$c198.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c199); }
              }
            }
          } else {
            s3 = peg$c0;
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c217(s1, s2, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseSTRING_LITERAL1() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parse_STRING_LITERAL1_DELIM();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parse_NON_1();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parse_NON_1();
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_STRING_LITERAL1_DELIM();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c218(s1, s2, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_STRING_LITERAL1_DELIM() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 39) {
        s1 = peg$c219;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c220); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c177();
      }
      s0 = s1;

      return s0;
    }

    function peg$parse_NON_1() {
      var s0;

      if (peg$c221.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c222); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseECHAR();
        if (s0 === peg$FAILED) {
          s0 = peg$parseUCHAR();
        }
      }

      return s0;
    }

    function peg$parseSTRING_LITERAL2() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parse_STRING_LITERAL2_DELIM();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parse_NON_2();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parse_NON_2();
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_STRING_LITERAL2_DELIM();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c218(s1, s2, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_STRING_LITERAL2_DELIM() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 34) {
        s1 = peg$c223;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c224); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c177();
      }
      s0 = s1;

      return s0;
    }

    function peg$parse_NON_2() {
      var s0;

      if (peg$c225.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c226); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseECHAR();
        if (s0 === peg$FAILED) {
          s0 = peg$parseUCHAR();
        }
      }

      return s0;
    }

    function peg$parseSTRING_LITERAL_LONG1() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parse_STRING_LITERAL_LONG1_DELIM();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parse_NON_LONG1();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parse_NON_LONG1();
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_STRING_LITERAL_LONG1_DELIM();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c227(s1, s2, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_STRING_LITERAL_LONG1_DELIM() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c228) {
        s1 = peg$c228;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c229); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c177();
      }
      s0 = s1;

      return s0;
    }

    function peg$parse_NON_LONG1() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parse_LONG1();
      if (s1 === peg$FAILED) {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        if (peg$c230.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c231); }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c232(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseECHAR();
        if (s0 === peg$FAILED) {
          s0 = peg$parseUCHAR();
        }
      }

      return s0;
    }

    function peg$parse_LONG1() {
      var s0;

      if (input.substr(peg$currPos, 2) === peg$c233) {
        s0 = peg$c233;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c234); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 39) {
          s0 = peg$c219;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c220); }
        }
      }

      return s0;
    }

    function peg$parseSTRING_LITERAL_LONG2() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parse_STRING_LITERAL_LONG2_DELIM();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parse_NON_LONG2();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parse_NON_LONG2();
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_STRING_LITERAL_LONG2_DELIM();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c227(s1, s2, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_STRING_LITERAL_LONG2_DELIM() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c235) {
        s1 = peg$c235;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c236); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c177();
      }
      s0 = s1;

      return s0;
    }

    function peg$parse_NON_LONG2() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parse_LONG2();
      if (s1 === peg$FAILED) {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        if (peg$c237.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c238); }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c239(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseECHAR();
        if (s0 === peg$FAILED) {
          s0 = peg$parseUCHAR();
        }
      }

      return s0;
    }

    function peg$parse_LONG2() {
      var s0;

      if (input.substr(peg$currPos, 2) === peg$c240) {
        s0 = peg$c240;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c241); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 34) {
          s0 = peg$c223;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c224); }
        }
      }

      return s0;
    }

    function peg$parseUCHAR() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c242) {
        s1 = peg$c242;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c243); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$parseHEX();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseHEX();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseHEX();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseHEX();
              if (s6 !== peg$FAILED) {
                s3 = [s3, s4, s5, s6];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c0;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c0;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c244(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c245) {
          s1 = peg$c245;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c246); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = peg$parseHEX();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseHEX();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseHEX();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseHEX();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseHEX();
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parseHEX();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parseHEX();
                      if (s9 !== peg$FAILED) {
                        s10 = peg$parseHEX();
                        if (s10 !== peg$FAILED) {
                          s3 = [s3, s4, s5, s6, s7, s8, s9, s10];
                          s2 = s3;
                        } else {
                          peg$currPos = s2;
                          s2 = peg$c0;
                        }
                      } else {
                        peg$currPos = s2;
                        s2 = peg$c0;
                      }
                    } else {
                      peg$currPos = s2;
                      s2 = peg$c0;
                    }
                  } else {
                    peg$currPos = s2;
                    s2 = peg$c0;
                  }
                } else {
                  peg$currPos = s2;
                  s2 = peg$c0;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$c0;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c0;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c247(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parseECHAR() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 92) {
        s1 = peg$c138;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c139); }
      }
      if (s1 !== peg$FAILED) {
        if (peg$c248.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c249); }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c250(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseANON() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 91) {
        s1 = peg$c81;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c82); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 93) {
            s3 = peg$c84;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c85); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c251(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsePN_CHARS_BASE() {
      var s0;

      if (peg$c40.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c41); }
      }
      if (s0 === peg$FAILED) {
        if (peg$c42.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c43); }
        }
        if (s0 === peg$FAILED) {
          if (peg$c252.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c253); }
          }
          if (s0 === peg$FAILED) {
            if (peg$c254.test(input.charAt(peg$currPos))) {
              s0 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c255); }
            }
            if (s0 === peg$FAILED) {
              if (peg$c256.test(input.charAt(peg$currPos))) {
                s0 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c257); }
              }
              if (s0 === peg$FAILED) {
                if (peg$c258.test(input.charAt(peg$currPos))) {
                  s0 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c259); }
                }
                if (s0 === peg$FAILED) {
                  if (peg$c260.test(input.charAt(peg$currPos))) {
                    s0 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c261); }
                  }
                  if (s0 === peg$FAILED) {
                    if (peg$c262.test(input.charAt(peg$currPos))) {
                      s0 = input.charAt(peg$currPos);
                      peg$currPos++;
                    } else {
                      s0 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c263); }
                    }
                    if (s0 === peg$FAILED) {
                      if (peg$c264.test(input.charAt(peg$currPos))) {
                        s0 = input.charAt(peg$currPos);
                        peg$currPos++;
                      } else {
                        s0 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c265); }
                      }
                      if (s0 === peg$FAILED) {
                        if (peg$c266.test(input.charAt(peg$currPos))) {
                          s0 = input.charAt(peg$currPos);
                          peg$currPos++;
                        } else {
                          s0 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c267); }
                        }
                        if (s0 === peg$FAILED) {
                          if (peg$c268.test(input.charAt(peg$currPos))) {
                            s0 = input.charAt(peg$currPos);
                            peg$currPos++;
                          } else {
                            s0 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c269); }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsePN_CHARS_U() {
      var s0;

      s0 = peg$parsePN_CHARS_BASE();
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 95) {
          s0 = peg$c270;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c271); }
        }
      }

      return s0;
    }

    function peg$parsePN_CHARS() {
      var s0;

      s0 = peg$parsePN_CHARS_U();
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 45) {
          s0 = peg$c92;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c93); }
        }
        if (s0 === peg$FAILED) {
          if (peg$c198.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c199); }
          }
          if (s0 === peg$FAILED) {
            if (peg$c272.test(input.charAt(peg$currPos))) {
              s0 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c273); }
            }
            if (s0 === peg$FAILED) {
              if (peg$c274.test(input.charAt(peg$currPos))) {
                s0 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c275); }
              }
              if (s0 === peg$FAILED) {
                if (peg$c276.test(input.charAt(peg$currPos))) {
                  s0 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c277); }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsePN_PREFIX() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsePN_CHARS_BASE();
      if (s1 !== peg$FAILED) {
        s2 = peg$parsePN_PREFIX2();
        if (s2 === peg$FAILED) {
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c278(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsePN_PREFIX2() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s1 = peg$c63;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c64); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsePN_PREFIX2();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c201(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsePN_CHARS();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsePN_PREFIX2();
          if (s2 === peg$FAILED) {
            s2 = peg$c2;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c46(s1, s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parsePN_LOCAL() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parsePN_CHARS_U();
      if (s1 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 58) {
          s1 = peg$c192;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c193); }
        }
        if (s1 === peg$FAILED) {
          if (peg$c198.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c199); }
          }
          if (s1 === peg$FAILED) {
            s1 = peg$parsePLX();
          }
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsePN_LOCAL2();
        if (s2 === peg$FAILED) {
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c46(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsePN_LOCAL2() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s1 = peg$c63;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c64); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsePN_LOCAL2();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c201(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsePN_CHARS_colon_PLX();
        if (s1 !== peg$FAILED) {
          s2 = peg$parsePN_LOCAL2();
          if (s2 === peg$FAILED) {
            s2 = peg$c2;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c46(s1, s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parsePN_CHARS_colon_PLX() {
      var s0;

      s0 = peg$parsePN_CHARS();
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 58) {
          s0 = peg$c192;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c193); }
        }
        if (s0 === peg$FAILED) {
          s0 = peg$parsePLX();
        }
      }

      return s0;
    }

    function peg$parsePLX() {
      var s0;

      s0 = peg$parsePERCENT();
      if (s0 === peg$FAILED) {
        s0 = peg$parsePN_LOCAL_ESC();
      }

      return s0;
    }

    function peg$parsePERCENT() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 37) {
        s1 = peg$c130;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c131); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseHEX();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseHEX();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c279(s2, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseHEX() {
      var s0;

      if (peg$c198.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c199); }
      }
      if (s0 === peg$FAILED) {
        if (peg$c280.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c281); }
        }
        if (s0 === peg$FAILED) {
          if (peg$c282.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c283); }
          }
        }
      }

      return s0;
    }

    function peg$parsePN_LOCAL_ESC() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 92) {
        s1 = peg$c138;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c139); }
      }
      if (s1 !== peg$FAILED) {
        if (peg$c284.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c285); }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c86(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseWS();
      if (s2 === peg$FAILED) {
        s2 = peg$parseCOMMENT();
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseWS();
        if (s2 === peg$FAILED) {
          s2 = peg$parseCOMMENT();
        }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c286(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseWS() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c287.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c288); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c287.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c288); }
          }
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c289();
      }
      s0 = s1;

      return s0;
    }

    function peg$parseCOMMENT() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 35) {
        s1 = peg$c290;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c291); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c292.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c293); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c292.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c293); }
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c294(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }


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


    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();

},{}],3:[function(require,module,exports){
// Replace local require by a lazy loader
var globalRequire = require;
require = function () {};

// Expose submodules
var exports = module.exports = {
  Lexer:        require('./lib/N3Lexer'),
  Parser:       require('./lib/N3Parser'),
  Writer:       require('./lib/N3Writer'),
  Store:        require('./lib/N3Store'),
  StreamParser: require('./lib/N3StreamParser'),
  StreamWriter: require('./lib/N3StreamWriter'),
  Util:         require('./lib/N3Util'),
};

// Load submodules on first access
Object.keys(exports).forEach(function (submodule) {
  Object.defineProperty(exports, submodule, {
    configurable: true,
    enumerable: true,
    get: function () {
      delete exports[submodule];
      return exports[submodule] = globalRequire('./lib/N3' + submodule);
    },
  });
});

},{"./lib/N3Lexer":4,"./lib/N3Parser":5,"./lib/N3Store":6,"./lib/N3StreamParser":7,"./lib/N3StreamWriter":8,"./lib/N3Util":9,"./lib/N3Writer":10}],4:[function(require,module,exports){
// **N3Lexer** tokenizes N3 documents.
var fromCharCode = String.fromCharCode;
var immediately = typeof setImmediate === 'function' ? setImmediate :
                  function setImmediate(func) { setTimeout(func, 0); };

// Regular expression and replacement string to escape N3 strings.
// Note how we catch invalid unicode sequences separately (they will trigger an error).
var escapeSequence = /\\u([a-fA-F0-9]{4})|\\U([a-fA-F0-9]{8})|\\[uU]|\\(.)/g;
var escapeReplacements = { '\\': '\\', "'": "'", '"': '"',
                           'n': '\n', 'r': '\r', 't': '\t', 'f': '\f', 'b': '\b',
                           '_': '_', '~': '~', '.': '.', '-': '-', '!': '!', '$': '$', '&': '&',
                           '(': '(', ')': ')', '*': '*', '+': '+', ',': ',', ';': ';', '=': '=',
                           '/': '/', '?': '?', '#': '#', '@': '@', '%': '%' };
var illegalIriChars = /[\x00-\x20<>\\"\{\}\|\^\`]/;

// ## Constructor
function N3Lexer(options) {
  if (!(this instanceof N3Lexer))
    return new N3Lexer(options);

  // In line mode (N-Triples or N-Quads), only simple features may be parsed
  if (options && options.lineMode) {
    // Don't tokenize special literals
    this._tripleQuotedString = this._number = this._boolean = /$0^/;
    // Swap the tokenize method for a restricted version
    var self = this;
    this._tokenize = this.tokenize;
    this.tokenize = function (input, callback) {
      this._tokenize(input, function (error, token) {
        if (!error && /IRI|prefixed|literal|langcode|type|\.|eof/.test(token.type))
          callback && callback(error, token);
        else
          callback && callback(error || self._syntaxError(token.type, callback = null));
      });
    };
  }
}

N3Lexer.prototype = {
  // ## Regular expressions
  // It's slightly faster to have these as properties than as in-scope variables.

  _iri: /^<((?:[^>\\]|\\[uU])+)>/, // IRI with escape sequences; needs sanity check after unescaping
  _unescapedIri: /^<([^\x00-\x20<>\\"\{\}\|\^\`]*)>/, // IRI without escape sequences; no unescaping
  _unescapedString: /^"[^"\\]+"(?=[^"\\])/, // non-empty string without escape sequences
  _singleQuotedString: /^"[^"\\]*(?:\\.[^"\\]*)*"(?=[^"\\])|^'[^'\\]*(?:\\.[^'\\]*)*'(?=[^'\\])/,
  _tripleQuotedString: /^""("[^"\\]*(?:(?:\\.|"(?!""))[^"\\]*)*")""|^''('[^'\\]*(?:(?:\\.|'(?!''))[^'\\]*)*')''/,
  _langcode: /^@([a-z]+(?:-[a-z0-9]+)*)(?=[^a-z0-9\-])/i,
  _prefix: /^((?:[A-Za-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:\.?[\-0-9A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)?:(?=[#\s<])/,
  _prefixed: /^((?:[A-Za-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:\.?[\-0-9A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)?:((?:(?:[0-:A-Z_a-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff]|%[0-9a-fA-F]{2}|\\[!#-\/;=?\-@_~])(?:(?:[\.\-0-:A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff]|%[0-9a-fA-F]{2}|\\[!#-\/;=?\-@_~])*(?:[\-0-:A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff]|%[0-9a-fA-F]{2}|\\[!#-\/;=?\-@_~]))?)?)(?=\.?[,;\s#()\[\]\{\}"'<])/,
  _blank: /^_:((?:[0-9A-Z_a-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:\.?[\-0-9A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)(?=\.?[,;:\s#()\[\]\{\}"'<])/,
  _number: /^[\-+]?(?:\d+\.?\d*([eE](?:[\-\+])?\d+)|\d*\.?\d+)(?=[.,;:\s#()\[\]\{\}"'<])/,
  _boolean: /^(?:true|false)(?=[.,;:\s#()\[\]\{\}"'<])/,
  _keyword: /^@[a-z]+(?=[\s#<:])/,
  _sparqlKeyword: /^(?:PREFIX|BASE|GRAPH)(?=[\s#<:])/i,
  _shortPredicates: /^a(?=\s+|<)/,
  _newline: /^[ \t]*(?:#[^\n\r]*)?(?:\r\n|\n|\r)[ \t]*/,
  _whitespace: /^[ \t]+/,
  _endOfFile: /^(?:#[^\n\r]*)?$/,

  // ## Private methods

  // ### `_tokenizeToEnd` tokenizes as for as possible, emitting tokens through the callback.
  _tokenizeToEnd: function (callback, inputFinished) {
    // Continue parsing as far as possible; the loop will return eventually.
    var input = this._input;
    while (true) {
      // Count and skip whitespace lines.
      var whiteSpaceMatch;
      while (whiteSpaceMatch = this._newline.exec(input))
        input = input.substr(whiteSpaceMatch[0].length, input.length), this._line++;
      // Skip whitespace on current line.
      if (whiteSpaceMatch = this._whitespace.exec(input))
        input = input.substr(whiteSpaceMatch[0].length, input.length);

      // Stop for now if we're at the end.
      if (this._endOfFile.test(input)) {
        // If the input is finished, emit EOF.
        if (inputFinished)
          callback(input = null, { line: this._line, type: 'eof', value: '', prefix: '' });
        return this._input = input;
      }

      // Look for specific token types based on the first character.
      var line = this._line, type = '', value = '', prefix = '',
          firstChar = input[0], match = null, matchLength = 0, unescaped, inconclusive = false;
      switch (firstChar) {
      case '^':
        // Try to match a type.
        if (input.length === 1) break;
        else if (input[1] !== '^') return reportSyntaxError(this);
        this._prevTokenType = '^';
        // Move to type IRI or prefixed name.
        input = input.substr(2);
        if (input[0] !== '<') {
          inconclusive = true;
          break;
        }
        // Fall through in case the type is an IRI.

      case '<':
        // Try to find a full IRI without escape sequences.
        if (match = this._unescapedIri.exec(input)) {
          type = 'IRI';
          value = match[1];
        }
        // Try to find a full IRI with escape sequences.
        else if (match = this._iri.exec(input)) {
          unescaped = this._unescape(match[1]);
          if (unescaped === null || illegalIriChars.test(unescaped))
            return reportSyntaxError(this);
          type = 'IRI';
          value = unescaped;
        }
        break;

      case '_':
        // Try to find a blank node. Since it can contain (but not end with) a dot,
        // we always need a non-dot character before deciding it is a prefixed name.
        // Therefore, try inserting a space if we're at the end of the input.
        if ((match = this._blank.exec(input)) ||
            inputFinished && (match = this._blank.exec(input + ' '))) {
          type = 'prefixed';
          prefix = '_';
          value = match[1];
        }
        break;

      case '"':
      case "'":
        // Try to find a non-empty double-quoted literal without escape sequences.
        if (match = this._unescapedString.exec(input)) {
          type = 'literal';
          value = match[0];
        }
        // Try to find any other literal wrapped in a pair of single or double quotes.
        else if (match = this._singleQuotedString.exec(input)) {
          unescaped = this._unescape(match[0]);
          if (unescaped === null)
            return reportSyntaxError(this);
          type = 'literal';
          value = unescaped.replace(/^'|'$/g, '"');
        }
        // Try to find a literal wrapped in three pairs of single or double quotes.
        else if (match = this._tripleQuotedString.exec(input)) {
          unescaped = match[1] || match[2];
          // Count the newlines and advance line counter.
          this._line += unescaped.split(/\r\n|\r|\n/).length - 1;
          unescaped = this._unescape(unescaped);
          if (unescaped === null)
            return reportSyntaxError(this);
          type = 'literal';
          value = unescaped.replace(/^'|'$/g, '"');
        }
        break;

      case '@':
        // Try to find a language code.
        if (this._prevTokenType === 'literal' && (match = this._langcode.exec(input))) {
          type = 'langcode';
          value = match[1];
        }
        // Try to find a keyword.
        else if (match = this._keyword.exec(input)) {
          type = match[0];
        }
        break;

      case '.':
        // Try to find a dot as punctuation.
        if (input.length === 1 ? inputFinished : (input[1] < '0' || input[1] > '9')) {
          type = '.';
          matchLength = 1;
          break;
        }
        // Fall through to numerical case (could be a decimal dot).

      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
      case '+':
      case '-':
        // Try to find a number.
        if (match = this._number.exec(input)) {
          type = 'literal';
          value = '"' + match[0] + '"^^http://www.w3.org/2001/XMLSchema#' +
                  (match[1] ? 'double' : (/^[+\-]?\d+$/.test(match[0]) ? 'integer' : 'decimal'));
        }
        break;

      case 'B':
      case 'b':
      case 'p':
      case 'P':
      case 'G':
      case 'g':
        // Try to find a SPARQL-style keyword.
        if (match = this._sparqlKeyword.exec(input))
          type = match[0].toUpperCase();
        else
          inconclusive = true;
        break;

      case 'f':
      case 't':
        // Try to match a boolean.
        if (match = this._boolean.exec(input)) {
          type = 'literal';
          value = '"' + match[0] + '"^^http://www.w3.org/2001/XMLSchema#boolean';
        }
        else
          inconclusive = true;
        break;

      case 'a':
        // Try to find an abbreviated predicate.
        if (match = this._shortPredicates.exec(input)) {
          type = 'abbreviation';
          value = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
        }
        else
          inconclusive = true;
        break;

      case ',':
      case ';':
      case '[':
      case ']':
      case '(':
      case ')':
      case '{':
      case '}':
        // The next token is punctuation
        matchLength = 1;
        type = firstChar;
        break;

      default:
        inconclusive = true;
      }

      // Some first characters do not allow an immediate decision, so inspect more.
      if (inconclusive) {
        // Try to find a prefix.
        if ((this._prevTokenType === '@prefix' || this._prevTokenType === 'PREFIX') &&
            (match = this._prefix.exec(input))) {
          type = 'prefix';
          value = match[1] || '';
        }
        // Try to find a prefixed name. Since it can contain (but not end with) a dot,
        // we always need a non-dot character before deciding it is a prefixed name.
        // Therefore, try inserting a space if we're at the end of the input.
        else if ((match = this._prefixed.exec(input)) ||
                 inputFinished && (match = this._prefixed.exec(input + ' '))) {
          type = 'prefixed';
          prefix = match[1] || '';
          value = this._unescape(match[2]);
        }
      }

      // A type token is special: it can only be emitted after an IRI or prefixed name is read.
      if (this._prevTokenType === '^')
        type = (type === 'IRI' || type === 'prefixed') ? 'type' : '';

      // What if nothing of the above was found?
      if (!type) {
        // We could be in streaming mode, and then we just wait for more input to arrive.
        // Otherwise, a syntax error has occurred in the input.
        // One exception: error on an unaccounted linebreak (= not inside a triple-quoted literal).
        if (inputFinished || (!/^'''|^"""/.test(input) && /\n|\r/.test(input)))
          return reportSyntaxError(this);
        else
          return this._input = input;
      }

      // Emit the parsed token.
      callback(null, { line: line, type: type, value: value, prefix: prefix });
      this._prevTokenType = type;

      // Advance to next part to tokenize.
      input = input.substr(matchLength || match[0].length, input.length);
    }

    // Signals the syntax error through the callback
    function reportSyntaxError(self) { callback(self._syntaxError(/^\S*/.exec(input)[0])); }
  },

  // ### `_unescape` replaces N3 escape codes by their corresponding characters.
  _unescape: function (item) {
    try {
      return item.replace(escapeSequence, function (sequence, unicode4, unicode8, escapedChar) {
        var charCode;
        if (unicode4) {
          charCode = parseInt(unicode4, 16);
          if (isNaN(charCode)) throw new Error(); // can never happen (regex), but helps performance
          return fromCharCode(charCode);
        }
        else if (unicode8) {
          charCode = parseInt(unicode8, 16);
          if (isNaN(charCode)) throw new Error(); // can never happen (regex), but helps performance
          if (charCode <= 0xFFFF) return fromCharCode(charCode);
          return fromCharCode(0xD800 + ((charCode -= 0x10000) / 0x400), 0xDC00 + (charCode & 0x3FF));
        }
        else {
          var replacement = escapeReplacements[escapedChar];
          if (!replacement)
            throw new Error();
          return replacement;
        }
      });
    }
    catch (error) { return null; }
  },

  // ### `_syntaxError` creates a syntax error for the given issue
  _syntaxError: function (issue) {
    this._input = null;
    return new Error('Syntax error: unexpected "' + issue + '" on line ' + this._line + '.');
  },


  // ## Public methods

  // ### `tokenize` starts the transformation of an N3 document into an array of tokens.
  // The input can be a string or a stream.
  tokenize: function (input, callback) {
    var self = this;
    this._line = 1;

    // If the input is a string, continuously emit tokens through the callback until the end.
    if (typeof input === 'string') {
      this._input = input;
      immediately(function () { self._tokenizeToEnd(callback, true); });
    }
    // Otherwise, the input will be streamed.
    else {
      this._input = '';

      // If no input was given, it will be streamed through `addChunk` and ended with `end`
      if (!input || typeof input === 'function') {
        this.addChunk = addChunk;
        this.end = end;
        if (!callback)
          callback = input;
      }
      // Otherwise, the input itself must be a stream
      else {
        if (typeof input.setEncoding === 'function')
          input.setEncoding('utf8');
        input.on('data', addChunk);
        input.on('end', end);
      }
    }

    // Adds the data chunk to the buffer and parses as far as possible
    function addChunk(data) {
      if (self._input !== null) {
        self._input += data;
        self._tokenizeToEnd(callback, false);
      }
    }

    // Parses until the end
    function end() {
      if (self._input !== null) {
        self._tokenizeToEnd(callback, true);
      }
    }
  },
};

// ## Exports

// Export the `N3Lexer` class as a whole.
module.exports = N3Lexer;

},{}],5:[function(require,module,exports){
// **N3Parser** parses N3 documents.
var N3Lexer = require('./N3Lexer');

var RDF_PREFIX = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    RDF_NIL    = RDF_PREFIX + 'nil',
    RDF_FIRST  = RDF_PREFIX + 'first',
    RDF_REST   = RDF_PREFIX + 'rest';

var absoluteIRI = /:/,
    documentPart = /[^\/]*$/,
    rootIRI = /^(?:[^:]+:\/*)?[^\/]*/;

// The next ID for new blank nodes
var blankNodePrefix = 0, blankNodeCount = 0;

// ## Constructor
function N3Parser(options) {
  if (!(this instanceof N3Parser))
    return new N3Parser(options);
  this._tripleStack = [];
  this._graph = null;

  // Set the document IRI.
  options = options || {};
  if (!options.documentIRI) {
    this._baseIRI = null;
    this._baseIRIPath = null;
  }
  else {
    if (options.documentIRI.indexOf('#') > 0)
      throw new Error('Invalid document IRI');
    this._baseIRI = options.documentIRI;
    this._baseIRIPath = this._baseIRI.replace(documentPart, '');
    this._baseIRIRoot = this._baseIRI.match(rootIRI)[0];
  }

  // Set supported features depending on the format.
  var format = (typeof options.format === 'string') && options.format.match(/\w*$/)[0].toLowerCase(),
      isTurtle = format === 'turtle', isTriG = format === 'trig',
      isNTriples = /triple/.test(format), isNQuads = /quad/.test(format),
      isLineMode = isNTriples || isNQuads;
  if (!(this._supportsNamedGraphs = !isTurtle))
    this._readPredicateOrNamedGraph = this._readPredicate;
  this._supportsQuads = !(isTurtle || isTriG || isNTriples);
  // Disable relative IRIs in N-Triples or N-Quads mode
  if (isLineMode) {
    this._baseIRI = '';
    this._resolveIRI = function (token) {
      this._error('Disallowed relative IRI', token);
      return this._callback = noop, this._subject = null;
    };
  }
  this._lexer = options.lexer || new N3Lexer({ lineMode: isLineMode });
}

// ## Private class methods

// ### `_resetBlankNodeIds` restarts blank node identification.
N3Parser._resetBlankNodeIds = function () {
  blankNodePrefix = blankNodeCount = 0;
};

N3Parser.prototype = {
  // ## Private methods

  // ### `_readInTopContext` reads a token when in the top context.
  _readInTopContext: function (token) {
    switch (token.type) {
    // If an EOF token arrives in the top context, signal that we're done.
    case 'eof':
      if (this._graph !== null)
        return this._error('Unclosed graph', token);
      delete this._prefixes._;
      return this._callback(null, null, this._prefixes);
    // It could be a prefix declaration.
    case '@prefix':
      this._sparqlStyle = false;
      return this._readPrefix;
    case 'PREFIX':
      this._sparqlStyle = true;
      return this._readPrefix;
    // It could be a base declaration.
    case '@base':
      this._sparqlStyle = false;
      return this._readBaseIRI;
    case 'BASE':
      this._sparqlStyle = true;
      return this._readBaseIRI;
    // It could be a graph.
    case '{':
      if (this._supportsNamedGraphs) {
        this._graph = '';
        this._subject = null;
        return this._readSubject;
      }
    case 'GRAPH':
      if (this._supportsNamedGraphs) {
        return this._readNamedGraphLabel;
      }
    // Otherwise, the next token must be a subject.
    default:
      return this._readSubject(token);
    }
  },

  // ### `_readSubject` reads a triple's subject.
  _readSubject: function (token) {
    this._predicate = null;
    switch (token.type) {
    case 'IRI':
      if (this._baseIRI === null || absoluteIRI.test(token.value))
        this._subject = token.value;
      else
        this._subject = this._resolveIRI(token);
      break;
    case 'prefixed':
      var prefix = this._prefixes[token.prefix];
      if (prefix === undefined)
        return this._error('Undefined prefix "' + token.prefix + ':"', token);
      this._subject = prefix + token.value;
      break;
    case '[':
      // Start a new triple with a new blank node as subject.
      this._subject = '_:b' + blankNodeCount++;
      this._tripleStack.push({ subject: this._subject, predicate: null, object: null, type: 'blank' });
      return this._readBlankNodeHead;
    case '(':
      // Start a new list
      this._tripleStack.push({ subject: RDF_NIL, predicate: null, object: null, type: 'list' });
      this._subject = null;
      return this._readListItem;
    case '}':
      return this._readPunctuation(token);
    default:
      return this._error('Expected subject but got ' + token.type, token);
    }
    // The next token must be a predicate,
    // or, if the subject was actually a graph IRI, a named graph.
    return this._readPredicateOrNamedGraph;
  },

  // ### `_readPredicate` reads a triple's predicate.
  _readPredicate: function (token) {
    var type = token.type;
    switch (type) {
    case 'IRI':
    case 'abbreviation':
      if (this._baseIRI === null || absoluteIRI.test(token.value))
        this._predicate = token.value;
      else
        this._predicate = this._resolveIRI(token);
      break;
    case 'prefixed':
      if (token.prefix === '_') {
        return this._error('Disallowed blank node as predicate', token);
      }
      else {
        var prefix = this._prefixes[token.prefix];
        if (prefix === undefined)
          return this._error('Undefined prefix "' + token.prefix + ':"', token);
        this._predicate = prefix + token.value;
      }
      break;
    case '.':
    case ']':
    case '}':
      // Expected predicate didn't come, must have been trailing semicolon.
      if (this._predicate === null)
        return this._error('Unexpected ' + type, token);
      this._subject = null;
      return type === ']' ? this._readBlankNodeTail(token) : this._readPunctuation(token);
    case ';':
      // Extra semicolons can be safely ignored
      return this._readPredicate;
    default:
      return this._error('Expected predicate to follow "' + this._subject + '"', token);
    }
    // The next token must be an object.
    return this._readObject;
  },

  // ### `_readObject` reads a triple's object.
  _readObject: function (token) {
    switch (token.type) {
    case 'IRI':
      if (this._baseIRI === null || absoluteIRI.test(token.value))
        this._object = token.value;
      else
        this._object = this._resolveIRI(token);
      break;
    case 'prefixed':
      var prefix = this._prefixes[token.prefix];
      if (prefix === undefined)
        return this._error('Undefined prefix "' + token.prefix + ':"', token);
      this._object = prefix + token.value;
      break;
    case 'literal':
      this._object = token.value;
      return this._readDataTypeOrLang;
    case '[':
      // Start a new triple with a new blank node as subject.
      var blank = '_:b' + blankNodeCount++;
      this._tripleStack.push({ subject: this._subject, predicate: this._predicate, object: blank, type: 'blank' });
      this._subject = blank;
      return this._readBlankNodeHead;
    case '(':
      // Start a new list
      this._tripleStack.push({ subject: this._subject, predicate: this._predicate, object: RDF_NIL, type: 'list' });
      this._subject = null;
      return this._readListItem;
    default:
      return this._error('Expected object to follow "' + this._predicate + '"', token);
    }
    return this._getTripleEndReader();
  },

  // ### `_readPredicateOrNamedGraph` reads a triple's predicate, or a named graph.
  _readPredicateOrNamedGraph: function (token) {
    return token.type === '{' ? this._readGraph(token) : this._readPredicate(token);
  },

  // ### `_readGraph` reads a graph.
  _readGraph: function (token) {
    if (token.type !== '{')
      return this._error('Expected graph but got ' + token.type, token);
    // The "subject" we read is actually the GRAPH's label
    this._graph = this._subject, this._subject = null;
    return this._readSubject;
  },

  // ### `_readBlankNodeHead` reads the head of a blank node.
  _readBlankNodeHead: function (token) {
    if (token.type === ']') {
      this._subject = null;
      return this._readBlankNodeTail(token);
    }
    this._predicate = null;
    return this._readPredicate(token);
  },

  // ### `_readBlankNodeTail` reads the end of a blank node.
  _readBlankNodeTail: function (token) {
    if (token.type !== ']')
      return this._readBlankNodePunctuation(token);

    // Store blank node triple.
    if (this._subject !== null)
      this._callback(null, { subject:   this._subject,
                             predicate: this._predicate,
                             object:    this._object,
                             graph:     this._graph || '' ,
                             line:      token.line});

    // Restore parent triple that contains the blank node.
    var triple = this._tripleStack.pop();
    this._subject = triple.subject;
    // Was the blank node the object?
    if (triple.object !== null) {
      // Restore predicate and object as well, and continue by reading punctuation.
      this._predicate = triple.predicate;
      this._object = triple.object;
      return this._getTripleEndReader();
    }
    // The blank node was the subject, so continue reading the predicate.
    // If the blank node didn't contain any predicates, it could also be the label of a named graph.
    return this._predicate !== null ? this._readPredicate : this._readPredicateOrNamedGraph;
  },

  // ### `_readDataTypeOrLang` reads an _optional_ data type or language.
  _readDataTypeOrLang: function (token) {
    switch (token.type) {
    case 'type':
      var value;
      if (token.prefix === '') {
        if (this._baseIRI === null || absoluteIRI.test(token.value))
          value = token.value;
        else
          value = this._resolveIRI(token);
      }
      else {
        var prefix = this._prefixes[token.prefix];
        if (prefix === undefined)
          return this._error('Undefined prefix "' + token.prefix + ':"', token);
        value = prefix + token.value;
      }
      this._object += '^^' + value;
      return this._getTripleEndReader();
    case 'langcode':
      this._object += '@' + token.value.toLowerCase();
      return this._getTripleEndReader();
    default:
      return this._getTripleEndReader().call(this, token);
    }
  },

  // ### `_readListItem` reads items from a list.
  _readListItem: function (token) {
    var item = null,                  // The actual list item.
        itemHead = null,              // The head of the rdf:first predicate.
        prevItemHead = this._subject, // The head of the previous rdf:first predicate.
        stack = this._tripleStack,    // The stack of triples part of recursion (lists, blanks, etc.).
        parentTriple = stack[stack.length - 1], // The triple containing the current list.
        next = this._readListItem;    // The next function to execute.

    switch (token.type) {
    case 'IRI':
      item = token.value;
      break;
    case 'prefixed':
      var prefix = this._prefixes[token.prefix];
      if (prefix === undefined)
        return this._error('Undefined prefix "' + token.prefix + ':"', token);
      item = prefix + token.value;
      break;
    case 'literal':
      item = token.value;
      next = this._readDataTypeOrLang;
      break;
    case '[':
      // Stack the current list triple and start a new triple with a blank node as subject.
      itemHead = '_:b' + blankNodeCount++;
      item     = '_:b' + blankNodeCount++;
      stack.push({ subject: itemHead, predicate: RDF_FIRST, object: item, type: 'blank' });
      this._subject = item;
      next = this._readBlankNodeHead;
      break;
    case '(':
      // Stack the current list triple and start a new list
      itemHead = '_:b' + blankNodeCount++;
      stack.push({ subject: itemHead, predicate: RDF_FIRST, object: RDF_NIL, type: 'list' });
      this._subject = null;
      next = this._readListItem;
      break;
    case ')':
      // Restore the parent triple.
      stack.pop();
      // If this list is contained within a parent list, return the membership triple here.
      // This will be `<parent list element> rdf:first <this list>.`.
      if (stack.length !== 0 && stack[stack.length - 1].type === 'list')
        this._callback(null, { subject:   parentTriple.subject,
                               predicate: parentTriple.predicate,
                               object:    parentTriple.object,
                               graph:     this._graph  || '' ,
                               line:      token.line});
      // Restore the parent triple's subject.
      this._subject = parentTriple.subject;
      // Was this list in the parent triple's subject?
      if (parentTriple.predicate === null) {
        // The next token is the predicate.
        next = this._readPredicate;
        // Skip writing the list tail if this was an empty list.
        if (parentTriple.subject === RDF_NIL)
          return next;
      }
      // The list was in the parent triple's object.
      else {
        // Restore the parent triple's predicate and object as well.
        this._predicate = parentTriple.predicate;
        this._object = parentTriple.object;
        next = this._getTripleEndReader();
        // Skip writing the list tail if this was an empty list.
        if (parentTriple.object === RDF_NIL)
          return next;
      }
      // Close the list by making the item head nil.
      itemHead = RDF_NIL;
      break;
    default:
      return this._error('Expected list item instead of "' + token.type + '"', token);
    }

     // Create a new blank node if no item head was assigned yet.
    if (itemHead === null)
      this._subject = itemHead = '_:b' + blankNodeCount++;

    // Is this the first element of the list?
    if (prevItemHead === null) {
      // This list is either the object or the subject.
      if (parentTriple.object === RDF_NIL)
        parentTriple.object = itemHead;
      else
        parentTriple.subject = itemHead;
    }
    else {
      // The rest of the list is in the current head.
      this._callback(null, { subject:   prevItemHead,
                             predicate: RDF_REST,
                             object:    itemHead,
                             graph:     this._graph  || '' ,
                             line:      token.line});
    }
    // Add the item's value.
    if (item !== null)
      this._callback(null, { subject:   itemHead,
                             predicate: RDF_FIRST,
                             object:    item,
                             graph:     this._graph  || '' ,
                             line:      token.line});
    return next;
  },

  // ### `_readPunctuation` reads punctuation between triples or triple parts.
  _readPunctuation: function (token) {
    var next, subject = this._subject, graph = this._graph;
    switch (token.type) {
    // A closing brace ends a graph
    case '}':
      if (this._graph === null)
        return this._error('Unexpected graph closing', token);
      this._graph = null;
    // A dot just ends the statement, without sharing anything with the next.
    case '.':
      this._subject = null;
      next = this._readInTopContext;
      break;
    // Semicolon means the subject is shared; predicate and object are different.
    case ';':
      next = this._readPredicate;
      break;
    // Comma means both the subject and predicate are shared; the object is different.
    case ',':
      next = this._readObject;
      break;
    // An IRI means this is a quad (only allowed if not already inside a graph).
    case 'IRI':
      if (this._supportsQuads && this._graph === null) {
        if (this._baseIRI === null || absoluteIRI.test(token.value))
          graph = token.value;
        else
          graph = this._resolveIRI(token);
        subject = this._subject;
        next = this._readQuadPunctuation;
        break;
      }
    // An prefixed name means this is a quad (only allowed if not already inside a graph).
    case 'prefixed':
      if (this._supportsQuads && this._graph === null) {
        var prefix = this._prefixes[token.prefix];
        if (prefix === undefined)
          return this._error('Undefined prefix "' + token.prefix + ':"', token);
        graph = prefix + token.value;
        next = this._readQuadPunctuation;
        break;
      }
    default:
      return this._error('Expected punctuation to follow "' + this._object + '"', token);
    }
    // A triple has been completed now, so return it.
    if (subject !== null)
      this._callback(null, { subject:   subject,
                             predicate: this._predicate,
                             object:    this._object,
                             graph:     graph  || '' ,
                             line:      token.line});
    return next;
  },

    // ### `_readBlankNodePunctuation` reads punctuation in a blank node
  _readBlankNodePunctuation: function (token) {
    var next;
    switch (token.type) {
    // Semicolon means the subject is shared; predicate and object are different.
    case ';':
      next = this._readPredicate;
      break;
    // Comma means both the subject and predicate are shared; the object is different.
    case ',':
      next = this._readObject;
      break;
    default:
      return this._error('Expected punctuation to follow "' + this._object + '"', token);
    }
    // A triple has been completed now, so return it.
    this._callback(null, { subject:   this._subject,
                           predicate: this._predicate,
                           object:    this._object,
                           graph:     this._graph  || '' ,
                           line:      token.line});
    return next;
  },

  // ### `_readQuadPunctuation` reads punctuation after a quad.
  _readQuadPunctuation: function (token) {
    if (token.type !== '.')
      return this._error('Expected dot to follow quad', token);
    return this._readInTopContext;
  },

  // ### `_readPrefix` reads the prefix of a prefix declaration.
  _readPrefix: function (token) {
    if (token.type !== 'prefix')
      return this._error('Expected prefix to follow @prefix', token);
    this._prefix = token.value;
    return this._readPrefixIRI;
  },

  // ### `_readPrefixIRI` reads the IRI of a prefix declaration.
  _readPrefixIRI: function (token) {
    if (token.type !== 'IRI')
      return this._error('Expected IRI to follow prefix "' + this._prefix + ':"', token);
    var prefixIRI;
    if (this._baseIRI === null || absoluteIRI.test(token.value))
      prefixIRI = token.value;
    else
      prefixIRI = this._resolveIRI(token);
    this._prefixes[this._prefix] = prefixIRI;
    this._prefixCallback(this._prefix, prefixIRI);
    return this._readDeclarationPunctuation;
  },

  // ### `_readBaseIRI` reads the IRI of a base declaration.
  _readBaseIRI: function (token) {
    if (token.type !== 'IRI')
      return this._error('Expected IRI to follow base declaration', token);
    if (token.value.indexOf('#') > 0)
      return this._error('Invalid base IRI', token);
    if (this._baseIRI === null || absoluteIRI.test(token.value))
      this._baseIRI = token.value;
    else
      this._baseIRI = this._resolveIRI(token);
    this._baseIRIPath = this._baseIRI.replace(documentPart, '');
    this._baseIRIRoot = this._baseIRI.match(rootIRI)[0];
    return this._readDeclarationPunctuation;
  },

  // ### `_readNamedGraphLabel` reads the label of a named graph.
  _readNamedGraphLabel: function (token) {
    switch (token.type) {
    case 'IRI':
    case 'prefixed':
      return this._readSubject(token), this._readGraph;
    case '[':
      return this._readNamedGraphBlankLabel;
    default:
      return this._error('Invalid graph label', token);
    }
  },

  // ### `_readNamedGraphLabel` reads a blank node label of a named graph.
  _readNamedGraphBlankLabel: function (token) {
    if (token.type !== ']')
      return this._error('Invalid graph label', token);
    this._subject = '_:b' + blankNodeCount++;
    return this._readGraph;
  },

  // ### `_readDeclarationPunctuation` reads the punctuation of a declaration.
  _readDeclarationPunctuation: function (token) {
    // SPARQL-style declarations don't have punctuation.
    if (this._sparqlStyle)
      return this._readInTopContext(token);

    if (token.type !== '.')
      return this._error('Expected declaration to end with a dot', token);
    return this._readInTopContext;
  },

  // ### `_getTripleEndReader` gets the next reader function at the end of a triple.
  _getTripleEndReader: function () {
    var stack = this._tripleStack;
    if (stack.length === 0)
      return this._readPunctuation;

    switch (stack[stack.length - 1].type) {
    case 'blank':
      return this._readBlankNodeTail;
    case 'list':
      return this._readListItem;
    }
  },

  // ### `_error` emits an error message through the callback.
  _error: function (message, token) {
    this._callback(new Error(message + ' at line ' + token.line + '.'));
  },

  // ### `_resolveIRI` resolves an IRI token against the base path
  _resolveIRI: function (token) {
    var iri = token.value;
    switch (iri[0]) {
    // An empty relative IRI indicates the base IRI
    case undefined:
      return this._baseIRI;
    // Resolve relative fragment IRIs against the base IRI
    case '#':
      return this._baseIRI     + iri;
    // Resolve relative query string IRIs by replacing the query string
    case '?':
      return this._baseIRI.replace(/(?:\?.*)?$/, iri);
    // Resolve root relative IRIs at the root of the base IRI
    case '/':
      return this._baseIRIRoot + iri;
    // Resolve all other IRIs at the base IRI's path
    default:
      return this._baseIRIPath + iri;
    }
  },

  // ## Public methods

  // ### `parse` parses the N3 input and emits each parsed triple through the callback.
  parse: function (input, tripleCallback, prefixCallback) {
    // The read callback is the next function to be executed when a token arrives.
    // We start reading in the top context.
    this._readCallback = this._readInTopContext;
    this._prefixes = Object.create(null);
    this._prefixes._ = '_:b' + blankNodePrefix++ + '_';

    // If the input argument is not given, shift parameters
    if (typeof input === 'function')
      prefixCallback = tripleCallback, tripleCallback = input, input = null;

    // Set the triple and prefix callbacks.
    this._callback = tripleCallback || noop;
    this._prefixCallback = prefixCallback || noop;

    // Execute the read callback when a token arrives.
    var self = this;
    this._lexer.tokenize(input, function (error, token) {
      if (error !== null)
        self._callback(error), self._callback = noop;
      else if (self._readCallback !== undefined)
        self._readCallback = self._readCallback(token);
    });

    // If no input was given, it can be added with `addChunk` and ended with `end`
    if (!input) {
      this.addChunk = this._lexer.addChunk;
      this.end = this._lexer.end;
    }
  }
};

// The empty function
function noop() {}

// ## Exports

// Export the `N3Parser` class as a whole.
module.exports = N3Parser;

},{"./N3Lexer":4}],6:[function(require,module,exports){
// **N3Store** objects store N3 triples by graph in memory.

var expandPrefixedName = require('./N3Util').expandPrefixedName;

// ## Constructor
function N3Store(triples, options) {
  if (!(this instanceof N3Store))
    return new N3Store(triples, options);

  // The number of triples is initially zero.
  this._size = 0;
  // `_graphs` contains subject, predicate, and object indexes per graph.
  this._graphs = Object.create(null);
  // `_entities` maps entities such as `http://xmlns.com/foaf/0.1/name` to numbers.
  // This saves memory, since only the numbers have to be stored in `_graphs`.
  this._entities = Object.create(null);
  this._entities['><'] = 0; // Dummy entry, so the first actual key is non-zero
  this._entityCount = 0;
  // `_blankNodeIndex` is the index of the last created blank node that was automatically named
  this._blankNodeIndex = 0;

  // Shift parameters if `triples` is not given
  if (!options && triples && !triples[0])
    options = triples, triples = null;

  // Add triples and prefixes if passed
  this._prefixes = Object.create(null);
  if (options && options.prefixes)
    this.addPrefixes(options.prefixes);
  if (triples)
    this.addTriples(triples);
}

N3Store.prototype = {
  // ## Public properties

  // ### `size` returns the number of triples in the store.
  get size() {
    // Return the triple count if if was cached.
    var size = this._size;
    if (size !== null)
      return size;

    // Calculate the number of triples by counting to the deepest level.
    var graphs = this._graphs, subjects, subject;
    for (var graphKey in graphs)
      for (var subjectKey in (subjects = graphs[graphKey].subjects))
        for (var predicateKey in (subject = subjects[subjectKey]))
          size += Object.keys(subject[predicateKey]).length;
    return this._size = size;
  },

  // ## Private methods

  // ### `_addToIndex` adds a triple to a three-layered index.
  _addToIndex: function (index0, key0, key1, key2) {
    // Create layers as necessary.
    var index1 = index0[key0] || (index0[key0] = {});
    var index2 = index1[key1] || (index1[key1] = {});
    // Setting the key to _any_ value signalizes the presence of the triple.
    index2[key2] = null;
  },

  // ### `_removeFromIndex` removes a triple from a three-layered index.
  _removeFromIndex: function (index0, key0, key1, key2) {
    // Remove the triple from the index.
    var index1 = index0[key0], index2 = index1[key1], key;
    delete index2[key2];

    // Remove intermediary index layers if they are empty.
    for (key in index2) return;
    delete index1[key1];
    for (key in index1) return;
    delete index0[key0];
  },

  // ### `_findInIndex` finds a set of triples in a three-layered index.
  // The index base is `index0` and the keys at each level are `key0`, `key1`, and `key2`.
  // Any of these keys can be `null`, which is interpreted as a wildcard.
  // `name0`, `name1`, and `name2` are the names of the keys at each level,
  // used when reconstructing the resulting triple
  // (for instance: _subject_, _predicate_, and _object_).
  // Finally, `graph` will be the graph of the created triples.
  _findInIndex: function (index0, key0, key1, key2, name0, name1, name2, graph) {
    var results = [], entityKeys = Object.keys(this._entities), tmp, index1, index2;

    // If a key is specified, use only that part of index 0.
    if (key0) (tmp = index0, index0 = {})[key0] = tmp[key0];
    for (var value0 in index0) {
      var entity0 = entityKeys[value0];

      if (index1 = index0[value0]) {
        // If a key is specified, use only that part of index 1.
        if (key1) (tmp = index1, index1 = {})[key1] = tmp[key1];
        for (var value1 in index1) {
          var entity1 = entityKeys[value1];

          if (index2 = index1[value1]) {
            // If a key is specified, use only that part of index 2, if it exists.
            var values = key2 ? (key2 in index2 ? [key2] : []) : Object.keys(index2);
            // Create triples for all items found in index 2.
            for (var l = values.length - 1; l >= 0; l--) {
              var result = { subject: '', predicate: '', object: '', graph: graph };
              result[name0] = entity0;
              result[name1] = entity1;
              result[name2] = entityKeys[values[l]];
              results.push(result);
            }
          }
        }
      }
    }
    return results;
  },

  // ### `_countInIndex` counts matching triples in a three-layered index.
  // The index base is `index0` and the keys at each level are `key0`, `key1`, and `key2`.
  // Any of these keys can be `null`, which is interpreted as a wildcard.
  _countInIndex: function (index0, key0, key1, key2) {
    var count = 0, tmp, index1, index2;

    // If a key is specified, count only that part of index 0.
    if (key0) (tmp = index0, index0 = {})[key0] = tmp[key0];
    for (var value0 in index0) {
      if (index1 = index0[value0]) {

        // If a key is specified, count only that part of index 1.
        if (key1) (tmp = index1, index1 = {})[key1] = tmp[key1];
        for (var value1 in index1) {
          if (index2 = index1[value1]) {
            // If a key is specified, count the triple if it exists.
            if (key2) (key2 in index2) && count++;
            // Otherwise, count all triples.
            else count += Object.keys(index2).length;
          }
        }
      }
    }
    return count;
  },

  // ## Public methods

  // ### `addTriple` adds a new N3 triple to the store.
  addTriple: function (subject, predicate, object, graph) {
    // Shift arguments if a triple object is given instead of components
    if (!predicate)
      graph = subject.graph, object = subject.object,
        predicate = subject.predicate, subject = subject.subject;

    // Find the graph that will contain the triple.
    graph = graph || '';
    var graphItem = this._graphs[graph];
    // Create the graph if it doesn't exist yet.
    if (!graphItem) {
      graphItem = this._graphs[graph] = {
        subjects: {},
        predicates: {},
        objects: {}
      };
      // Freezing a graph helps subsequent `add` performance,
      // and properties will never be modified anyway.
      Object.freeze(graphItem);
    }

    // Since entities can often be long IRIs, we avoid storing them in every index.
    // Instead, we have a separate index that maps entities to numbers,
    // which are then used as keys in the other indexes.
    var entities = this._entities;
    subject   = entities[subject]   || (entities[subject]   = ++this._entityCount);
    predicate = entities[predicate] || (entities[predicate] = ++this._entityCount);
    object    = entities[object]    || (entities[object]    = ++this._entityCount);

    this._addToIndex(graphItem.subjects,   subject,   predicate, object);
    this._addToIndex(graphItem.predicates, predicate, object,    subject);
    this._addToIndex(graphItem.objects,    object,    subject,   predicate);

    // The cached triple count is now invalid.
    this._size = null;
  },

  // ### `addTriples` adds multiple N3 triples to the store.
  addTriples: function (triples) {
    for (var i = triples.length - 1; i >= 0; i--)
      this.addTriple(triples[i]);
  },

  // ### `addPrefix` adds support for querying with the given prefix
  addPrefix: function (prefix, iri) {
    this._prefixes[prefix] = iri;
  },

  // ### `addPrefixex` adds support for querying with the given prefixes
  addPrefixes: function (prefixes) {
    for (var prefix in prefixes)
      this.addPrefix(prefix, prefixes[prefix]);
  },

  // ### `removeTriple` removes an N3 triple from the store if it exists.
  removeTriple: function (subject, predicate, object, graph) {
    // Shift arguments if a triple object is given instead of components.
    if (!predicate)
      graph = subject.graph, object = subject.object,
        predicate = subject.predicate, subject = subject.subject;
    graph = graph || '';

    // Find internal identifiers for all components.
    var graphItem, entities = this._entities, graphs = this._graphs;
    if (!(subject     = entities[subject]))   return;
    if (!(predicate   = entities[predicate])) return;
    if (!(object      = entities[object]))    return;
    if (!(graphItem = graphs[graph]))   return;

    // Verify that the triple exists.
    var subjects, predicates;
    if (!(subjects   = graphItem.subjects[subject])) return;
    if (!(predicates = subjects[predicate])) return;
    if (!(object in predicates)) return;

    // Remove it from all indexes.
    this._removeFromIndex(graphItem.subjects,   subject,   predicate, object);
    this._removeFromIndex(graphItem.predicates, predicate, object,    subject);
    this._removeFromIndex(graphItem.objects,    object,    subject,   predicate);
    if (this._size !== null) this._size--;

    // Remove the graph if it is empty.
    for (subject in graphItem.subjects) return;
    delete graphs[graph];
  },

  // ### `removeTriples` removes multiple N3 triples from the store.
  removeTriples: function (triples) {
    for (var i = triples.length - 1; i >= 0; i--)
      this.removeTriple(triples[i]);
  },

  // ### `find` finds a set of triples matching a pattern, expanding prefixes as necessary.
  // Setting `subject`, `predicate`, or `object` to `null` means an _anything_ wildcard.
  // Setting `graph` to `null` means the default graph.
  find: function (subject, predicate, object, graph) {
    var prefixes = this._prefixes;
    return this.findByIRI(
      expandPrefixedName(subject,   prefixes),
      expandPrefixedName(predicate, prefixes),
      expandPrefixedName(object,    prefixes),
      expandPrefixedName(graph,     prefixes)
    );
  },

  // ### `findByIRI` finds a set of triples matching a pattern.
  // Setting `subject`, `predicate`, or `object` to a falsy value means an _anything_ wildcard.
  // Setting `graph` to a falsy value means the default graph.
  findByIRI: function (subject, predicate, object, graph) {
    graph = graph || '';
    var graphItem = this._graphs[graph], entities = this._entities;

    // If the specified graph contain no triples, there are no results.
    if (!graphItem) return [];

    // Translate IRIs to internal index keys.
    // Optimization: if the entity doesn't exist, no triples with it exist.
    if (subject   && !(subject   = entities[subject]))   return [];
    if (predicate && !(predicate = entities[predicate])) return [];
    if (object    && !(object    = entities[object]))    return [];

    // Choose the optimal index, based on what fields are present
    if (subject) {
      if (object)
        // If subject and object are given, the object index will be the fastest.
        return this._findInIndex(graphItem.objects, object, subject, predicate,
                                 'object', 'subject', 'predicate', graph);
      else
        // If only subject and possibly predicate are given, the subject index will be the fastest.
        return this._findInIndex(graphItem.subjects, subject, predicate, null,
                                 'subject', 'predicate', 'object', graph);
    }
    else if (predicate)
      // If only predicate and possibly object are given, the predicate index will be the fastest.
      return this._findInIndex(graphItem.predicates, predicate, object, null,
                               'predicate', 'object', 'subject', graph);
    else if (object)
      // If only object is given, the object index will be the fastest.
      return this._findInIndex(graphItem.objects, object, null, null,
                               'object', 'subject', 'predicate', graph);
    else
      // If nothing is given, iterate subjects and predicates first
      return this._findInIndex(graphItem.subjects, null, null, null,
                               'subject', 'predicate', 'object', graph);
  },

  // ### `count` returns the number of triples matching a pattern, expanding prefixes as necessary.
  // Setting `subject`, `predicate`, or `object` to `null` means an _anything_ wildcard.
  // Setting `graph` to `null` means the default graph.
  count: function (subject, predicate, object, graph) {
    var prefixes = this._prefixes;
    return this.countByIRI(
      expandPrefixedName(subject,   prefixes),
      expandPrefixedName(predicate, prefixes),
      expandPrefixedName(object,    prefixes),
      expandPrefixedName(graph,     prefixes)
    );
  },

  // ### `countByIRI` returns the number of triples matching a pattern.
  // Setting `subject`, `predicate`, or `object` to `null` means an _anything_ wildcard.
  // Setting `graph` to `null` means the default graph.
  countByIRI: function (subject, predicate, object, graph) {
    graph = graph || '';
    var graphItem = this._graphs[graph], entities = this._entities;

    // If the specified graph contain no triples, there are no results.
    if (!graphItem) return 0;

    // Translate IRIs to internal index keys.
    // Optimization: if the entity doesn't exist, no triples with it exist.
    if (subject   && !(subject   = entities[subject]))   return 0;
    if (predicate && !(predicate = entities[predicate])) return 0;
    if (object    && !(object    = entities[object]))    return 0;

    // Choose the optimal index, based on what fields are present
    if (subject) {
      if (object)
        // If subject and object are given, the object index will be the fastest.
        return this._countInIndex(graphItem.objects, object, subject, predicate);
      else
        // If only subject and possibly predicate are given, the subject index will be the fastest.
        return this._countInIndex(graphItem.subjects, subject, predicate, object);
    }
    else if (predicate) {
      // If only predicate and possibly object are given, the predicate index will be the fastest.
      return this._countInIndex(graphItem.predicates, predicate, object, subject);
    }
    else {
      // If only object is possibly given, the object index will be the fastest.
      return this._countInIndex(graphItem.objects, object, subject, predicate);
    }
  },

  // ### `createBlankNode` creates a new blank node, returning its name.
  createBlankNode: function (suggestedName) {
    var name;
    if (suggestedName) {
      name = suggestedName = '_:' + suggestedName;
      var index = 1;
      while (this._entities[name])
        name = suggestedName + index++;
    }
    else {
      do { name = '_:b' + this._blankNodeIndex++; }
      while (this._entities[name]);
    }
    this._entities[name] = this._entityCount++;
    return name;
  },
};

// ## Exports

// Export the `N3Store` class as a whole.
module.exports = N3Store;

},{"./N3Util":9}],7:[function(require,module,exports){
// **N3StreamParser** parses an N3 stream into a triple stream
var Transform = require('stream').Transform,
    util = require('util'),
    N3Parser = require('./N3Parser.js');

// ## Constructor
function N3StreamParser(options) {
  if (!(this instanceof N3StreamParser))
    return new N3StreamParser(options);

  // Initialize Transform base class
  Transform.call(this, { decodeStrings: true });
  this._readableState.objectMode = true;

  // Set up parser
  var self = this, parser = new N3Parser(options);
  parser.parse(
    // Handle triples by pushing them down the pipeline
    function (error, triple) {
      triple && self.push(triple) ||
      error  && self.emit('error', error);
    },
    // Emit prefixes through the `prefix` event
    this.emit.bind(this, 'prefix'));

  // Implement Transform methods on top of parser
  this._transform = function (chunk, encoding, done) { parser.addChunk(chunk); done(); };
  this._flush = function (done) { parser.end(); done(); };
}
util.inherits(N3StreamParser, Transform);

// ## Exports
// Export the `N3StreamParser` class as a whole.
module.exports = N3StreamParser;

},{"./N3Parser.js":5,"stream":44,"util":47}],8:[function(require,module,exports){
// **N3StreamWriter** serializes a triple stream into an N3 stream
var Transform = require('stream').Transform,
    util = require('util'),
    N3Writer = require('./N3Writer.js');

// ## Constructor
function N3StreamWriter(options) {
  if (!(this instanceof N3StreamWriter))
    return new N3StreamWriter(options);

  // Initialize Transform base class
  Transform.call(this, { encoding: 'utf8' });
  this._writableState.objectMode = true;

  // Set up writer with a dummy stream object
  var self = this;
  var writer = new N3Writer({
    write: function (chunk, encoding, callback) { self.push(chunk); callback && callback(); },
    end: function (callback) { self.push(null); callback && callback(); },
  }, options);

  // Implement Transform methods on top of writer
  this._transform = function (triple, encoding, done) { writer.addTriple(triple, done); };
  this._flush = function (done) { writer.end(done); };
}
util.inherits(N3StreamWriter, Transform);

// ## Exports
// Export the `N3StreamWriter` class as a whole.
module.exports = N3StreamWriter;

},{"./N3Writer.js":10,"stream":44,"util":47}],9:[function(require,module,exports){
// **N3Util** provides N3 utility functions

var Xsd = 'http://www.w3.org/2001/XMLSchema#';
var XsdString  = Xsd + 'string';
var XsdInteger = Xsd + 'integer';
var XsdDecimal = Xsd + 'decimal';
var XsdBoolean = Xsd + 'boolean';
var RdfLangString = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString';

var N3Util = {
  // Tests whether the given entity (triple object) represents an IRI in the N3 library
  isIRI: function (entity) {
    if (!entity)
      return entity;
    var firstChar = entity[0];
    return firstChar !== '"' && firstChar !== '_';
  },

  // Tests whether the given entity (triple object) represents a literal in the N3 library
  isLiteral: function (entity) {
    return entity && entity[0] === '"';
  },

  // Tests whether the given entity (triple object) represents a blank node in the N3 library
  isBlank: function (entity) {
    return entity && entity.substr(0, 2) === '_:';
  },

  // Gets the string value of a literal in the N3 library
  getLiteralValue: function (literal) {
    var match = /^"([^]*)"/.exec(literal);
    if (!match)
      throw new Error(literal + ' is not a literal');
    return match[1];
  },

  // Gets the type of a literal in the N3 library
  getLiteralType: function (literal) {
    var match = /^"[^]*"(?:\^\^([^"]+)|(@)[^@"]+)?$/.exec(literal);
    if (!match)
      throw new Error(literal + ' is not a literal');
    return match[1] || (match[2] ? RdfLangString : XsdString);
  },

  // Gets the language of a literal in the N3 library
  getLiteralLanguage: function (literal) {
    var match = /^"[^]*"(?:@([^@"]+)|\^\^[^"]+)?$/.exec(literal);
    if (!match)
      throw new Error(literal + ' is not a literal');
    return match[1] ? match[1].toLowerCase() : '';
  },

  // Tests whether the given entity (triple object) represents a prefixed name
  isPrefixedName: function (entity) {
    return entity && /^[^:\/"']*:[^:\/"']+$/.test(entity);
  },

  // Expands the prefixed name to a full IRI (also when it occurs as a literal's type)
  expandPrefixedName: function (prefixedName, prefixes) {
    var match = /(?:^|"\^\^)([^:\/#"'\^_]*):[^\/]*$/.exec(prefixedName), prefix, base, index;
    if (match)
      prefix = match[1], base = prefixes[prefix], index = match.index;
    if (base === undefined)
      return prefixedName;

    // The match index is non-zero when expanding a literal's type.
    return index === 0 ? base + prefixedName.substr(prefix.length + 1)
                       : prefixedName.substr(0, index + 3) +
                         base + prefixedName.substr(index + prefix.length + 4);
  },

  // Creates an IRI in N3.js representation
  createIRI: function (iri) {
    return iri && iri[0] === '"' ? N3Util.getLiteralValue(iri) : iri;
  },

  // Creates a literal in N3.js representation
  createLiteral: function (value, modifier) {
    if (!modifier) {
      switch (typeof value) {
      case 'boolean':
        modifier = XsdBoolean;
        break;
      case 'number':
        if (isFinite(value)) {
          modifier = value % 1 === 0 ? XsdInteger : XsdDecimal;
          break;
        }
      default:
        return '"' + value + '"';
      }
    }
    return '"' + value +
           (/^[a-z]+(-[a-z0-9]+)*$/i.test(modifier) ? '"@'  + modifier.toLowerCase()
                                                    : '"^^' + modifier);
  },
};

// Add the N3Util functions to the given object or its prototype
function AddN3Util(parent, toPrototype) {
  for (var name in N3Util)
    if (!toPrototype)
      parent[name] = N3Util[name];
    else
      parent.prototype[name] = ApplyToThis(N3Util[name]);

  return parent;
}

// Returns a function that applies `f` to the `this` object
function ApplyToThis(f) {
  return function (a) { return f(this, a); };
}

// Expose N3Util, attaching all functions to it
module.exports = AddN3Util(AddN3Util);

},{}],10:[function(require,module,exports){
// **N3Writer** writes N3 documents.

// Matches a literal as represented in memory by the N3 library
var N3LiteralMatcher = /^"([^]*)"(?:\^\^(.+)|@([\-a-z]+))?$/i;

// rdf:type predicate (for 'a' abbreviation)
var RDF_PREFIX = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    RDF_TYPE   = RDF_PREFIX + 'type';

// Characters in literals that require escaping
var escape    = /["\\\t\n\r\b\f\u0000-\u0019\ud800-\udbff]/,
    escapeAll = /["\\\t\n\r\b\f\u0000-\u0019]|[\ud800-\udbff][\udc00-\udfff]/g,
    escapeReplacements = { '\\': '\\\\', '"': '\\"', '\t': '\\t',
                           '\n': '\\n', '\r': '\\r', '\b': '\\b', '\f': '\\f' };

// ## Constructor
function N3Writer(outputStream, options) {
  if (!(this instanceof N3Writer))
    return new N3Writer(outputStream, options);

  // Shift arguments if the first argument is not a stream
  if (outputStream && typeof outputStream.write !== 'function')
    options = outputStream, outputStream = null;

  // If no output stream given, send the output as string through the end callback
  if (!outputStream) {
    outputStream = this;
    this._output = '';
    this.write = function (chunk, encoding, callback) {
      this._output += chunk;
      callback && callback();
    };
  }
  this._outputStream = outputStream;

  // Initialize writer, depending on the format
  this._subject = null;
  options = options || {};
  if (!(/triple|quad/i).test(options.format)) {
    this._graph = '';
    this._prefixIRIs = Object.create(null);
    options.prefixes && this.addPrefixes(options.prefixes);
  }
  else {
    this._writeTriple = this._writeTripleLine;
  }
}

N3Writer.prototype = {
  // ## Private methods

  // ### `_write` writes the argument to the output stream
  _write: function (string, callback) {
    this._outputStream.write(string, 'utf8', callback);
  },

    // ### `_writeTriple` writes the triple to the output stream
  _writeTriple: function (subject, predicate, object, graph, done) {
    try {
      // Write the graph's label if it has changed
      if (this._graph !== graph) {
        // Close the previous graph and start the new one
        this._write((this._subject === null ? '' : (this._graph ? '\n}\n' : '.\n')) +
                    (graph ? this._encodeIriOrBlankNode(graph) + ' {\n' : ''));
        this._graph = graph, this._subject = null;
      }
      // Don't repeat the subject if it's the same
      if (this._subject === subject) {
        // Don't repeat the predicate if it's the same
        if (this._predicate === predicate)
          this._write(', ' + this._encodeObject(object), done);
        // Same subject, different predicate
        else
          this._write(';\n    ' +
                      this._encodePredicate(this._predicate = predicate) + ' ' +
                      this._encodeObject(object), done);
      }
      // Different subject; write the whole triple
      else
        this._write((this._subject === null ? '' : '.\n') +
                    this._encodeSubject(this._subject = subject) + ' ' +
                    this._encodePredicate(this._predicate = predicate) + ' ' +
                    this._encodeObject(object), done);
    }
    catch (error) { done && done(error); }
  },

  // ### `_writeTripleLine` writes the triple or quad to the output stream as a single line
  _writeTripleLine: function (subject, predicate, object, graph, done) {
    // Don't use prefixes
    delete this._prefixMatch;
    // Write the triple
    try {
      this._write(this._encodeIriOrBlankNode(subject) + ' ' +
                  this._encodeIriOrBlankNode(predicate) + ' ' +
                  this._encodeObject(object) +
                  (graph ? ' ' + this._encodeIriOrBlankNode(graph) + '.\n' : '.\n'), done);
    }
    catch (error) { done && done(error); }
  },

  // ### `_encodeIriOrBlankNode` represents an IRI or blank node
  _encodeIriOrBlankNode: function (iri) {
    // A blank node is represented as-is
    if (iri[0] === '_' && iri[1] === ':') return iri;
    // Escape special characters
    if (escape.test(iri))
      iri = iri.replace(escapeAll, characterReplacer);
    // Try to represent the IRI as prefixed name
    var prefixMatch = this._prefixRegex.exec(iri);
    return !prefixMatch ? '<' + iri + '>' :
           (!prefixMatch[1] ? iri : this._prefixIRIs[prefixMatch[1]] + prefixMatch[2]);
  },

  // ### `_encodeLiteral` represents a literal
  _encodeLiteral: function (value, type, language) {
    // Escape special characters
    if (escape.test(value))
      value = value.replace(escapeAll, characterReplacer);
    // Write the literal, possibly with type or language
    if (language)
      return '"' + value + '"@' + language;
    else if (type)
      return '"' + value + '"^^' + this._encodeIriOrBlankNode(type);
    else
      return '"' + value + '"';
  },

  // ### `_encodeSubject` represents a subject
  _encodeSubject: function (subject) {
    if (subject[0] === '"')
      throw new Error('A literal as subject is not allowed: ' + subject);
    return this._encodeIriOrBlankNode(subject);
  },

  // ### `_encodePredicate` represents a predicate
  _encodePredicate: function (predicate) {
    if (predicate[0] === '"')
      throw new Error('A literal as predicate is not allowed: ' + predicate);
    return predicate === RDF_TYPE ? 'a' : this._encodeIriOrBlankNode(predicate);
  },

  // ### `_encodeObject` represents an object
  _encodeObject: function (object) {
    // Represent an IRI or blank node
    if (object[0] !== '"')
      return this._encodeIriOrBlankNode(object);
    // Represent a literal
    var match = N3LiteralMatcher.exec(object);
    if (!match) throw new Error('Invalid literal: ' + object);
    return this._encodeLiteral(match[1], match[2], match[3]);
  },

  // ### `_blockedWrite` replaces `_write` after the writer has been closed
  _blockedWrite: function () {
    throw new Error('Cannot write because the writer has been closed.');
  },

  // ### `addTriple` adds the triple to the output stream
  addTriple: function (subject, predicate, object, graph, done) {
    // The triple was given as a triple object, so shift parameters
    if (typeof object !== 'string')
      this._writeTriple(subject.subject, subject.predicate, subject.object,
                        subject.graph || '', predicate);
    // The optional `graph` parameter was not provided
    else if (typeof graph !== 'string')
      this._writeTriple(subject, predicate, object, '', graph);
    // The `graph` parameter was provided
    else
      this._writeTriple(subject, predicate, object, graph, done);
  },

  // ### `addTriples` adds the triples to the output stream
  addTriples: function (triples) {
    for (var i = 0; i < triples.length; i++)
      this.addTriple(triples[i]);
  },

  // ### `addPrefix` adds the prefix to the output stream
  addPrefix: function (prefix, iri, done) {
    var prefixes = {};
    prefixes[prefix] = iri;
    this.addPrefixes(prefixes, done);
  },

  // ### `addPrefixes` adds the prefixes to the output stream
  addPrefixes: function (prefixes, done) {
    // Add all useful prefixes
    var prefixIRIs = this._prefixIRIs, hasPrefixes = false;
    for (var prefix in prefixes) {
      // Verify whether the prefix can be used and does not exist yet
      var iri = prefixes[prefix];
      if (/[#\/]$/.test(iri) && prefixIRIs[iri] !== (prefix += ':')) {
        hasPrefixes = true;
        prefixIRIs[iri] = prefix;
        // Finish a possible pending triple
        if (this._subject !== null) {
          this._write(this._graph ? '\n}\n' : '.\n');
          this._subject = null, this._graph = '';
        }
        // Write prefix
        this._write('@prefix ' + prefix + ' <' + iri + '>.\n');
      }
    }
    // Recreate the prefix matcher
    if (hasPrefixes) {
      var IRIlist = '', prefixList = '';
      for (var prefixIRI in prefixIRIs) {
        IRIlist += IRIlist ? '|' + prefixIRI : prefixIRI;
        prefixList += (prefixList ? '|' : '') + prefixIRIs[prefixIRI];
      }
      IRIlist = IRIlist.replace(/[\]\/\(\)\*\+\?\.\\\$]/g, '\\$&');
      this._prefixRegex = new RegExp('^(?:' + prefixList + ')[^\/]*$|' +
                                     '^(' + IRIlist + ')([a-zA-Z][\\-_a-zA-Z0-9]*)$');
    }
    // End a prefix block with a newline
    this._write(hasPrefixes ? '\n' : '', done);
  },

  // ### `_prefixRegex` matches a prefixed name or IRI that begins with one of the added prefixes
  _prefixRegex: /$0^/,

  // ### `end` signals the end of the output stream
  end: function (done) {
    // Finish a possible pending triple
    if (this._subject !== null) {
      this._write(this._graph ? '\n}\n' : '.\n');
      this._subject = null;
    }
    // Disallow further writing
    this._write = this._blockedWrite;

    // If writing to a string instead of an actual stream, send the string
    if (this === this._outputStream)
      return done && done(null, this._output);

    // Try to end the underlying stream, ensuring done is called exactly one time
    var singleDone = done && function () { singleDone = null, done(); };
    // Ending a stream can error
    try { this._outputStream.end(singleDone); }
    // Execute the callback if it hasn't been executed
    catch (error) { singleDone && singleDone(); }
  },
};

// Replaces a character by its escaped version
function characterReplacer(character) {
  // Replace a single character by its escaped version
  var result = escapeReplacements[character];
  if (result === undefined) {
    // Replace a single character with its 4-bit unicode escape sequence
    if (character.length === 1) {
      result = character.charCodeAt(0).toString(16);
      result = '\\u0000'.substr(0, 6 - result.length) + result;
    }
    // Replace a surrogate pair with its 8-bit unicode escape sequence
    else {
      result = ((character.charCodeAt(0) - 0xD800) * 0x400 +
                 character.charCodeAt(1) + 0x2400).toString(16);
      result = '\\U00000000'.substr(0, 10 - result.length) + result;
    }
  }
  return result;
}

// ## Exports

// Export the `N3Writer` class as a whole.
module.exports = N3Writer;

},{}],11:[function(require,module,exports){
'use strict';

module.exports = require('./lib/core.js')
require('./lib/done.js')
require('./lib/es6-extensions.js')
require('./lib/node-extensions.js')
},{"./lib/core.js":12,"./lib/done.js":13,"./lib/es6-extensions.js":14,"./lib/node-extensions.js":15}],12:[function(require,module,exports){
'use strict';

var asap = require('asap')

module.exports = Promise;
function Promise(fn) {
  if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new')
  if (typeof fn !== 'function') throw new TypeError('not a function')
  var state = null
  var value = null
  var deferreds = []
  var self = this

  this.then = function(onFulfilled, onRejected) {
    return new self.constructor(function(resolve, reject) {
      handle(new Handler(onFulfilled, onRejected, resolve, reject))
    })
  }

  function handle(deferred) {
    if (state === null) {
      deferreds.push(deferred)
      return
    }
    asap(function() {
      var cb = state ? deferred.onFulfilled : deferred.onRejected
      if (cb === null) {
        (state ? deferred.resolve : deferred.reject)(value)
        return
      }
      var ret
      try {
        ret = cb(value)
      }
      catch (e) {
        deferred.reject(e)
        return
      }
      deferred.resolve(ret)
    })
  }

  function resolve(newValue) {
    try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.')
      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = newValue.then
        if (typeof then === 'function') {
          doResolve(then.bind(newValue), resolve, reject)
          return
        }
      }
      state = true
      value = newValue
      finale()
    } catch (e) { reject(e) }
  }

  function reject(newValue) {
    state = false
    value = newValue
    finale()
  }

  function finale() {
    for (var i = 0, len = deferreds.length; i < len; i++)
      handle(deferreds[i])
    deferreds = null
  }

  doResolve(fn, resolve, reject)
}


function Handler(onFulfilled, onRejected, resolve, reject){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
  this.onRejected = typeof onRejected === 'function' ? onRejected : null
  this.resolve = resolve
  this.reject = reject
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, onFulfilled, onRejected) {
  var done = false;
  try {
    fn(function (value) {
      if (done) return
      done = true
      onFulfilled(value)
    }, function (reason) {
      if (done) return
      done = true
      onRejected(reason)
    })
  } catch (ex) {
    if (done) return
    done = true
    onRejected(ex)
  }
}

},{"asap":16}],13:[function(require,module,exports){
'use strict';

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise
Promise.prototype.done = function (onFulfilled, onRejected) {
  var self = arguments.length ? this.then.apply(this, arguments) : this
  self.then(null, function (err) {
    asap(function () {
      throw err
    })
  })
}
},{"./core.js":12,"asap":16}],14:[function(require,module,exports){
'use strict';

//This file contains the ES6 extensions to the core Promises/A+ API

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise

/* Static Functions */

function ValuePromise(value) {
  this.then = function (onFulfilled) {
    if (typeof onFulfilled !== 'function') return this
    return new Promise(function (resolve, reject) {
      asap(function () {
        try {
          resolve(onFulfilled(value))
        } catch (ex) {
          reject(ex);
        }
      })
    })
  }
}
ValuePromise.prototype = Promise.prototype

var TRUE = new ValuePromise(true)
var FALSE = new ValuePromise(false)
var NULL = new ValuePromise(null)
var UNDEFINED = new ValuePromise(undefined)
var ZERO = new ValuePromise(0)
var EMPTYSTRING = new ValuePromise('')

Promise.resolve = function (value) {
  if (value instanceof Promise) return value

  if (value === null) return NULL
  if (value === undefined) return UNDEFINED
  if (value === true) return TRUE
  if (value === false) return FALSE
  if (value === 0) return ZERO
  if (value === '') return EMPTYSTRING

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then
      if (typeof then === 'function') {
        return new Promise(then.bind(value))
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex)
      })
    }
  }

  return new ValuePromise(value)
}

Promise.all = function (arr) {
  var args = Array.prototype.slice.call(arr)

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([])
    var remaining = args.length
    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then
          if (typeof then === 'function') {
            then.call(val, function (val) { res(i, val) }, reject)
            return
          }
        }
        args[i] = val
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex)
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i])
    }
  })
}

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) { 
    reject(value);
  });
}

Promise.race = function (values) {
  return new Promise(function (resolve, reject) { 
    values.forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    })
  });
}

/* Prototype Methods */

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
}

},{"./core.js":12,"asap":16}],15:[function(require,module,exports){
'use strict';

//This file contains then/promise specific extensions that are only useful for node.js interop

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise

/* Static Functions */

Promise.denodeify = function (fn, argumentCount) {
  argumentCount = argumentCount || Infinity
  return function () {
    var self = this
    var args = Array.prototype.slice.call(arguments)
    return new Promise(function (resolve, reject) {
      while (args.length && args.length > argumentCount) {
        args.pop()
      }
      args.push(function (err, res) {
        if (err) reject(err)
        else resolve(res)
      })
      var res = fn.apply(self, args)
      if (res && (typeof res === 'object' || typeof res === 'function') && typeof res.then === 'function') {
        resolve(res)
      }
    })
  }
}
Promise.nodeify = function (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null
    var ctx = this
    try {
      return fn.apply(this, arguments).nodeify(callback, ctx)
    } catch (ex) {
      if (callback === null || typeof callback == 'undefined') {
        return new Promise(function (resolve, reject) { reject(ex) })
      } else {
        asap(function () {
          callback.call(ctx, ex)
        })
      }
    }
  }
}

Promise.prototype.nodeify = function (callback, ctx) {
  if (typeof callback != 'function') return this

  this.then(function (value) {
    asap(function () {
      callback.call(ctx, null, value)
    })
  }, function (err) {
    asap(function () {
      callback.call(ctx, err)
    })
  })
}

},{"./core.js":12,"asap":16}],16:[function(require,module,exports){
(function (process){

// Use the fastest possible means to execute a task in a future turn
// of the event loop.

// linked list of tasks (single, with head node)
var head = {task: void 0, next: null};
var tail = head;
var flushing = false;
var requestFlush = void 0;
var isNodeJS = false;

function flush() {
    /* jshint loopfunc: true */

    while (head.next) {
        head = head.next;
        var task = head.task;
        head.task = void 0;
        var domain = head.domain;

        if (domain) {
            head.domain = void 0;
            domain.enter();
        }

        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function() {
                   throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    flushing = false;
}

if (typeof process !== "undefined" && process.nextTick) {
    // Node.js before 0.9. Note that some fake-Node environments, like the
    // Mocha test runner, introduce a `process` global without a `nextTick`.
    isNodeJS = true;

    requestFlush = function () {
        process.nextTick(flush);
    };

} else if (typeof setImmediate === "function") {
    // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
    if (typeof window !== "undefined") {
        requestFlush = setImmediate.bind(window, flush);
    } else {
        requestFlush = function () {
            setImmediate(flush);
        };
    }

} else if (typeof MessageChannel !== "undefined") {
    // modern browsers
    // http://www.nonblocking.io/2011/06/windownexttick.html
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    requestFlush = function () {
        channel.port2.postMessage(0);
    };

} else {
    // old browsers
    requestFlush = function () {
        setTimeout(flush, 0);
    };
}

function asap(task) {
    tail = tail.next = {
        task: task,
        domain: isNodeJS && process.domain,
        next: null
    };

    if (!flushing) {
        flushing = true;
        requestFlush();
    }
};

module.exports = asap;


}).call(this,require('_process'))
},{"_process":32}],17:[function(require,module,exports){
var Promise = require('promise');

var RDF = require('../includes/Erics_RDF.js');
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

        parser.parse(dataText, function (error, N3triple, prefixes) {
            if (error) reject(error);
            else if (N3triple) {
                var triple = RDF.Triple(
                    parseNode(N3triple.subject),
                    parseNode(N3triple.predicate),
                    parseNode(N3triple.object)
                );

                triple.line = N3triple.line;

                db.push(triple);
            }
            else {
                resolver.Prefixes = prefixes;
                resolve({db: db, resolver: resolver, resources: db.uniqueSubjects(), triples:db.triples});
            }
        });
    });
}

},{"../includes/Erics_RDF.js":1,"n3":3,"promise":11}],18:[function(require,module,exports){
var Promise = require('promise');

var dataParser = require("./dataParser.js");
var schemaParser = require("./schemaParser.js");
var validator = require("./validator.js");
var shapeFinder = require("./shapeFinder.js");

function Validator(schemaText, dataText, callbacks, options) {
    this.callbacks = callbacks;
    this.options = options;
    this.updateSchema(schemaText);
    this.updateData(dataText);
}

Validator.prototype = {
    updateSchema: function (schemaText) {
        this.schema = schemaParser.parseSchema(schemaText);
        this.schema.done(this.callbacks.schemaParsed, this.callbacks.schemaParseError);
    },
    updateData: function (dataText) {
        this.data = dataParser.parseData(dataText);
        this.data.done(this.callbacks.dataParsed, this.callbacks.dataParseError);
    },
    findShapes: function () {
        var _this = this;
        return Promise.all([this.schema, this.data]).then(function (a) {
            return shapeFinder.findShapes(
                a[0].schema,                       // Schema
                a[0].resolver,
                a[1].db,                       // db
                _this.options.closedShapes,
                _this.callbacks.findShapesResult);
        });
    },
    validate: function(startingNodes) {
        var _this = this;
        return Promise.all([this.schema, this.data]).then(function (a) {
            return validator.validate(
                a[0].schema,                       // Schema
                a[0].resolver,
                startingNodes,      // Starting Node
                a[1].db,                       // db
                a[1].resolver,
                _this.options.closedShapes,
                _this.callbacks.validationResult);
        });
    }
};

module.exports.Validator = Validator;


},{"./dataParser.js":17,"./schemaParser.js":19,"./shapeFinder.js":20,"./validator.js":22,"promise":11}],19:[function(require,module,exports){
var Promise = require('promise');

var shexSchemaParser = require('../includes/shexParser.js');
var RDF = require('../includes/Erics_RDF.js');

exports.parseSchema = function parseSchema(schemaText) {
    return new Promise(function (resolve, reject) {
        var resolver = RDF.createIRIResolver();
        var schema;
        try {
            schema = shexSchemaParser.parse(schemaText, {iriResolver: resolver});
        }
        catch (e) {
            reject(e);
        }

        var shapes = schema.ruleLabels.map(function (rule) {
            return rule.toString();
        });

        resolve({schema: schema, resolver: resolver, shapes: shapes});
    });
};

},{"../includes/Erics_RDF.js":1,"../includes/shexParser.js":2,"promise":11}],20:[function(require,module,exports){
var RDF = require('../includes/Erics_RDF.js');

function findShapes(schema, schemaResolver, db, closedShapes, findShapesResult) {
    schema.alwaysInvoke = {};

    schema.startingNode = null;

    var shapes = schema.findTypes(
        db,
        db.uniqueSubjects(),
        RDF.ValidatorStuff(schemaResolver, closedShapes, true)
    );

    return cleanShapes(shapes, db, findShapesResult);

}

function cleanShapes(shapes, db, findShapesResult) {

    return shapes.then(function(shapes) {
        var result = {};

        db.uniqueSubjects().forEach(function(subject) {
            result[subject] = null;
        });

        shapes.matches.forEach(function(match) {
            result[match.triple.s.toString()] = match.triple.o.toString();
        });

        findShapesResult(result);
    });


}

module.exports.findShapes = findShapes

},{"../includes/Erics_RDF.js":1}],21:[function(require,module,exports){
var RDF = require('../includes/Erics_RDF.js');

function formatError(fail) {
    
    return {
        name: fail._,
        triple : fail,
        req_lev: fail.rule.req_lev,
        description: errorToString(fail),
        line: getLine(fail)
    };
}

function errorToString(fail) {
    if (fail._ === "RuleFailMin") {
        if (fail.min == fail.max) {
            return "Needs "+ fail.min + fail.rule.nameClass.term._pos._orig;
        }
        else if (fail.max == undefined){
            return "Needs at least "+ fail.min + " " + fail.rule.nameClass.term._pos._orig
            + " with type " + fail.rule.valueClass._pos._orig;
        }
        else if (fail.min != undefined && fail.max != undefined) {
            return "Needs between "+ fail.min + " and " + fail.max + " "
            + fail.rule.nameClass.term._pos._orig + " with type "
            + fail.rule.valueClass._pos._orig;
        }
        else{
            return "RuleFailMin - if you get this message contact someone"
        }
    }
    else if (fail._ === "RuleFailMax") {
        if (fail.min != undefined && fail.max != undefined) {
            return "Needs between "+ fail.min + " and " + fail.max + " "
            + fail.rule.nameClass.term._pos._orig + " with type "
            + fail.rule.valueClass._pos._orig;
        }
        else if (fail.max != undefined) {
            return "Cannot have more than " + fail.max + " " + fail.rule.nameClass.term._pos._orig
            + " of type " + fail.rule.valueClass._pos._orig;
        }
        else{
            return "RuleFailMax - if you get this message contact someone";
        }
    }
    else if (fail._ === "RuleFailMixedOpt") {
        return "RuleFailMixedOpt - if you get this message contact someone";
    }
    else if (fail._ === "RuleFailOr") {
        if (fail.failures && fail.rule.disjoints) {
            //if the number of values is the same as the number of disjoints
            //then we can (maybe) guess that all the options are missing
            if (fail.failures.length === fail.rule.disjoints.length) {
                var retString = "Needs at least one of : ";
                fail.failures.forEach(function(f){
                    //making some strong assumptions here
                    retString += "\t Property " + f.errors[0].rule._pos._orig;
                });
                return retString;
            }
            //when there are less failures than disjoints, that means that
            //there are failures-disjoints violations of the or rule (maybe)
            else if (fail.failures.length < fail.rule.disjoints.length) {
                
            }
        }

        else {
            return "RuleFailOr - if you get this message contact someone";
        }
    }
    else if (fail._ === "RuleFailTree") {
        return "RuleFailTree - if you get this message contact someone";
    }
    else if (fail._ === "RuleFailValue") {
        return "RuleFailValue - if you get this message contact someone";
    }
    else if (fail._ === "RuleFailExtra") {
        return "RuleFailExtra - if you get this message contact someone";
    }
    else if (fail._ === "RuleFail") {
        // Maybe replace this with the non expanded types - it's unclear
        // which would be better
        return "Property " + fail.rule.nameClass.term._pos._orig
        + " has a value with type: " + fail.triple.o.datatype 
        + " instead of the expected type: " + fail.rule.valueClass.toString();
    }
}

function getLine(fail) {
    if(fail.triples && fail.triples[0]) {
        return fail.triples[0].line
    }

    if(fail.triple) {
        return fail.triple.line
    }
}


module.exports = formatError;

},{"../includes/Erics_RDF.js":1}],22:[function(require,module,exports){
var RDF = require('../includes/Erics_RDF.js');
var dataParser = require("./dataParser.js");
var errorFormatter = require("./validationErrorFormatter.js");
var Promise = require("promise");


function validate(schema,
                  schemaResolver,
                  startingResources,
                  db,
                  dbResolver,
                  closedShapes,
                  validationResult) {


    schema.alwaysInvoke = {};

    var validationPromises = [];

    for (var startingResource in startingResources) {

        if(!startingResources.hasOwnProperty(startingResource) || !startingResources[startingResource]) continue;

        var startingNode = dataParser.parseNode(startingResource, dbResolver.Prefixes);

        var instSh = RDF.IRI("http://open-services.net/ns/core#instanceShape");

        var validation = schema.validate(
            startingNode,
            startingResources[startingResource],
            db,
            RDF.ValidatorStuff(schemaResolver, closedShapes, true).push(startingNode, instSh),
            true
        );

        validationPromises.push(cleanupValidation(validation, dbResolver, startingNode, validationResult));

    }

    return Promise.all(validationPromises);
}

function cleanupValidation(valRes, resolver, startingResource, cb) {

    return valRes.then(function(valRes) {
        var errors = valRes.errors.map(errorFormatter);

        cb({
            errors: errors,
            matches: valRes.matches,
            startingResource: startingResource,
            passed: errors.length === 0
        });
    });

}

module.exports.validate = validate;

},{"../includes/Erics_RDF.js":1,"./dataParser.js":17,"./validationErrorFormatter.js":21,"promise":11}],23:[function(require,module,exports){
/* 
    Build ShExValidator.js client side bundle using browserify with the following commands:
    cd /home/shex/ShExValidata
    npm update
    browserify public/javascripts/ShExValidator-browserify.js -o public/javascripts/ShExValidator.js
 */

ShExValidator = require('ShEx-validator');

},{"ShEx-validator":18}],24:[function(require,module,exports){

},{}],25:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff
var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Find the length
  var length
  if (type === 'number') {
    length = +subject
  } else if (type === 'string') {
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length
  } else {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (length > kMaxLength)
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
      'size: 0x' + kMaxLength.toString(16) + ' bytes')

  if (length < 0)
    length = 0
  else
    length >>>= 0 // Coerce to uint32.

  var self = this
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    /*eslint-disable consistent-this */
    self = Buffer._augment(new Uint8Array(length))
    /*eslint-enable consistent-this */
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    self.length = length
    self._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    self._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        self[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        self[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    self.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT && !noZero) {
    for (i = 0; i < length; i++) {
      self[i] = 0
    }
  }

  if (length > 0 && length <= Buffer.poolSize)
    self.parent = rootParent

  return self
}

function SlowBuffer (subject, encoding, noZero) {
  if (!(this instanceof SlowBuffer))
    return new SlowBuffer(subject, encoding, noZero)

  var buf = new Buffer(subject, encoding, noZero)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b))
    throw new TypeError('Arguments must be Buffers')

  if (a === b) return 0

  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) throw new TypeError('Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    case 'hex':
      ret = str.length >>> 1
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    default:
      ret = str.length
  }
  return ret
}

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function (encoding, start, end) {
  var loweredCase = false

  start = start >>> 0
  end = end === undefined || end === Infinity ? this.length : end >>> 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase)
          throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max)
      str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(byte)) throw new Error('Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0

  if (length < 0 || offset < 0 || offset > this.length)
    throw new RangeError('attempt to write outside buffer bounds')

  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new TypeError('Unknown encoding: ' + encoding)
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0)
      start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0)
      end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start)
    end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length)
    newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0)
    throw new RangeError('offset is not uint')
  if (offset + ext > length)
    throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100))
    val += this[offset + i] * mul

  return val
}

Buffer.prototype.readUIntBE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100))
    val += this[offset + --byteLength] * mul

  return val
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
      ((this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3])
}

Buffer.prototype.readIntLE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100))
    val += this[offset + i] * mul
  mul *= 0x80

  if (val >= mul)
    val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100))
    val += this[offset + --i] * mul
  mul *= 0x80

  if (val >= mul)
    val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80))
    return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      (this[offset + 3])
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  if (!noAssert)
    checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100))
    this[offset + i] = (value / mul) >>> 0 & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert)
    checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100))
    this[offset + i] = (value / mul) >>> 0 & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

Buffer.prototype.writeIntLE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(this,
             value,
             offset,
             byteLength,
             Math.pow(2, 8 * byteLength - 1) - 1,
             -Math.pow(2, 8 * byteLength - 1))
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100))
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(this,
             value,
             offset,
             byteLength,
             Math.pow(2, 8 * byteLength - 1) - 1,
             -Math.pow(2, 8 * byteLength - 1))
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100))
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else objectWriteUInt16(this, value, offset, true)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else objectWriteUInt16(this, value, offset, false)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else objectWriteUInt32(this, value, offset, true)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert)
    checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else objectWriteUInt32(this, value, offset, false)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert)
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var self = this // source

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (target_start >= target.length) target_start = target.length
  if (!target_start) target_start = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || self.length === 0) return 0

  // Fatal error conditions
  if (target_start < 0)
    throw new RangeError('targetStart out of bounds')
  if (start < 0 || start >= self.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []
  var i = 0

  for (; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (leadSurrogate) {
        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        } else {
          // valid surrogate pair
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      } else {
        // no lead yet

        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else {
          // valid lead
          leadSurrogate = codePoint
          continue
        }
      }
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":26,"ieee754":27,"is-array":28}],26:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],27:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],28:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],29:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],30:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],31:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],32:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],33:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":34}],34:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

forEach(objectKeys(Writable.prototype), function(method) {
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
});

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(this.end.bind(this));
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

}).call(this,require('_process'))
},{"./_stream_readable":36,"./_stream_writable":38,"_process":32,"core-util-is":39,"inherits":30}],35:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./_stream_transform":37,"core-util-is":39,"inherits":30}],36:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

var Stream = require('stream');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var StringDecoder;


/*<replacement>*/
var debug = require('util');
if (debug && debug.debuglog) {
  debug = debug.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/


util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.readableObjectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  var Duplex = require('./_stream_duplex');

  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (util.isString(chunk) && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (util.isNullOrUndefined(chunk)) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      if (!addToFront)
        state.reading = false;

      // if we want the data now, just emit it.
      if (state.flowing && state.length === 0 && !state.sync) {
        stream.emit('data', chunk);
        stream.read(0);
      } else {
        // update the buffer info.
        state.length += state.objectMode ? 1 : chunk.length;
        if (addToFront)
          state.buffer.unshift(chunk);
        else
          state.buffer.push(chunk);

        if (state.needReadable)
          emitReadable(stream);
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (isNaN(n) || util.isNull(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  debug('read', n);
  var state = this._readableState;
  var nOrig = n;

  if (!util.isNumber(n) || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended)
      endReadable(this);
    else
      emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0)
      endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  }

  if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read pushed data synchronously, then `reading` will be false,
  // and we need to re-evaluate how much data we can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (util.isNull(ret)) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we tried to read() past the EOF, then emit end on the next tick.
  if (nOrig !== n && state.ended && state.length === 0)
    endReadable(this);

  if (!util.isNull(ret))
    this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!util.isBuffer(chunk) &&
      !util.isString(chunk) &&
      !util.isNullOrUndefined(chunk) &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync)
      process.nextTick(function() {
        emitReadable_(stream);
      });
    else
      emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    process.nextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain &&
        (!dest._writableState || dest._writableState.needDrain))
      ondrain();
  }

  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    if (false === ret) {
      debug('false write response, pause',
            src._readableState.awaitDrain);
      src._readableState.awaitDrain++;
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain)
      state.awaitDrain--;
    if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  // If listening to data, and it has not explicitly been paused,
  // then call resume to start the flow of data on the next tick.
  if (ev === 'data' && false !== this._readableState.flowing) {
    this.resume();
  }

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        var self = this;
        process.nextTick(function() {
          debug('readable nexttick read 0');
          self.read(0);
        });
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    if (!state.reading) {
      debug('resume read 0');
      this.read(0);
    }
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(function() {
      resume_(stream, state);
    });
  }
}

function resume_(stream, state) {
  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading)
    stream.read(0);
}

Readable.prototype.pause = function() {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  if (state.flowing) {
    do {
      var chunk = stream.read();
    } while (null !== chunk && state.flowing);
  }
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    debug('wrapped data');
    if (state.decoder)
      chunk = state.decoder.write(chunk);
    if (!chunk || !state.objectMode && !chunk.length)
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (util.isFunction(stream[i]) && util.isUndefined(this[i])) {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require('_process'))
},{"./_stream_duplex":34,"_process":32,"buffer":25,"core-util-is":39,"events":29,"inherits":30,"isarray":31,"stream":44,"string_decoder/":45,"util":24}],37:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (!util.isNullOrUndefined(data))
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('prefinish', function() {
    if (util.isFunction(this._flush))
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (!util.isNull(ts.writechunk) && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./_stream_duplex":34,"core-util-is":39,"inherits":30}],38:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Stream = require('stream');

util.inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.writableObjectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  process.nextTick(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!util.isBuffer(chunk) &&
      !util.isString(chunk) &&
      !util.isNullOrUndefined(chunk) &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    process.nextTick(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (util.isFunction(encoding)) {
    cb = encoding;
    encoding = null;
  }

  if (util.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (!util.isFunction(cb))
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function() {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function() {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing &&
        !state.corked &&
        !state.finished &&
        !state.bufferProcessing &&
        state.buffer.length)
      clearBuffer(this, state);
  }
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      util.isString(chunk)) {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  if (util.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing || state.corked)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, false, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev)
    stream._writev(chunk, state.onwrite);
  else
    stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    process.nextTick(function() {
      state.pendingcb--;
      cb(er);
    });
  else {
    state.pendingcb--;
    cb(er);
  }

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished &&
        !state.corked &&
        !state.bufferProcessing &&
        state.buffer.length) {
      clearBuffer(stream, state);
    }

    if (sync) {
      process.nextTick(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  if (stream._writev && state.buffer.length > 1) {
    // Fast case, write everything using _writev()
    var cbs = [];
    for (var c = 0; c < state.buffer.length; c++)
      cbs.push(state.buffer[c].callback);

    // count the one we are adding, as well.
    // TODO(isaacs) clean this up
    state.pendingcb++;
    doWrite(stream, state, true, state.length, state.buffer, '', function(err) {
      for (var i = 0; i < cbs.length; i++) {
        state.pendingcb--;
        cbs[i](err);
      }
    });

    // Clear buffer
    state.buffer = [];
  } else {
    // Slow case, write chunks one-by-one
    for (var c = 0; c < state.buffer.length; c++) {
      var entry = state.buffer[c];
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);

      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        c++;
        break;
      }
    }

    if (c < state.buffer.length)
      state.buffer = state.buffer.slice(c);
    else
      state.buffer.length = 0;
  }

  state.bufferProcessing = false;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));

};

Writable.prototype._writev = null;

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (util.isFunction(chunk)) {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (util.isFunction(encoding)) {
    cb = encoding;
    encoding = null;
  }

  if (!util.isNullOrUndefined(chunk))
    this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else
      prefinish(stream, state);
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      process.nextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

}).call(this,require('_process'))
},{"./_stream_duplex":34,"_process":32,"buffer":25,"core-util-is":39,"inherits":30,"stream":44}],39:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return Buffer.isBuffer(arg);
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}
}).call(this,require("buffer").Buffer)
},{"buffer":25}],40:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":35}],41:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = require('stream');
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":34,"./lib/_stream_passthrough.js":35,"./lib/_stream_readable.js":36,"./lib/_stream_transform.js":37,"./lib/_stream_writable.js":38,"stream":44}],42:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":37}],43:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":38}],44:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":29,"inherits":30,"readable-stream/duplex.js":33,"readable-stream/passthrough.js":40,"readable-stream/readable.js":41,"readable-stream/transform.js":42,"readable-stream/writable.js":43}],45:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":25}],46:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],47:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":46,"_process":32,"inherits":30}]},{},[23]);
