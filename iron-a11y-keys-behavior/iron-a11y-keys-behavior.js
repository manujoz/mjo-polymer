import"../polymer/polymer-element.js";var KEY_IDENTIFIER={"U+0008":"backspace","U+0009":"tab","U+001B":"esc","U+0020":"space","U+007F":"del"},KEY_CODE={8:"backspace",9:"tab",13:"enter",27:"esc",33:"pageup",34:"pagedown",35:"end",36:"home",32:"space",37:"left",38:"up",39:"right",40:"down",46:"del",106:"*"},MODIFIER_KEYS={shift:"shiftKey",ctrl:"ctrlKey",alt:"altKey",meta:"metaKey"},KEY_CHAR=/[a-z0-9*]/,IDENT_CHAR=/U\+/,ARROW_KEY=/^arrow/,SPACE_KEY=/^space(bar)?/,ESC_KEY=/^escape$/;function transformKey(key,noSpecialChars){var validKey="";if(key){var lKey=key.toLowerCase();if(" "===lKey||SPACE_KEY.test(lKey)){validKey="space"}else if(ESC_KEY.test(lKey)){validKey="esc"}else if(1==lKey.length){if(!noSpecialChars||KEY_CHAR.test(lKey)){validKey=lKey}}else if(ARROW_KEY.test(lKey)){validKey=lKey.replace("arrow","")}else if("multiply"==lKey){validKey="*"}else{validKey=lKey}}return validKey}function transformKeyIdentifier(keyIdent){var validKey="";if(keyIdent){if(keyIdent in KEY_IDENTIFIER){validKey=KEY_IDENTIFIER[keyIdent]}else if(IDENT_CHAR.test(keyIdent)){keyIdent=parseInt(keyIdent.replace("U+","0x"),16);validKey=String.fromCharCode(keyIdent).toLowerCase()}else{validKey=keyIdent.toLowerCase()}}return validKey}function transformKeyCode(keyCode){var validKey="";if(+keyCode){if(65<=keyCode&&90>=keyCode){validKey=String.fromCharCode(32+keyCode)}else if(112<=keyCode&&123>=keyCode){validKey="f"+(keyCode-112+1)}else if(48<=keyCode&&57>=keyCode){validKey=keyCode-48+""}else if(96<=keyCode&&105>=keyCode){validKey=keyCode-96+""}else{validKey=KEY_CODE[keyCode]}}return validKey}function normalizedKeyForEvent(keyEvent,noSpecialChars){if(keyEvent.key){return transformKey(keyEvent.key,noSpecialChars)}if(keyEvent.detail&&keyEvent.detail.key){return transformKey(keyEvent.detail.key,noSpecialChars)}return transformKeyIdentifier(keyEvent.keyIdentifier)||transformKeyCode(keyEvent.keyCode)||""}function keyComboMatchesEvent(keyCombo,event){var keyEvent=normalizedKeyForEvent(event,keyCombo.hasModifiers);return keyEvent===keyCombo.key&&(!keyCombo.hasModifiers||!!event.shiftKey===!!keyCombo.shiftKey&&!!event.ctrlKey===!!keyCombo.ctrlKey&&!!event.altKey===!!keyCombo.altKey&&!!event.metaKey===!!keyCombo.metaKey)}function parseKeyComboString(keyComboString){if(1===keyComboString.length){return{combo:keyComboString,key:keyComboString,event:"keydown"}}return keyComboString.split("+").reduce(function(parsedKeyCombo,keyComboPart){var eventParts=keyComboPart.split(":"),keyName=eventParts[0],event=eventParts[1];if(keyName in MODIFIER_KEYS){parsedKeyCombo[MODIFIER_KEYS[keyName]]=!0;parsedKeyCombo.hasModifiers=!0}else{parsedKeyCombo.key=keyName;parsedKeyCombo.event=event||"keydown"}return parsedKeyCombo},{combo:keyComboString.split(":").shift()})}function parseEventString(eventString){return eventString.trim().split(" ").map(function(keyComboString){return parseKeyComboString(keyComboString)})}export const IronA11yKeysBehavior={properties:{keyEventTarget:{type:Object,value:function(){return this}},stopKeyboardEventPropagation:{type:Boolean,value:!1},_boundKeyHandlers:{type:Array,value:function(){return[]}},_imperativeKeyBindings:{type:Object,value:function(){return{}}}},observers:["_resetKeyEventListeners(keyEventTarget, _boundKeyHandlers)"],keyBindings:{},registered:function(){this._prepKeyBindings()},attached:function(){this._listenKeyEventListeners()},detached:function(){this._unlistenKeyEventListeners()},addOwnKeyBinding:function(eventString,handlerName){this._imperativeKeyBindings[eventString]=handlerName;this._prepKeyBindings();this._resetKeyEventListeners()},removeOwnKeyBindings:function(){this._imperativeKeyBindings={};this._prepKeyBindings();this._resetKeyEventListeners()},keyboardEventMatchesKeys:function(event,eventString){for(var keyCombos=parseEventString(eventString),i=0;i<keyCombos.length;++i){if(keyComboMatchesEvent(keyCombos[i],event)){return!0}}return!1},_collectKeyBindings:function(){var keyBindings=this.behaviors.map(function(behavior){return behavior.keyBindings});if(-1===keyBindings.indexOf(this.keyBindings)){keyBindings.push(this.keyBindings)}return keyBindings},_prepKeyBindings:function(){this._keyBindings={};this._collectKeyBindings().forEach(function(keyBindings){for(var eventString in keyBindings){this._addKeyBinding(eventString,keyBindings[eventString])}},this);for(var eventString in this._imperativeKeyBindings){this._addKeyBinding(eventString,this._imperativeKeyBindings[eventString])}for(var eventName in this._keyBindings){this._keyBindings[eventName].sort(function(kb1,kb2){var b1=kb1[0].hasModifiers,b2=kb2[0].hasModifiers;return b1===b2?0:b1?-1:1})}},_addKeyBinding:function(eventString,handlerName){parseEventString(eventString).forEach(function(keyCombo){this._keyBindings[keyCombo.event]=this._keyBindings[keyCombo.event]||[];this._keyBindings[keyCombo.event].push([keyCombo,handlerName])},this)},_resetKeyEventListeners:function(){this._unlistenKeyEventListeners();if(this.isAttached){this._listenKeyEventListeners()}},_listenKeyEventListeners:function(){if(!this.keyEventTarget){return}Object.keys(this._keyBindings).forEach(function(eventName){var keyBindings=this._keyBindings[eventName],boundKeyHandler=this._onKeyBindingEvent.bind(this,keyBindings);this._boundKeyHandlers.push([this.keyEventTarget,eventName,boundKeyHandler]);this.keyEventTarget.addEventListener(eventName,boundKeyHandler)},this)},_unlistenKeyEventListeners:function(){var keyHandlerTuple,keyEventTarget,eventName,boundKeyHandler;while(this._boundKeyHandlers.length){keyHandlerTuple=this._boundKeyHandlers.pop();keyEventTarget=keyHandlerTuple[0];eventName=keyHandlerTuple[1];boundKeyHandler=keyHandlerTuple[2];keyEventTarget.removeEventListener(eventName,boundKeyHandler)}},_onKeyBindingEvent:function(keyBindings,event){if(this.stopKeyboardEventPropagation){event.stopPropagation()}if(event.defaultPrevented){return}for(var i=0;i<keyBindings.length;i++){var keyCombo=keyBindings[i][0],handlerName=keyBindings[i][1];if(keyComboMatchesEvent(keyCombo,event)){this._triggerKeyHandler(keyCombo,handlerName,event);if(event.defaultPrevented){return}}}},_triggerKeyHandler:function(keyCombo,handlerName,keyboardEvent){var detail=Object.create(keyCombo);detail.keyboardEvent=keyboardEvent;var event=new CustomEvent(keyCombo.event,{detail:detail,cancelable:!0});this[handlerName].call(this,event);if(event.defaultPrevented){keyboardEvent.preventDefault()}}};