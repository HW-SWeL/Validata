/*
 * Parses and exports shex
 *
 * Dependencies: Jquery's Proxy
 * 
 * @author Leif Gehrmann
 *
 */

function JShex(){
    this.prefixes = [];
    this.shapes = {};
    this.start = undefined;
}

// static regex for buffer and parse for the nmea strings.
JShex.prototype.other = "";

// Takes in the parsed output from the shex parser and converts it into a simplified shex format
JShex.prototype.parseShEx = function(shex){

    // Clears the content
    this.prefixes = [];
    this.shapes = [];
    this.start = undefined;

    this.start = shex.startRule.lex;
    for (var shape in shex.ruleMap) {
        this.shapes[shape] = this.parseRule(shex.ruleMap[shape]);
    }
};

JShex.prototype.parseRule = function(rule){
    /*switch(rule._){
        case "AndRule":
            return {_:rule._, list.crap}
            break;
        case "OrRule":
            break;
        case "IncludeRule":
            break;
    }*/
};

JShex.prototype.parseAndRule = function(rule){

};

JShex.prototype.parseAtomicRule = function(parent,atomicRule){

};

JShex.prototype.toShEx = function(){

};