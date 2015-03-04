ShExUtil = {

    waitForFinalEvent: function waitForFinalEvent()
    {
        var timers = {};
        return function waitForFinalEventCallback(callback, ms, uniqueId)
        {
            if (!uniqueId)
            {
                uniqueId = "Don't call this twice without a uniqueId";
            }
            if (timers[uniqueId])
            {
                clearTimeout(timers[uniqueId]);
            }
            timers[uniqueId] = setTimeout(callback, ms);
        };
    }(),
    
    // This will return true for a non-empty string, number or boolean value
    // It will return false for undefined itself
    isDefined: function isDefined(value)
    {
        try
        { // Check value has been passed in
            if (typeof value !== 'undefined')
            {
                // If value is "truthy" (not null, undefined, NaN, "", 0, false)
                if (value)
                {
                    // Check that value is not the string "undefined"
                    return value !== "undefined";
                }
                // If value is not "truthy", we may still consider it defined if it is boolean false or number 0
                else
                {
                    return !!(value === false || value === 0);
                }
            }

            return false;
        }
        catch (e)
        {
            ShExLog.exception(e);
        }
    },

    stringIsEmpty: function stringIsEmpty(value)
    {
        try
        {
            return !(ShExUtil.isDefined(value) && ( ShExUtil.isNumber(value) || (ShExUtil.isString(value) && value.length > 0 && value != "null") ));
        }
        catch (e)
        {
            ShExLog.exception(e);
        }
    },

    stringIsNotEmpty: function stringIsNotEmpty(value)
    {
        return !ShExUtil.stringIsEmpty(value);
    },

    stringIsBlank: function stringIsBlank(value)
    {
        if (ShExUtil.stringIsEmpty(value))
        {
            return true;
        }

        if (ShExUtil.isString(value))
        {
            value = value.replace(/\s+/g, '');

            if (ShExUtil.stringIsEmpty(value))
            {
                return true;
            }
        }

        return false;
    },

    stringIsNotBlank: function stringIsNotBlank(value)
    {
        return !ShExUtil.stringIsBlank(value);
    },

    isNumber: function isNumber(n)
    {
        try
        {
            return !isNaN(parseFloat(n)) && isFinite(n);
        }
        catch (e)
        {
            ShExLog.exception(e);
        }
    },

    isInt: function isInt(n)
    {
        try
        {
            if (!ShExUtil.isNumber(n))
            {
                return false;
            }
            return n % 1 === 0;
        }
        catch (e)
        {
            ShExLog.exception(e);
        }
    },

    isString: function isString(value)
    {
        try
        {
            return $.type(value) == "string";
        }
        catch (e)
        {
            ShExLog.exception(e);
        }
    },

    isFloat: function isFloat(n)
    {
        try
        {
            if (!ShExUtil.isNumber(n))
            {
                return false;
            }
            return n === +n && n !== (n | 0);
        }
        catch (e)
        {
            ShExLog.exception(e);
        }
    },

    isIterable: function isIterable(obj)
    {
        try
        {
            if(!ShExUtil.isDefined(obj))
            {
                return false;
            }

            return ( $.type(obj) == "array" || $.type(obj) == "object" );
        }
        catch (e)
        {
            ShExLog.exception(e);
        }
    },

    intValue: function intValue(obj)
    {
        if( ShExUtil.stringIsEmpty(obj) )
        {
            return 0;
        }
        else
        {
            return parseInt(obj);
        }
    },

    floatValue: function floatValue(obj)
    {
        if( ShExUtil.stringIsEmpty(obj) )
        {
            return 0.000;
        }
        else
        {
            return parseFloat(obj);
        }
    },

    stringValue: function stringValue(obj)
    {
        if( ShExUtil.stringIsEmpty(obj) )
        {
            return "";
        }
        else
        {
            return String(obj);
        }
    },

    stringValueNoBlank: function stringValueNoBlank(obj, blankSpacer)
    {
        if( ShExUtil.stringIsEmpty(obj) )
        {
            return blankSpacer;
        }
        else
        {
            return String(obj);
        }
    },

    countDecimalPlaces: function countDecimalPlaces(n)
    {
        try
        {
            ShExLog.v("ShExUtil." + ShExLog.getInlineFunctionTrace(arguments));

            return (n.split('.')[1] || []).length;
        }
        catch (e)
        {
            ShExLog.exception(e);
        }
    },

    iterableLength: function iterableLength(iterable)
    {
        try
        {
            ShExLog.v("ShExUtil." + ShExLog.getInlineFunctionTrace(arguments));

            if(!ShExUtil.isDefined(iterable))
            {
                return 0;
            }

            if ($.type(iterable) == "array")
            {
                return iterable.length;
            }
            else if ($.type(iterable) == "object")
            {
                return Object.keys(iterable).length;
            }
            else
            {
                return 0;
            }
        }
        catch (e)
        {
            ShExLog.exception(e);
        }
    },

    getUnixtime: function getUnixtime()
    {
        try
        {
            ShExLog.v("ShExUtil." + ShExLog.getInlineFunctionTrace(arguments));

            var ts = new Date().getTime() / 1000;
            return Math.floor(ts);
        }
        catch (e)
        {
            ShExLog.exception(e);
        }
    },

    getObjectValues: function getObjectValues(object)
    {
        if (ShExUtil.isIterable(object))
        {
            return $.map(object, function getObjectValuesMapCallback(v)
            {
                return v;
            });
        }
        else
        {
            return [];
        }
    },

    sortArrayByNumericObjectProperty: function sortArrayByNumericObjectProperty(inputArray, sortKey, descendingOrder)
    {
        if (ShExUtil.iterableLength(inputArray))
        {
            inputArray.sort(function sortArrayByNumericObjectPropertySortFunction(a, b)
            {
                var aSort = parseFloat(a[sortKey]);
                var bSort = parseFloat(b[sortKey]);
                return (aSort == bSort) ? 0 : (aSort > bSort) ? 1 : -1;
            });

            if (descendingOrder != undefined && descendingOrder == true)
            {
                inputArray.reverse();
            }
        }

        return inputArray;
    },

    sortArrayByStringObjectProperty: function sortArrayByStringObjectProperty(inputArray, sortKey, descendingOrder)
    {
        inputArray.sort(function sortArrayByStringObjectPropertySortFunction(a, b)
        {
            return a[sortKey].localeCompare(b[sortKey]);
        });

        if (descendingOrder != undefined && descendingOrder == true)
        {
            inputArray.reverse();
        }

        return inputArray;
    },

    findIterableChildObjectByKeyValue: function findIterableChildObjectByKeyValue(inputIterable, childKey, childValue)
    {
        var foundChild = false;

        if (ShExUtil.isIterable(inputIterable))
        {
            $.each(inputIterable, function inputIterableIterator(index, childObject)
            {
                if (childObject[childKey] == childObject[childValue])
                {
                    foundChild = childObject;
                    return false;
                }
            });
        }

        return foundChild;
    },

    findIterableChildObjectByCallback: function findIterableChildObjectByCallback(inputIterable, childCallback)
    {
        var foundChild = false;

        if (ShExUtil.isIterable(inputIterable))
        {
            $.each(inputIterable, function inputIterableIterator(index, childObject)
            {
                if (childCallback(childObject))
                {
                    foundChild = childObject;
                    return false;
                }
            });
        }

        return foundChild;
    },

    getJustText: function getJustText(element)
    {
        try
        {
            ShExLog.v("ShExUtil." + ShExLog.getInlineFunctionTrace(arguments));

            return element.clone()
                .children()
                .remove()
                .end()
                .text();
        }
        catch (e)
        {
            ShExLog.exception(e);
        }
    },

    trimToLength: function truncateString(inputString, inputLength) {
        var outputString = $.trim( ShExUtil.stringValue(inputString) );

        if(outputString.length > inputLength)
        {
            outputString = outputString.substring(0, inputLength).split(" ").slice(0, -1).join(" ") + "...";
        }

        return outputString;
    }
    
};