ShExLog = {

    v: function v(logMessage)
    {
        if($.type(logMessage) == "string" && arguments.callee.caller && arguments.callee.caller.name)
        {
            logMessage = arguments.callee.caller.name + ": " + logMessage;
        }

        ShExLog.prettylog("v", logMessage);
    },

    d: function d(logMessage)
    {
        if($.type(logMessage) == "string" && arguments.callee.caller && arguments.callee.caller.name)
        {
            logMessage = arguments.callee.caller.name + ": " + logMessage;
        }

        ShExLog.prettylog("d", logMessage);
    },

    i: function i(logMessage)
    {
        if($.type(logMessage) == "string" && arguments.callee.caller && arguments.callee.caller.name)
        {
            logMessage = arguments.callee.caller.name + ": " + logMessage;
        }

        ShExLog.prettylog("i", logMessage);
    },

    w: function w(logMessage)
    {
        if($.type(logMessage) == "string" && arguments.callee.caller && arguments.callee.caller.name)
        {
            logMessage = arguments.callee.caller.name + ": " + logMessage;
        }

        ShExLog.prettylog("w", logMessage);
    },

    e: function e(logMessage)
    {
        if($.type(logMessage) == "string" && arguments.callee.caller && arguments.callee.caller.name)
        {
            logMessage = arguments.callee.caller.name + ": " + logMessage;
        }

        ShExLog.prettylog("e", logMessage);
    },

    exception: function exception(e)
    {
        var errorString = e.stack.toString();
        ShExLog.prettylog("e", errorString);
    },

    getInlineFunctionTrace: function getInlineFunctionTrace(inputArguments)
    {
        var inlineTraceString = '';

        if( inputArguments.callee )
        {
            inlineTraceString += inputArguments.callee.name;
        }

        if(inputArguments.callee.caller && inputArguments.callee.caller.name)
        {
            inlineTraceString += " called by " + inputArguments.callee.caller.name;
        }

        if(inputArguments.length)
        {
            inlineTraceString += " with arguments: " + [].slice.apply(inputArguments).toString();
        }

        return inlineTraceString;
    },
    
    prettylog: function prettylog(logLevel, logMessage)
    {
        var objectToLog = false;
        if($.type(logMessage) != "string")
        {
            objectToLog = logMessage;
            logMessage = "Object dump below:";
        }
    
        if(logLevel == "v")
        {
            console.log("%c" + logMessage, "color: #999999");
        }
        else if(logLevel == "d")
        {
            console.log(logMessage);
        }
        else if(logLevel == "i")
        {
            console.log("%c" + logMessage, "color: #008800");
        }
        else if(logLevel == "w")
        {
            console.warn(logMessage);
        }
        else if(logLevel == "e")
        {
            console.error(logMessage);
        }
        else
        {
            console.log(logMessage);
        }
    
        if(objectToLog !== false)
        {
            console.log(objectToLog);
        }
    }

};