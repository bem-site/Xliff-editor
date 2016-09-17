modules.define('editor', ['i-bem__dom', 'jquery'], function(provide, BEMDOM, $) {

provide(BEMDOM.decl(this.name, {
    onSetMod: {
        'js': {
            inited: function() {
                this.bindTo('keydown', this.onKeyDown);
            }
        }
    },

    /**
     * method for insert tags as html node into div contenteditable = true
     * @param tag {String}
     * @private
     */
    _insertTag: function(tag, param, keyCode) {
        var selection = window.getSelection(),
            range = (selection.getRangeAt && selection.rangeCount) && selection.getRangeAt(0);

        range.deleteContents();

        // prepare document fragment with tag for insert to Range-object
        var el = document.createElement('div'),
            frag = document.createDocumentFragment(),
            node, lastNode;

        el.innerHTML = `<hr class='markup-tag markup-tag_type_${param} markup-tag_code_${keyCode}'
            data-value='${tag}'>`;

        while ((node = el.firstChild)) {
            lastNode = frag.appendChild(node);
        }

        range.insertNode(frag);

        // Preserve the selection to insert caret
        if (!lastNode) return;

        range = range.cloneRange();
        range.setStartAfter(lastNode); // set caret for end of this area
        range.collapse(true);

        selection.removeAllRanges();
        selection.addRange(range);

    },

    onKeyDown: function(e) {
        // key codes for 'ALT + [1-9]' combinations
        var keyCode = { 49: 1, 50: 2, 51: 3, 52: 4, 53: 5, 54: 6, 55: 7, 56: 8, 57: 9 }[e.keyCode];

        if (!(e.altKey && keyCode)) return;

        var elem = this.findElem($(e.target), 'textarea'),
            index = elem.data('index'),
            // array of all available tags, example: ['<bpt id=l1>[</bpt>', '<ept id=l1>]</ept>', ...]
            keys = window.segments[index].keys,
            openTag = keys[keyCode * 2 - 2], // 'keyCode * 2 - 2' is index of open tag in keys array
            closeTag = keys[keyCode * 2 - 1]; // same as previous

        if (!keys.length || !openTag) return false; // if button doesn't have tags

        var text = elem.html().replace(new RegExp('&quot;','g'),'"'), // hack for find elem in text
            caretPos = window.getSelection().getRangeAt(0).startOffset,
            availableTags = [
                { tag: openTag, position: text.indexOf(openTag) },
                { tag: closeTag, position: text.indexOf(closeTag) }
            ];

        if (availableTags[0].position === -1) {
            if (availableTags[1].position > -1 && (caretPos > availableTags[1].position)) return false;
            this._insertTag(availableTags[0].tag, 'open', keyCode);
        } else if (availableTags[1].position === -1) {
            this._insertTag(availableTags[1].tag, 'close', keyCode);
        }

        e.preventDefault();
    },

    onFocusIn: function(e) {
        this.setMod($(e.target.parentNode), 'focused').emit('showAltTrans', e.target);
    },

    onFocusOut: function(e) {
        var elem = $(e.target),
            index = elem.data('index'),
            text = elem.html();

        var tagsHr = text.match(/<hr[^>]*>[^>]*>[^>]*>/g);
        var tagBptEpt = text.match(/data-value="<[^>]*>*[^>]*>/g);

        tagsHr && tagsHr.forEach(function(value, index) {
            text = text.replace(value, tagBptEpt[index].replace('data-value="', ''));
        });

        window.segments[index].target.content = text.replace(new RegExp('&quot;','g'),'"');
        this.delMod($(e.target.parentNode), 'focused');
    },

    setStatus: function(e) {
        var index = $(e.target.domElem).data('index');

        window.segments[index].status = e.target.getMod('checked');
    }
}, {
    live: function() {
        this.liveBindTo('target', 'focusin', this.prototype.onFocusIn)
            .liveBindTo('target', 'focusout', this.prototype.onFocusOut)
            .liveInitOnBlockInsideEvent({ modName: 'checked', modVal: '*' }, 'checkbox', this.prototype.setStatus);
    }
}));

});
