var pageInitialized = false;

$(function documentReady() {

    if (pageInitialized) {
        return;
    }
    pageInitialized = true;


    //UI.documentReady();

    window.onerror = function onerror(message, file, line, col, e) {
        // Only Chrome & Opera (Blink engine) pass the error object, which we need to get a stack trace
        if (typeof(e) != "undefined") {
            Log.exception(e);
        }
    };

    // Fix bug in slip
    Slip.prototype.updatePosition = function (e, pos) {
        this.latestPosition = pos;

        var triggerOffset = 40,
            offset = 0;

        var scrollable = this.target.scrollContainer || document.body,
            containerRect = scrollable.getBoundingClientRect(),
            targetRect = this.target.node.getBoundingClientRect(),
            bottomOffset = Math.min(containerRect.bottom, window.innerHeight) - targetRect.bottom,
            topOffset = targetRect.top - Math.max(containerRect.top, 0);

        if (bottomOffset < triggerOffset) {
            offset = triggerOffset - bottomOffset;
        }
        else if (topOffset < triggerOffset) {
            offset = topOffset - triggerOffset;
        }

        var prevScrollTop = scrollable.scrollTop;
        //scrollable.scrollTop += offset;
        if (prevScrollTop != scrollable.scrollTop) this.startPosition.y += prevScrollTop - scrollable.scrollTop;

        if (this.state.onMove) {
            if (this.state.onMove.call(this) === false) {
                e.preventDefault();
            }
        }

        // sample latestPosition 100ms for velocity
        if (this.latestPosition.time - this.previousPosition.time > 100) {
            this.previousPosition = this.latestPosition;
        }
    };

    // TODO: Write admin code to execute on document ready, e.g. set up event handlers

});