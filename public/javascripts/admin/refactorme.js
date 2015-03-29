/**
 * Created by Home on 28/03/2015.
 */
$(document).ready(function(){

    $('[data-toggle="tooltip"]').tooltip();

    $(".panel-help").find(".panel-body").hide();

    $(".panel").find(".panel-heading").click(function(){
        $(this).parent().find(".panel-body").slideToggle();
    });
    var setAllowCustom = function setAllowCustom(t){
        if(t)
            $(".config-allowcustom-toggle").addClass("config-allowcustom");
        else
            $(".config-allowcustom-toggle").removeClass("config-allowcustom");
    };
    var setShowSource = function setShowSource(t){
        if(t)
            $(".config-showsource-toggle").addClass("config-showsource");
        else
            $(".config-showsource-toggle").removeClass("config-showsource");
    };
    var getAllowCustom = function getAllowCustom(){
        return $(".config-allowcustom-toggle").hasClass("config-allowcustom");
    };
    var getShowSource = function getShowSource(){
        return $(".config-showsource-toggle").hasClass("config-showsource");
    };
    $(".config-allowcustom-toggle").click(function(){
        if(getAllowCustom()){
            setAllowCustom(false);
        } else {
            setAllowCustom(true);
        }
    });
    $(".config-showsource-toggle").click(function(){
        if(getShowSource()){
            setShowSource(false);
        } else {
            setShowSource(true);
        }
    });
    var deleteSchema = function deleteSchema(schema){
        var really = confirm("Delete this Schema?");
        if(really){
            $(schema).fadeOut(350,function(){
                $(this).remove();
                var schemas = getAllSchemas();
                if(schemas.length!=0){
                    for(var i=schemas.length-1;i>=0;i--){
                        defaultSchema(schemas[i]);
                    }
                }
            });
        }
    };
    var enableSchema = function enableSchema(schema){
        if($(schema).hasClass("schema-is-enabled") && !$(schema).hasClass("schema-is-default")){
            $(schema).removeClass("schema-is-enabled");
        } else {
            $(schema).addClass("schema-is-enabled");
        }
    };
    var defaultSchema = function defaultSchema(schema){
        if($(schema).hasClass("schema-is-enabled")){
            getAllSchemas().each(function( index ) {
                $(this).removeClass("schema-is-default");
            });
            $(schema).addClass("schema-is-default");
        }
    };
    var setSchemaEnable = function setSchemaDefault(schema,t){
        if(t)
            $(schema).addClass("schema-is-enabled");
        else
            $(schema).removeClass("schema-is-enabled");
    };
    var setSchemaDefault = function setSchemaDefault(schema,t){
        if(t)
            $(schema).addClass("schema-is-default");
        else
            $(schema).removeClass("schema-is-default");
    };
    var setSchemaName = function setSchemaName(schema,name){
        $(schema).find(".schema-input-name-input").val(name).trigger("input");
    };
    var setSchemaDescription = function setSchemaDescription(schema,description){
        $(schema).find(".schema-input-description-input").val(description).trigger("input");
    };
    var setSchemaCreationDate = function setSchemaCreationdate(schema,creationDate){
        if(creationDate!=undefined){
            $(schema).find(".schema-input-creationdate-input").val(moment.unix(creationDate).format()).trigger("input");
        } else {
            $(schema).find(".schema-input-creationdate-input").val(" ").trigger("input");
        }
    };
    var setRequirementLevels = function setRequirementLevels(schema,data){
        if(data!=undefined){
            $(schema).find(".schema-input-requirementlevels-input").val(data.join());
        }
    };
    var setSchemaData = function setSchemaData(schema,data){
        $(schema).data("schemaInput").setValue(data);
        $($(schema).data("schemaInput")).trigger("change");
    };
    var setDemoName = function setSchemaName(demo,name){
        $(demo).find(".schema-demo-name-input").val(name);
    };
    var setDemoData = function setDemoData(demo,data){
        $(demo).data("demoInput").setValue(data);
    };

    var getAllSchemas = function getAllSchemas(){
        return $(".schemas").find(".schema");
    };
    var addConfiguration = function addConfiguration(json){
        if("options" in json){
            setAllowCustom(json.options.allowCustomSchema);
            setShowSource(json.options.showSourceButton);
        }
        if("schemas" in json){
            for(var i=0;i<json.schemas.length;i++){
                addSchema(json.schemas[i]);
            }
        }
    };
    var addSchema = function addSchema(schemajson){
        var newSchema = createNewSchema();
        setSchemaDefault(newSchema,schemajson.default);
        setSchemaEnable(newSchema,schemajson.enabled);
        setSchemaName(newSchema,schemajson.name);
        setSchemaDescription(newSchema,schemajson.description);
        setSchemaCreationDate(newSchema,schemajson.creationDate);
        setRequirementLevels(newSchema,schemajson.reqLevels);
        setSchemaData(newSchema,schemajson.data);
        for(var i=0;i<schemajson.dataDemos.length;i++){
            addDemo(newSchema,schemajson.dataDemos[i]);
        }
        return newSchema;
    };
    var addDemo = function addDemo(schema,demojson){
        var newDemo = createNewDemo(schema);
        setDemoName(newDemo,demojson.name);
        setDemoData(newDemo,demojson.data);
        return newDemo;
    };
    var exportSchema = function exportSchema(schema){
        s = {};
        s.default = $(schema).hasClass("schema-is-default");
        s.enabled =         $(schema).hasClass("schema-is-enabled");
        s.name =            $(schema).find(".schema-name").text();
        s.description =     $(schema).find(".schema-input-description-input").val();
        s.creationDate =    moment($(schema).find(".schema-input-creationdate-input").val()).unix();
        if($(schema).find(".schema-input-requirementlevels-input").val()!=""){
            s.reqLevels =   $(schema).find(".schema-input-requirementlevels-input").val().split(",");
        }
        s.data =            $.data( schema, "schemaInput").getValue();
        s.dataDemos =       [];
        var demos = $(schema).find(".schema-demo");
        for(var i=0;i<demos.length;i++){
            var d = {};
            d.name = $(demos[i]).find(".schema-demo-name-input").val();
            d.data = $.data( demos[i], "demoInput").getValue();
            s.dataDemos.push(d);
        }
        return s;
    };
    var exportConfiguration = function exportConfiguration(){
        var json = {};

        // Export schema data
        json.schemas = [];
        var schemas = getAllSchemas();
        for(var i=0;i<schemas.length;i++){
            json.schemas.push(exportSchema(schemas[i]));
        }

        // Export option data
        json.options = {};
        json.options.showSourceButton = getShowSource();
        json.options.allowCustomSchema = getAllowCustom();
        return json;
    };
    var createNewDemo = function createNewDemo(schema){
        var newDemo = $(".schema-demo-template").clone();
        newDemo.find(".schema-demo-delete").click(function(e){
            var really = confirm("Delete this Demo?");
            if(really){
                $(this).parent().parent().parent().fadeOut(350,function(){$(this).remove();});
            }
            e.stopPropagation();
        });
        newDemo.removeClass("schema-demo-template");
        newDemo.appendTo(schema.find(".schema-demos"));
        var demoInput = CodeMirror.fromTextArea(newDemo.find(".schema-demo-data-input").get(0), {
            lineNumbers: true
        });
        $(newDemo).data("demoInput",demoInput);
        newDemo.find(".CodeMirror-resize-sub-300").click(function(e) {
            var old_height = $(newDemo.data("demoInput").getWrapperElement()).height();
            if(old_height>300){
                newDemo.data("demoInput").setSize("100%",old_height-300);
            }
        });
        newDemo.find(".CodeMirror-resize-inc-300").click(function(e) {
            var old_height = $(newDemo.data("demoInput").getWrapperElement()).height();
            newDemo.data("demoInput").setSize("100%",old_height+300);
        });
        return newDemo;
    };
    var createNewSchema = function createNewSchema(){
        var newSchema = $(".schema-template").clone();
        newSchema.removeClass("schema-template");

        // Set the schema as default if this is the first one added
        if(getAllSchemas().length==0){
            newSchema.addClass("schema-is-default");
        }

        newSchema.find(".schema-delete").click(function(e){
            deleteSchema(newSchema);
            e.stopPropagation();
        });
        newSchema.find(".schema-enable").click(function(e){
            enableSchema(newSchema);
            e.stopPropagation();
        });
        newSchema.find(".schema-default").click(function(e){
            defaultSchema(newSchema);
            e.stopPropagation();
        });
        newSchema.find(".schema-reorder").click(function(e){
            e.stopPropagation();
        });
        newSchema.find(".schema-body").off();
        newSchema.find(".schema-header").click(function(e){
            $(this).parent().find(".schema-body").slideToggle();
            e.stopPropagation();
        });
        newSchema.find(".schema-input-name-input").on("input propertychange paste",function(e){
            if($(this).val()!=""){
                $(this).parent().parent().parent().find(".schema-name").html($(this).val());
            } else {
                $(this).parent().parent().parent().find(".schema-name").html("Untitled Schema");
            }
        });
        newSchema.find(".schema-input-name-input").on("input propertychange paste", function(e){
            if(moment($(this).val()).isValid()){
                $(this).parent().parent().addClass("has-error");
            } else {
                $(this).parent().parent().removeClass("has-error");
            }
        });
        newSchema.find(".schema-input-creationdate-input").val(moment().format());
        newSchema.find(".schema-new-demo").click(function(){
            createNewDemo(newSchema);
        });
        newSchema.find(".datetimepicker").datetimepicker({
            format: 'YYYY-MM-DDTHH:mm:ssZ'
        });
        newSchema.appendTo(".schemas");
        var schemaInputField = newSchema.find(".schema-input-schema-input").get(0);
        var schemaInput = CodeMirror.fromTextArea(schemaInputField, {
            lineNumbers: true
        });
        $(newSchema).data("schemaInput",schemaInput);
        var schemaInputOutput = newSchema.find(".schema-input-schema-results");
        var oldLine = undefined;

        newSchema.find(".CodeMirror-resize-sub-300").click(function(e) {
            var old_height = $(newSchema.data("schemaInput").getWrapperElement()).height();
            if(old_height>300){
                newSchema.data("schemaInput").setSize("100%",old_height-300);
            }
        });
        newSchema.find(".CodeMirror-resize-inc-300").click(function(e) {
            var old_height = $(newSchema.data("schemaInput").getWrapperElement()).height();
            newSchema.data("schemaInput").setSize("100%",old_height+300);
        });

        schemaInput.on("change", function() {
            var callbacks = {
                schemaParsed: function schemaParsedCallback(responseObject) {
                    schemaInputOutput.removeClass("schema-input-schema-invalid");
                    schemaInputOutput.addClass("schema-input-schema-valid");
                    schemaInputOutput.text("Successfully parsed!");
                    newSchema.removeClass("schema-is-invalid");
                },
                schemaParseError: function schemaParseErrorCallback(responseObject) {
                    schemaInputOutput.removeClass("schema-input-schema-valid");
                    schemaInputOutput.addClass("schema-input-schema-invalid");
                    var errorMessage = 'Line '+responseObject.line+', Column '+responseObject.column+
                        ' : '+responseObject.message;
                    schemaInputOutput.text(errorMessage);
                    schemaInput.addLineClass(responseObject.line-1, 'background', 'line-error');
                    oldLine = responseObject.line-1;
                    newSchema.addClass("schema-is-invalid");
                }
            };
            Util.waitForFinalEvent(function waitForFinalEventCallback() {
                if(oldLine!=undefined) {
                    schemaInput.removeLineClass(oldLine, 'background', 'line-error');
                }
                var validator = new ShExValidator.Validator(schemaInput.getValue(), "", callbacks, {});
            }, 500, "schemaValidator"+Math.random());
        });
        return newSchema;
    };

    var ol = document.getElementById('slippylist');
    ol.addEventListener('slip:beforereorder', function(e){
        var a = $(e.target).hasClass('schema-reorder');
        var b = $(e.target).parent().hasClass('schema-reorder');
        var c = $(e.target).parent().parent().hasClass('schema-reorder');
        if(a || b || c){
            $(".schemas .schema-body").hide();
        } else {
            return false;
        }
    }, false);

    ol.addEventListener('slip:beforeswipe', function(e){
        e.preventDefault();
    }, false);

    ol.addEventListener('slip:beforewait', function(e){
        var a = $(e.target).hasClass('schema-reorder');
        var b = $(e.target).parent().hasClass('schema-reorder');
        var c = $(e.target).parent().parent().hasClass('schema-reorder');
        if ( a || b || c) e.preventDefault();
    }, false);

    ol.addEventListener('slip:afterswipe', function(e){
        //e.target.parentNode.appendChild(e.target);
    }, false);

    ol.addEventListener('slip:reorder', function(e){
        e.target.parentNode.insertBefore(e.target, e.detail.insertBefore);
        return false;
    }, false);

    new Slip(ol);

    $(".create-new-schema").click(function(){
        createNewSchema();
    });

    $(function () {
        $('.datetimepicker').datetimepicker();
    });

    // Selecting a file using the file chooser should cause the content of that file to be loaded into the data source div as text
    $("#import-file").change(function() {

        var inputFiles = this.files;

        if (inputFiles == undefined || inputFiles.length == 0) {
            return;
        }
        var inputFile = inputFiles[0];

        var reader = new FileReader();

        reader.onload = function (event) {
            addConfiguration(JSON.parse(event.target.result));
        };

        reader.onerror = function (event) {
            console.log("he3");
            var errorMessage = "Selected file could not be uploaded. Error: " + event.target.error.code;
            alert(errorMessage);
        };

        reader.readAsText(inputFile);
    });

    $(".download-file").on('click', function(){

        // create json object from schema array
        var config = exportConfiguration();
        var data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config));
        $(this).attr('href',data);
        $(this).attr('download',"ValidataConfig.json");
    });
});