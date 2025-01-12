/// select2 plugin
(function (Handsontable) {
    "use strict";

    var Select2Editor = Handsontable.editors.TextEditor.prototype.extend();

    // Add select2Options to default settings, or else ngHandsontable will not allow it to be defined in the hot-col element
    Handsontable.DefaultSettings.prototype.select2Options = {};

    Select2Editor.prototype.prepare = function (row, col, prop, td, originalValue, cellProperties) {

        // Prepare default selected value
		/*
		for( var value in originalValue.split(',') ){
			var OPTIONELEMENT = document.createElement('option');
			OPTIONELEMENT.setAttribute('value', originalValue);
			OPTIONELEMENT.setAttribute('selected','selected');
			OPTIONELEMENT.innerHTML = cellProperties.instance.render(value);
			this.TEXTAREA.appendChild(OPTIONELEMENT);
		}
		*/
		this.TEXTAREA.setAttribute('data-column', cellProperties.col);

        Handsontable.editors.TextEditor.prototype.prepare.apply(this, arguments);

        this.options = {};

        if (cellProperties.select2Options) {
            this.options = $.extend(this.options, cellProperties.select2Options);
        }
    };

    Select2Editor.prototype.createElements = function () {
        this.$body = $(document.body);

        this.TEXTAREA = document.createElement('select');
		this.TEXTAREA.setAttribute('multiple','multiple');
        this.$textarea = $(this.TEXTAREA);

        Handsontable.dom.addClass(this.TEXTAREA, 'handsontableInput');

        this.textareaStyle = this.TEXTAREA.style;
        this.textareaStyle.width = 0;
        this.textareaStyle.height = 0;

        this.TEXTAREA_PARENT = document.createElement('DIV');
        Handsontable.dom.addClass(this.TEXTAREA_PARENT, 'handsontableInputHolder');

        this.textareaParentStyle = this.TEXTAREA_PARENT.style;
        this.textareaParentStyle.top = 0;
        this.textareaParentStyle.left = 0;
        this.textareaParentStyle.display = 'none';

        this.TEXTAREA_PARENT.appendChild(this.TEXTAREA);

        this.instance.rootElement.appendChild(this.TEXTAREA_PARENT);

        var that = this;
        this.instance._registerTimeout(setTimeout(function () {
            that.refreshDimensions();
        }, 0));
    };

    var onSelect2Changed = function () {
		this.setValue( this.$textarea.val() );
        //this.finishEditing();
    };
    var onBeforeKeyDown = function (event) {
		console.log(event);
        var instance = this;
        var that = instance.getActiveEditor();

        var keyCodes = Handsontable.helper.KEY_CODES;
        var ctrlDown = (event.ctrlKey || event.metaKey) && !event.altKey; //catch CTRL but not right ALT (which in some systems triggers ALT+CTRL)

        //Process only events that have been fired in the editor
        if (!($(event.target).hasClass('select2-search__field') || $(event.target.parentNode).hasClass('select2-search'))) {
            return;
        }
        if (Handsontable.dom.isImmediatePropagationStopped(event)) {
            return;
        }
        if (event.keyCode === 17 || event.keyCode === 224 || event.keyCode === 91 || event.keyCode === 93) {
            //when CTRL or its equivalent is pressed and cell is edited, don't prepare selectable text in textarea
            Handsontable.dom.stopImmediatePropagation(event);
            return;
        }

        var target = event.target;

        switch (event.keyCode) {
            case keyCodes.ARROW_RIGHT:
                if (Handsontable.dom.getCaretPosition(target) !== target.value.length) {
                    Handsontable.dom.stopImmediatePropagation(event);
                } else {
                    that.$textarea.select2('close');
                }
                break;

            case keyCodes.ARROW_LEFT:
                if (Handsontable.dom.getCaretPosition(target) !== 0) {
                    Handsontable.dom.stopImmediatePropagation(event);
                } else {
                    that.$textarea.select2('close');
                }
                break;

            case keyCodes.ENTER:
                var selected = that.instance.getSelected();
                var isMultipleSelection = !(selected[0] === selected[2] && selected[1] === selected[3]);
                if ((ctrlDown && !isMultipleSelection) || event.altKey) { //if ctrl+enter or alt+enter, add new line
                    if (that.isOpened()) {
                        that.val(that.val() + '\n');
                        that.focus();
                    } else {
                        that.beginEditing(that.originalValue + '\n')
                    }
                    Handsontable.dom.stopImmediatePropagation(event);
                }
                event.preventDefault(); //don't add newline to field
                break;

            case keyCodes.A:
            case keyCodes.X:
            case keyCodes.C:
            case keyCodes.V:
                if (ctrlDown) {
                    Handsontable.dom.stopImmediatePropagation(event); //CTRL+A, CTRL+C, CTRL+V, CTRL+X should only work locally when cell is edited (not in table context)
                }
                break;

            case keyCodes.BACKSPACE:
            case keyCodes.DELETE:
            case keyCodes.HOME:
            case keyCodes.END:
                Handsontable.dom.stopImmediatePropagation(event); //backspace, delete, home, end should only work locally when cell is edited (not in table context)
                break;

            case keyCodes.ARROW_UP:
            case keyCodes.ARROW_DOWN:
                Handsontable.dom.stopImmediatePropagation(event);
                break;

        }

    };

    // Prevent direct opening of select2-editor after a selection has been made by pressing the enter key
    var onBeforeKeyDownEnterKeySelectionWorkaround = function (event) {

		/*
        var instance = this;
        var that = instance.getActiveEditor();
        that.instance.removeHook('beforeKeyDown', onBeforeKeyDownEnterKeySelectionWorkaround);
        Handsontable.dom.stopImmediatePropagation(event);
		*/

    }

    Select2Editor.prototype.open = function (keyboardEvent) {

		this.refreshDimensions();
        this.textareaParentStyle.display = 'block';
        this.textareaParentStyle.zIndex = 20000;
        this.instance.removeHook('beforeKeyDown', onBeforeKeyDownEnterKeySelectionWorkaround);
        this.instance.addHook('beforeKeyDown', onBeforeKeyDown);

        var self = this;
        this.$textarea.select2(this.options)
            .on('change', onSelect2Changed.bind(this));

		this.$textarea.val(this.getValue().split(',')).trigger('change');

        self.$textarea.select2('open');
        
        var selectionElement = $(self.TEXTAREA_PARENT).find('.select2-selection');
        selectionElement.css({
            height: $(self.TD).height() + 4,
            'min-width': $(self.TD).outerWidth() - 4,
            //'visibility': 'hidden'
        });

        // Pushes initial character entered into the search field, if available
        if (keyboardEvent && keyboardEvent.keyCode) {
            var key = keyboardEvent.keyCode;
            var keyText = (String.fromCharCode((96 <= key && key <= 105) ? key-48 : key)).toLowerCase();
			//selectionElement.trigger(keyboardEvent);
            //self.$textarea.select2('search', keyText);
        }
    };

    Select2Editor.prototype.init = function () {
        Handsontable.editors.TextEditor.prototype.init.apply(this, arguments);
    };

    Select2Editor.prototype.close = function () {
        this.instance.listen();
        this.instance.removeHook('beforeKeyDown', onBeforeKeyDown);
        this.instance.removeHook('beforeKeyDown', onBeforeKeyDownEnterKeySelectionWorkaround);
        this.instance.addHook('beforeKeyDown', onBeforeKeyDownEnterKeySelectionWorkaround);
        this.$textarea.off();
        this.$textarea.hide();
        this.$textarea.select2('close');
        Handsontable.editors.TextEditor.prototype.close.apply(this, arguments);
    };

	Select2Editor.prototype.getValue = function () {
		//console.log(this.currentValue);
		return this.currentValue;
	};
	Select2Editor.prototype.setValue = function (value) {
		//console.log(value);
		if( Array.isArray( value ) ){
			this.currentValue = value.join(',');
		} else {
			this.currentValue = value;
		}
	};



    Select2Editor.prototype.focus = function () {

        this.instance.listen();

        // DO NOT CALL THE BASE TEXTEDITOR FOCUS METHOD HERE, IT CAN MAKE THIS EDITOR BEHAVE POORLY AND HAS NO PURPOSE WITHIN THE CONTEXT OF THIS EDITOR
        //Handsontable.editors.TextEditor.prototype.focus.apply(this, arguments);
    };

    Select2Editor.prototype.beginEditing = function (initialValue) {
        var onBeginEditing = this.instance.getSettings().onBeginEditing;
        if (onBeginEditing && onBeginEditing() === false) {
            return;
        }

        Handsontable.editors.TextEditor.prototype.beginEditing.apply(this, arguments);
    };

    Select2Editor.prototype.finishEditing = function (restoreOriginalValue, ctrlDown, callback) {
        this.instance.listen();
        return Handsontable.editors.TextEditor.prototype.finishEditing.apply(this, arguments);
    };

    Handsontable.editors.Select2Editor = Select2Editor;
    Handsontable.editors.registerEditor('select2', Select2Editor);

})(Handsontable);
