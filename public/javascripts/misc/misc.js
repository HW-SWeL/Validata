// var shexc = "http://shex.io/examples/Issue.shex";
// var shape = "http://shex.io/examples/IssueShape";
// var data = "http://shex.io/examples/Issue1.ttl";
// var node = "http://shex.io/examples/Issue1";



var shex = require("shex");

var shexc = "http://127.0.0.1:8888/doc/samples/Issue.shex"
var data = "http://127.0.0.1:8888/doc/samples/Issue1.ttl"
var shape = "http://127.0.0.1:8888/doc/samples/IssueShape"
var node = "http://127.0.0.1:8888/doc/samples/Issue1"
var node2 = 'http://127.0.0.1:8888/doc/samples/User2'
var shape2 = "http://127.0.0.1:8888/doc/samples/UserShape"

var loaded_data;
var loaded_schema;

// var result = shex.Loader.load([shexc], [], [data], []).then(
// 	function (loaded) {  
// 		var validator = shex.Validator.construct(loaded.schema);
// 		var result = validator.validate(loaded.data, node2, shape2);
// 		return result
// });

var result;

shex.Loader.load([shexc], [], [data], []).then(function (loaded) {
    result = shex.Validator.construct(loaded.schema).validate(loaded.data, node2, shape2);    
});





// for (var i = result.solution.solutions.length - 1; i >= 0; i--) {
// 	console.log(result.solution.solutions[i]);
// }

// var validator = shex.Validator.construct(
//           loaded_data.schema,
//           { results: "api", regexModule: "threaded-val-nerr" });

// var ret = validator.validate()


