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
        if (Math.abs(_orig.length - width) > 1)
            RDF.message(new Error("'"+_orig+"'.length = "+_orig.length+" != "+width));
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
            triplesMatching: function (s, p, o) {
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
                return ret;
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
                return Object.keys(this.SPO);
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
                $.ajax(merge).done(function (body, textStatus, jqXHR) {
                    // Crappy mime parser doesn't handle quoted-string
                    //  c.f. http://tools.ietf.org/html/rfc7230#section-3.2.6
                    var ray = jqXHR.getResponseHeader("content-type").split(/;/)
                        .map(function (s) { return s.replace(/ /g,''); });
                    var r = RDF.parseSPARQLResults(body, ray.shift(), ray);
                    done(r);
                }).fail(fail).always(always);
                return this;
            },
            getURL: function () { return url; },
            getLastQuery: function () { return lastQuery; },
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
            var xml = $(typeof body === "object" ? body : $.parseXML(body));
            return {
                vars: xml.find("head variable").get().map(function (obj) {
                    return obj.getAttribute("name");
                }),
                solutions: xml.find("results result").get().map(function (result, solnNo) {
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
        return {
            _: 'QueryDB',
            sparqlInterface: sparqlInterface,
            slaveDB: slaveDB,
            cacheSize: cacheSize,
            r: null,
            queryStack: [],
            _seen: 0,
            cache: {},
            LRU: [],
            nodes: [],
            triplesMatching: function (s, p, o) {
                var queryDB = this;
                function query () {
                    var isSPO = (s && p && !o);
                    if (isSPO) {
                        queryDB.LRU.push(s.toString());
                        queryDB.nodes.push(s);
                        if (queryDB.LRU.length > queryDB.cacheSize) {
                            queryDB.LRU.shift();
                            queryDB.slaveDB.retract({s:queryDB.nodes.shift(), p:null, o:null});
                        }
                    }
                    var pattern = "CONSTRUCT WHERE {" +
                        " " + (s ? s.toString() : "?s") +
                        " " + (!isSPO && p ? p.toString() : "?p") +
                        " " + (o ? o.toString() : "?o") +
                        " }";
                    queryDB.sparqlInterface.execute(pattern, {async: false, done: function (r) {
                        queryDB.r = r;
                    }});
                    var ret = queryDB.r.obj.slice();
                    this._seen += ret.length;
                    ret.forEach(function (t) { queryDB.slaveDB.push(t); });
                }
                if (!s || !p || o || this.LRU.indexOf(s.toString()) == -1)
                    query();
                return this.slaveDB.triplesMatching(s, p, o);
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
        this._ = 'NamePattern'; this.term = term; this.exclusions = exclusions; this._pos = _pos;
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
                schema.dispatch('enter', rule.codes, rule, t);
                var r = schema.validatePoint(point, this.label, db, validatorStuff, true);
                schema.dispatch('exit', rule.codes, rule, r);
                ret.status = r.status;
                if (r.passed())
                { ret.status = r.status; ret.matchedTree(rule, t, r); }
                else
                { ret.status = RDF.DISPOSITION.FAIL; ret.error_noMatchTree(rule, t, r); }
                return ret;
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
                return ret;
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
                return ret;
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
                for (var i = 0; i < this.values.length; ++i) {
                    var ret1 = this.values[i].validate(schema, rule, t, point, db, validatorStuff);
                    if (ret1.status == RDF.DISPOSITION.PASS)
                        return ret1;
                }
                var ret2 = new RDF.ValRes();
                { ret2.status = RDF.DISPOSITION.FAIL; ret2.error_noMatch(rule, t); }
                return ret2;
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
                        return ret1;
                    }
                }
                var ret2 = new RDF.ValRes();
                { ret2.status = RDF.DISPOSITION.PASS; ret2.matched(rule, t); }
                return ret2;
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
                        return ret1;
                    }
                }
                if (point.lex.substr(0,this.term.lex.length) !== this.term.lex) {
                    var ret2 = new RDF.ValRes();
                    { ret2.status = RDF.DISPOSITION.FAIL; ret2.error_noMatch(rule, t); }
                    return ret2;
                }
                var ret3 = new RDF.ValRes();
                { ret3.status = RDF.DISPOSITION.PASS; ret3.matched(rule, t); }
                return ret3;
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

    AtomicRule: function (negated, reversed, nameClass, valueClass, min, max, codes, _pos) {
        this._ = 'AtomicRule'; this.negated = negated; this.reversed = reversed; this.nameClass = nameClass; this.valueClass = valueClass; this.min = min; this.max = max; this.codes = codes; this._pos = _pos;
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
        // only returns ∅|𝜃 if inOpt
        // ArcRule: if (inOpt ∧ SIZE(matchName)=0) if (min=0) return 𝜃 else return ∅;
        // if(SIZE(matchName)<min|>max) return 𝕗;
        // vs=matchName.map(valueClass(v,_,g,false)); if(∃𝕗) return 𝕗; return dispatch('post', 𝕡);
        this.validate = function (schema, point, inOpt, db, validatorStuff) {
            var matched = 0;
            var ret = new RDF.ValRes();
            ret.status = RDF.DISPOSITION.PASS;
            var _AtomicRule = this;
            var matchName = db.triplesMatching(this.reversed ? null : point,
                this.nameClass._ === 'NameTerm' ? this.nameClass.term : null,
                this.reversed ? point : null).filter(function (t) {
                    return _AtomicRule.nameClass.match(t.p);
                });
            if (inOpt && matchName.length === 0)
            { ret.status = min === 0 ? RDF.DISPOSITION.ZERO : RDF.DISPOSITION.NONE; ret.matchedEmpty(this); }
            else if (matchName.length < this.min)
            { ret.status = RDF.DISPOSITION.FAIL; ret.error_belowMin(this.min, this); }
//             else if (matchName.length > this.max)
//                 { ret.status = RDF.DISPOSITION.FAIL; ret.error_aboveMax(this.max, this, matchName[this.max]); }
            else {
                var passes = [];
                var fails = [];
                for (var i = 0; i < matchName.length; ++i) {
                    var t = matchName[i];
                    if (this.valueClass._ == 'ValueReference')
                        schema.dispatch('link', this.codes, r, t);
                    var r = this.valueClass.validate(schema, this, t, this.reversed ? t.s : t.o, db, validatorStuff);
                    if (this.valueClass._ != 'ValueReference')
                        schema.dispatch('visit', this.codes, r, t);
                    if (!r.passed() ||
                        schema.dispatch('post', this.codes, r, t) == RDF.DISPOSITION.FAIL)
                        fails.push({t:t, r:r});
                    else
                        passes.push({t:t, r:r});
                }
                if (inOpt && passes.length === 0) {
                    ret.status = min === 0 ? RDF.DISPOSITION.ZERO : RDF.DISPOSITION.NONE;
                    ret.matchedEmpty(this);
                } else if (passes.length < this.min) {
                    ret.status = RDF.DISPOSITION.FAIL;
                    ret.error_belowMin(this.min, this);
                } else if (this.max !== null && passes.length > this.max) {
                    ret.status = RDF.DISPOSITION.FAIL;
                    ret.error_aboveMax(this.max, this, passes[this.max].r);
                }
                if (ret.status == RDF.DISPOSITION.FAIL) {
                    for (var iFails1 = 0; iFails1 < fails.length; ++iFails1)
                        ret.add(fails[iFails1].r);
                } else {
                    for (var iPasses = 0; iPasses < passes.length; ++iPasses)
                        ret.add(passes[iPasses].r);
                    for (var iFails2 = 0; iFails2 < fails.length; ++iFails2)
                        ret.missed(fails[iFails2].r);
                }
            }
            if (this.negated) {
                if (ret.status == RDF.DISPOSITION.FAIL) {
                    ret.status = RDF.DISPOSITION.PASS;
                    ret.errors = [];
                } else if (ret.status == RDF.DISPOSITION.PASS) {
                    ret.status = RDF.DISPOSITION.FAIL;
                    ret.error_aboveMax(0, this, matchName[0]); // !! take a triple from passes
                }
            }
            return ret;
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
        // only returns ∅|𝜃 if inOpt
        // Concomittant: if (inOpt ∧ SIZE(matchName)=0) if (min=0) return 𝜃 else return ∅;
        // if(SIZE(matchName)<min|>max) return 𝕗;
        // vs=matchName.map(valueClass(v,_,g,false)); if(∃𝕗) return 𝕗; return dispatch('post', 𝕡);
        this.validate = function (schema, point, inOpt, db, validatorStuff) {
            var matched = 0;
            var ret = new RDF.ValRes();
            ret.status = RDF.DISPOSITION.PASS;
            var _ConcomitantRule = this;
            var seen = {};
            var matchName = db.uniqueSubjects();
            if (inOpt && matchName.length === 0)
            { ret.status = min === 0 ? RDF.DISPOSITION.ZERO : RDF.DISPOSITION.NONE; ret.matchedEmpty(this); }
            else if (matchName.length < this.min)
            { ret.status = RDF.DISPOSITION.FAIL; ret.error_belowMin(this.min, this); }
//             else if (matchName.length > this.max)
//                 { ret.status = RDF.DISPOSITION.FAIL; ret.error_aboveMax(this.max, this, matchName[this.max]); }
            else {
                var passes = [];
                for (var iMatches = 0; iMatches < matchName.length; ++iMatches) {
                    var s = matchName[iMatches];
                    var p = RDF.IRI("http://www.w3.org/2013/ShEx/Definition#concomitantRelation");
                    var t = RDF.Triple(point, p, s); // make up connecting triple for reporting
                    if (this.valueClass._ == 'ValueReference')
                        schema.dispatch('link', this.codes, r, t);
                    var r = this.valueClass.validate(schema, this, t, s, db, validatorStuff);
                    if (this.valueClass._ != 'ValueReference')
                        schema.dispatch('visit', this.codes, r, t);
                    if (r.passed() &&
                        schema.dispatch('post', this.codes, r, t) != RDF.DISPOSITION.FAIL)
                        passes.push({t:t, r:r});
                }
                if (inOpt && passes.length === 0) {
                    ret.status = min === 0 ? RDF.DISPOSITION.ZERO : RDF.DISPOSITION.NONE;
                    ret.matchedEmpty(this);
                } else if (passes.length < this.min) {
                    ret.status = RDF.DISPOSITION.FAIL;
                    ret.error_belowMin(this.min, this);
                } else if (this.max !== null && passes.length > this.max) {
                    ret.status = RDF.DISPOSITION.FAIL;
                    ret.error_aboveMax(this.max, this, passes[this.max].r);
                }
                if (ret.status != RDF.DISPOSITION.FAIL)
                    for (var iPasses = 0; iPasses < passes.length; ++iPasses)
                        ret.add(passes[iPasses].r);
            }
            return ret;
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
        // GroupRule: v=validity(r,p,g,inOpt|opt); if(𝕗|𝜃) return v;
        // if(∅) {if(inOpt) return ∅ else if (opt) return 𝕡 else return 𝕗}; return dispatch('post', );
        this.validate = function (schema, point, inOpt, db, validatorStuff) {
            schema.dispatch('enter', this.codes, this, {o:point}); // !! lie! it's the *subject*!
            var v = this.rule.validate(schema, point, inOpt || this.opt, db, validatorStuff);
            schema.dispatch('exit', this.codes, this, null);
            if (v.status == RDF.DISPOSITION.FAIL || v.status == RDF.DISPOSITION.ZERO)
                ; // v.status = RDF.DISPOSITION.FAIL; -- avoid dispatch below
            else if (v.status == RDF.DISPOSITION.NONE) {
                // if (inOpt) v.status = RDF.DISPOSITION.NONE; else
                if (this.opt)
                    v.status = RDF.DISPOSITION.PASS;
                else
                    v.status = RDF.DISPOSITION.FAIL;
            } else if (v.status != RDF.DISPOSITION.FAIL)
                v.status = schema.dispatch('post', this.codes, v, v.matches);
            return v;
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
            return ret;
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

        // AndRule: vs=conjoints.map(validity(_,p,g,o)); if(∃𝕗) return 𝕗;
        // if(∃𝕡∧∃∅) return 𝕗; if(∄𝕡∧∄∅) return 𝜃 else if(∃𝕡) return 𝕡 else return ∅
        // Note, this FAILs an empty disjunction.
        this.validate = function (schema, point, inOpt, db, validatorStuff) {
            var ret = new RDF.ValRes();
            var seenFail = false;
            var allPass = RDF.DISPOSITION.PASS;
            var passes = [];
            var empties = [];
            for (var i = 0; i < this.conjoints.length; ++i) {
                var conj = this.conjoints[i];
                var r = conj.validate(schema, point, inOpt, db, validatorStuff);
                ret.add(r);
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
            }
            if (passes.length && empties.length) //
            { ret.status = RDF.DISPOSITION.FAIL; ret.error_mixedOpt(passes, empties, this); }
            else if (seenFail)
                ret.status = RDF.DISPOSITION.FAIL;
            else if (!passes.length && !empties.length)
                ret.status = RDF.DISPOSITION.ZERO;
            else
                ret.status = allPass;
            return ret;
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
        // ∃!x -> true if there's exactly one x in vs
        // OrRule: vs=disjoints.map(validity(_,p,g,o)); if(∄𝕡∧∄∅∧∄𝜃) return 𝕗;
        // if(∃!𝕡) return 𝕡; if(∃!𝜃) return 𝜃 else return 𝕗;
        this.validate = function (schema, point, inOpt, db, validatorStuff) {
            var ret = new RDF.ValRes();
            var allErrors = true;
            var passCount = 0;
            var indefCount = 0;
            var failures = [];
            for (var i = 0; i < this.disjoints.length; ++i) {
                var disj = this.disjoints[i];
                var r = disj.validate(schema, point, inOpt, db, validatorStuff);
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
            if (allErrors || passCount > 1)
                ret.status = RDF.DISPOSITION.FAIL;
            else if (passCount)
                ret.status = RDF.DISPOSITION.PASS;
            else if (indefCount)
                ret.status = RDF.DISPOSITION.ZERO;
            else
                ret.status = RDF.DISPOSITION.FAIL;
            if (ret.status === RDF.DISPOSITION.FAIL)
                ret.error_or(failures, this);
            return ret;
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
            var ret = this.termResults[key];
            if (ret === undefined) {
                this.termResults[key] = new RDF.ValRes(); // temporary empty solution
                this.termResults[key].status = RDF.DISPOSITION.PASS; // matchedEmpty(this.ruleMap[asStr]);

                var closedSubGraph;
                if (validatorStuff.closedShapes)
                    closedSubGraph = db.triplesMatching(point, null, null);

                var rule = subShapes ? this.getRuleMapClosure(as) : this.ruleMap[asStr];

                ret = rule.validate(this, point, false, db, validatorStuff);

                // Make sure we used all of the closedSubGraph.
                if (validatorStuff.closedShapes && ret.passed()) {
                    var remaining = closedSubGraph.filter(function (t) {
                        var r = ret.triples();
                        for (var i = 0; i < r.length; ++i)
                            if (r[i] === t)
                                return false;
                        return true;
                    });
                    if (remaining.length)
                    { ret.status = RDF.DISPOSITION.FAIL; ret.error_noMatchExtra(rule, remaining); }
                }
                this.termResults[key] = ret;
            }
            return ret;
        };

        this.closeShapes = function (point, as, db, validatorStuff, subShapes) {
            var ret = this.validatePoint(point, as, db, validatorStuff, subShapes);
            if (ret.status == RDF.DISPOSITION.PASS) {
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
        };

        // usual interface for validating a pointed graph
        this.validate = function (point, as, db, validatorStuff, subShapes) {
            var callbacksAlwaysInvoked = this.alwaysInvoke;
            this.dispatch('begin', this.init, null, {
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
            var ret = this.closeShapes(point, as, db, validatorStuff, subShapes);
            this.dispatch('end', this.init, null, ret);
            return ret;
        };

        // usual interface for finding types in a graph
        this.findTypes = function (db, validatorStuff) {
            var ret = new RDF.ValRes(); // accumulate validation successes.
            ret.status = RDF.DISPOSITION.PASS;

            // Get all of the subject nodes.
            // Note that this dataset has different objects for each
            // lexical instantiation of an RDF node so we key on
            // the string (N-Triples) representations.
            var subjects = db.uniqueSubjects();
            for (var handler in this.handlers)
                if ('beginFindTypes' in this.handlers[handler])
                    this.handlers[handler]['beginFindTypes']();
            // For each (distinct) subject node s,
            for (var iSubjects = 0; iSubjects < subjects.length; ++ iSubjects) {
                var s = subjects[iSubjects];

                // for each rule label ruleLabel,
                for (var ri = 0; ri < this.ruleLabels.length; ++ri) {
                    var ruleLabel = this.ruleLabels[ri];

                    // if the labeled rule not VIRTUAL,
                    if (!this.isVirtualShape[ruleLabel.toString()]) {

                        var closedSubGraph = db.triplesMatching(s, null, null);
                        var res = this.validate(s, ruleLabel, db, validatorStuff, false);

                        // If it passed or is indeterminate,
                        if (res.status !== RDF.DISPOSITION.FAIL) {

                            // record the success.
                            RDF.message(s.toString() + " is a " + ruleLabel.toString());
                            var t = RDF.Triple(s, RDF.IRI("http://open-services.net/ns/core#instanceShape", RDF.Position0()), ruleLabel);
                            ret.matchedTree(this.ruleMap[ruleLabel], t, res);
                        }
                    }
                }
            }
            for (var handler in this.handlers)
                if ('endFindTypes' in this.handlers[handler])
                    this.handlers[handler]['endFindTypes']();
            return ret;
        };
        this.dispatch = function (event, codes, valRes, context) {
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
                var ret = handlers[handlerName][event](code, valRes, context);

                // restore old register function
                if (f)
                    context.register = f;

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
                if (this.handlers[handlerName] && this.handlers[handlerName][event]) {
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
                tOrdinal = dataIdMap.getInt(ts);
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
                tOrdinal = dataIdMap.getInt(ts)
                classNames.addErrorClass("", dataIdMap.getMembers(tOrdinal));
                // document.getElementById("t"+tOrdinal).classList.add("error");
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
            this.triples = function () {
                return [this.triple];
            }
        },
            RuleMatchTree = function (rule, triple, r) {
                this._ = 'RuleMatchTree'; this.status = RDF.DISPOSITION.PASS; this.rule = rule; this.triple = triple; this.r = r;
                this.toString = function (depth) {
                    return pad(depth) + this.rule.toString() + " matched by "
                        + this.triple.toString() + "\n" + r.toString(depth+1);
                };
                this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                    return renderRule(this.rule, this.triple, depth, schemaIdMap, dataIdMap, solutions, classNames)
                        + "\n" + this.r.toHTML(depth+1, schemaIdMap, dataIdMap, solutions, classNames);
                };
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
                this.triples = function () {
                    return [];
                }
            },
            this._ = 'ValRes'; this.matches = []; this.errors = [], this.misses = [], this.tripleToRules = {};
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
                var p = pad(depth);
                var ret = p + (this.passed() ? "PASS {\n" : "FAIL {\n");
                if (this.errors.length > 0)
                    ret += "Errors:\n" + this.errors.map(function (e) { return ' ☹ ' + p + e.toString(depth+1) + "\n"; }).join("") + "Matches:\n";
                ret += this.matches.map(function (m) { return m.toString(depth+1); }).join("\n");
                return ret + "\n" + p + "}";
            },
            this.toHTML = function (depth, schemaIdMap, dataIdMap, solutions, classNames) {
                var p = pad(depth);
                var ret = p + (this.passed() ? "PASS {\n" : "<span class='error'>FAIL</span> {\n");
                if (this.errors.length > 0)
                    ret += "Errors:\n" + this.errors.map(function (e) { return ' ☹ ' + p + e.toHTML(depth+1, schemaIdMap, dataIdMap, solutions, classNames) + "\n"; }).join("") + "Matches:\n";
                ret += this.matches.map(function (m) { return m.toHTML(depth+1, schemaIdMap, dataIdMap, solutions, classNames); }).join("\n");
                return ret + "\n" + p + "}";
            }
    }

//    curSchema: new this.Schema()
};

// enumerate inheritance
RDF.IRI.prototype.origText = origText;
RDF.RDFLiteral.prototype.origText = origText;
RDF.LangTag.prototype.origText = origText;
RDF.BNode.prototype.origText = origText;

module.exports = RDF;
