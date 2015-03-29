Log = {

    v: function v(logMessage)
    {
        if ($.type(logMessage) == "string" && arguments.callee.caller && arguments.callee.caller.name)
        {
            logMessage = arguments.callee.caller.name + ": " + logMessage;
        }

        Log.prettyConsoleLog("v", logMessage);
    },

    d: function d(logMessage)
    {
        if ($.type(logMessage) == "string" && arguments.callee.caller && arguments.callee.caller.name)
        {
            logMessage = arguments.callee.caller.name + ": " + logMessage;
        }

        Log.prettyConsoleLog("d", logMessage);
    },

    i: function i(logMessage)
    {
        if ($.type(logMessage) == "string" && arguments.callee.caller && arguments.callee.caller.name)
        {
            logMessage = arguments.callee.caller.name + ": " + logMessage;
        }

        Log.prettyConsoleLog("i", logMessage);
    },

    w: function w(logMessage)
    {
        if ($.type(logMessage) == "string" && arguments.callee.caller && arguments.callee.caller.name)
        {
            logMessage = arguments.callee.caller.name + ": " + logMessage;
        }

        Log.prettyConsoleLog("w", logMessage);
    },

    e: function e(logMessage)
    {
        if ($.type(logMessage) == "string" && arguments.callee.caller && arguments.callee.caller.name)
        {
            logMessage = arguments.callee.caller.name + ": " + logMessage;
        }

        Log.prettyConsoleLog("e", logMessage);
    },

    exception: function exception(e)
    {
        var errorString = e.stack.toString();
        Log.prettyConsoleLog("e", errorString);
    },

    getInlineFunctionTrace: function getInlineFunctionTrace(inputArguments, inputCallee)
    {
        var inlineTraceString = '';

        if (inputArguments.callee)
        {
            inlineTraceString += inputArguments.callee.name;
        }

        try
        {
            if (inputCallee.caller)
            {
                inlineTraceString += " called by " + inputCallee.caller.name;
            }
        }
        catch (e)
        {
        }

        if (inputArguments.length)
        {
            inlineTraceString += " with arguments: " + [].slice.apply(inputArguments).toString();
        }

        return inlineTraceString;
    },

    prettyConsoleLog: function prettyConsoleLog(logLevel, logMessage)
    {
        var objectToLog = false;
        if ($.type(logMessage) != "string")
        {
            objectToLog = logMessage;
            logMessage = "Object dump below:";
        }

        if (logLevel == "v")
        {
            console.log("%c" + logMessage, "color: #999999");
        }
        else if (logLevel == "d")
        {
            console.log(logMessage);
        }
        else if (logLevel == "i")
        {
            console.log("%c" + logMessage, "color: #008800");
        }
        else if (logLevel == "w")
        {
            console.warn(logMessage);
        }
        else if (logLevel == "e")
        {
            console.error(logMessage);
        }
        else
        {
            console.log(logMessage);
        }

        if (objectToLog !== false)
        {
            console.log(objectToLog);
        }
    }

};