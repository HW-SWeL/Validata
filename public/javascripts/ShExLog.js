ShExLog = {

    v: function v(logMessage)
    {
        if(arguments.callee.caller && arguments.callee.caller.name)
        {
            logMessage = arguments.callee.caller.name + ": " + logMessage;
        }

        console.log("v", logMessage);
    },

    d: function d(logMessage)
    {
        if(arguments.callee.caller && arguments.callee.caller.name)
        {
            logMessage = arguments.callee.caller.name + ": " + logMessage;
        }

        console.log("d", logMessage);
    },

    i: function i(logMessage)
    {
        if(arguments.callee.caller && arguments.callee.caller.name)
        {
            logMessage = arguments.callee.caller.name + ": " + logMessage;
        }

        console.log("i", logMessage);
    },

    w: function w(logMessage)
    {
        if(arguments.callee.caller && arguments.callee.caller.name)
        {
            logMessage = arguments.callee.caller.name + ": " + logMessage;
        }

        console.log("w", logMessage);
    },

    e: function e(logMessage)
    {
        if(arguments.callee.caller && arguments.callee.caller.name)
        {
            logMessage = arguments.callee.caller.name + ": " + logMessage;
        }

        console.log("e", logMessage);
    },

    exception: function exception(e)
    {
        var errorString = e.stack.toString();
        console.log(e);
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
    }

};