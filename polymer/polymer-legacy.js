import "../../mjo-components/shadycss/entrypoints/apply-shim.js";
import "../../mjo-components/shadycss/entrypoints/custom-style-interface.js";
import "./polymer-element.js";
import {
    dedupingMixin,
    PropertyEffects,
    PolymerElement,
    ElementMixin,
    PropertyAccessors,
    microTask,
    passiveTouchGestures,
} from "./polymer-element.js";
export class Debouncer {
    constructor() {
        this._asyncModule = null;
        this._callback = null;
        this._timer = null;
    }
    setConfig(asyncModule, callback) {
        this._asyncModule = asyncModule;
        this._callback = callback;
        this._timer = this._asyncModule.run(() => {
            this._timer = null;
            this._callback();
        });
    }
    cancel() {
        if (this.isActive()) {
            this._asyncModule.cancel(this._timer);
            this._timer = null;
        }
    }
    flush() {
        if (this.isActive()) {
            this.cancel();
            this._callback();
        }
    }
    isActive() {
        return null != this._timer;
    }
    static debounce(debouncer, asyncModule, callback) {
        if (debouncer instanceof Debouncer) {
            debouncer.cancel();
        } else {
            debouncer = new Debouncer();
        }
        debouncer.setConfig(asyncModule, callback);
        return debouncer;
    }
}
let HAS_NATIVE_TA = "string" === typeof document.head.style.touchAction,
    GESTURE_KEY = "__polymerGestures",
    HANDLED_OBJ = "__polymerGesturesHandled",
    TOUCH_ACTION = "__polymerGesturesTouchAction",
    TAP_DISTANCE = 25,
    TRACK_DISTANCE = 5,
    TRACK_LENGTH = 2,
    MOUSE_TIMEOUT = 2500,
    MOUSE_EVENTS = ["mousedown", "mousemove", "mouseup", "click"],
    MOUSE_WHICH_TO_BUTTONS = [0, 1, 4, 2],
    MOUSE_HAS_BUTTONS = (function () {
        try {
            return 1 === new MouseEvent("test", { buttons: 1 }).buttons;
        } catch (e) {
            return !1;
        }
    })();
function isMouseEvent(name) {
    return -1 < MOUSE_EVENTS.indexOf(name);
}
let SUPPORTS_PASSIVE = !1;
(function () {
    try {
        let opts = Object.defineProperty({}, "passive", {
            get() {
                SUPPORTS_PASSIVE = !0;
            },
        });
        window.addEventListener("test", null, opts);
        window.removeEventListener("test", null, opts);
    } catch (e) {}
})();
function PASSIVE_TOUCH(eventName) {
    if (isMouseEvent(eventName) || "touchend" === eventName) {
        return;
    }
    if (HAS_NATIVE_TA && SUPPORTS_PASSIVE && passiveTouchGestures) {
        return { passive: !0 };
    } else {
        return;
    }
}
let IS_TOUCH_ONLY = navigator.userAgent.match(/iP(?:[oa]d|hone)|Android/);
const clickedLabels = [],
    labellable = { button: !0, input: !0, keygen: !0, meter: !0, output: !0, textarea: !0, progress: !0, select: !0 },
    canBeDisabled = { button: !0, command: !0, fieldset: !0, input: !0, keygen: !0, optgroup: !0, option: !0, select: !0, textarea: !0 };
function canBeLabelled(el) {
    return labellable[el.localName] || !1;
}
function matchingLabels(el) {
    let labels = Array.prototype.slice.call(el.labels || []);
    if (!labels.length) {
        labels = [];
        let root = el.getRootNode();
        if (el.id) {
            let matching = root.querySelectorAll(`label[for = ${el.id}]`);
            for (let i = 0; i < matching.length; i++) {
                labels.push(matching[i]);
            }
        }
    }
    return labels;
}
let mouseCanceller = function (mouseEvent) {
    let sc = mouseEvent.sourceCapabilities;
    if (sc && !sc.firesTouchEvents) {
        return;
    }
    mouseEvent[HANDLED_OBJ] = { skip: !0 };
    if ("click" === mouseEvent.type) {
        let clickFromLabel = !1,
            path = mouseEvent.composedPath && mouseEvent.composedPath();
        if (path) {
            for (let i = 0; i < path.length; i++) {
                if (path[i].nodeType === Node.ELEMENT_NODE) {
                    if ("label" === path[i].localName) {
                        clickedLabels.push(path[i]);
                    } else if (canBeLabelled(path[i])) {
                        let ownerLabels = matchingLabels(path[i]);
                        for (let j = 0; j < ownerLabels.length; j++) {
                            clickFromLabel = clickFromLabel || -1 < clickedLabels.indexOf(ownerLabels[j]);
                        }
                    }
                }
                if (path[i] === POINTERSTATE.mouse.target) {
                    return;
                }
            }
        }
        if (clickFromLabel) {
            return;
        }
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();
    }
};
function setupTeardownMouseCanceller(setup) {
    let events = IS_TOUCH_ONLY ? ["click"] : MOUSE_EVENTS;
    for (let i = 0, en; i < events.length; i++) {
        en = events[i];
        if (setup) {
            clickedLabels.length = 0;
            document.addEventListener(en, mouseCanceller, !0);
        } else {
            document.removeEventListener(en, mouseCanceller, !0);
        }
    }
}
function ignoreMouse(e) {
    if (!POINTERSTATE.mouse.mouseIgnoreJob) {
        setupTeardownMouseCanceller(!0);
    }
    let unset = function () {
        setupTeardownMouseCanceller();
        POINTERSTATE.mouse.target = null;
        POINTERSTATE.mouse.mouseIgnoreJob = null;
    };
    POINTERSTATE.mouse.target = e.composedPath()[0];
    POINTERSTATE.mouse.mouseIgnoreJob = Debouncer.debounce(POINTERSTATE.mouse.mouseIgnoreJob, timeOut.after(MOUSE_TIMEOUT), unset);
}
function hasLeftMouseButton(ev) {
    let type = ev.type;
    if (!isMouseEvent(type)) {
        return !1;
    }
    if ("mousemove" === type) {
        let buttons = ev.buttons === void 0 ? 1 : ev.buttons;
        if (ev instanceof window.MouseEvent && !MOUSE_HAS_BUTTONS) {
            buttons = MOUSE_WHICH_TO_BUTTONS[ev.which] || 0;
        }
        return !!(1 & buttons);
    } else {
        let button = ev.button === void 0 ? 0 : ev.button;
        return 0 === button;
    }
}
function isSyntheticClick(ev) {
    if ("click" === ev.type) {
        if (0 === ev.detail) {
            return !0;
        }
        let t = _findOriginalTarget(ev);
        if (!t.nodeType || t.nodeType !== Node.ELEMENT_NODE) {
            return !0;
        }
        let bcr = t.getBoundingClientRect(),
            x = ev.pageX,
            y = ev.pageY;
        return !(x >= bcr.left && x <= bcr.right && y >= bcr.top && y <= bcr.bottom);
    }
    return !1;
}
let POINTERSTATE = { mouse: { target: null, mouseIgnoreJob: null }, touch: { x: 0, y: 0, id: -1, scrollDecided: !1 } };
function firstTouchAction(ev) {
    let ta = "auto",
        path = ev.composedPath && ev.composedPath();
    if (path) {
        for (let i = 0, n; i < path.length; i++) {
            n = path[i];
            if (n[TOUCH_ACTION]) {
                ta = n[TOUCH_ACTION];
                break;
            }
        }
    }
    return ta;
}
function trackDocument(stateObj, movefn, upfn) {
    stateObj.movefn = movefn;
    stateObj.upfn = upfn;
    document.addEventListener("mousemove", movefn);
    document.addEventListener("mouseup", upfn);
}
function untrackDocument(stateObj) {
    document.removeEventListener("mousemove", stateObj.movefn);
    document.removeEventListener("mouseup", stateObj.upfn);
    stateObj.movefn = null;
    stateObj.upfn = null;
}
document.addEventListener("touchend", ignoreMouse, SUPPORTS_PASSIVE ? { passive: !0 } : !1);
export const gestures = {};
export const recognizers = [];
export function deepTargetFind(x, y) {
    let node = document.elementFromPoint(x, y),
        next = node;
    while (next && next.shadowRoot && !window.ShadyDOM) {
        let oldNext = next;
        next = next.shadowRoot.elementFromPoint(x, y);
        if (oldNext === next) {
            break;
        }
        if (next) {
            node = next;
        }
    }
    return node;
}
function _findOriginalTarget(ev) {
    if (ev.composedPath) {
        const targets = ev.composedPath();
        return 0 < targets.length ? targets[0] : ev.target;
    }
    return ev.target;
}
function _handleNative(ev) {
    let handled,
        type = ev.type,
        node = ev.currentTarget,
        gobj = node[GESTURE_KEY];
    if (!gobj) {
        return;
    }
    let gs = gobj[type];
    if (!gs) {
        return;
    }
    if (!ev[HANDLED_OBJ]) {
        ev[HANDLED_OBJ] = {};
        if ("touch" === type.slice(0, 5)) {
            ev = ev;
            let t = ev.changedTouches[0];
            if ("touchstart" === type) {
                if (1 === ev.touches.length) {
                    POINTERSTATE.touch.id = t.identifier;
                }
            }
            if (POINTERSTATE.touch.id !== t.identifier) {
                return;
            }
            if (!HAS_NATIVE_TA) {
                if ("touchstart" === type || "touchmove" === type) {
                    _handleTouchAction(ev);
                }
            }
        }
    }
    handled = ev[HANDLED_OBJ];
    if (handled.skip) {
        return;
    }
    for (let i = 0, r; i < recognizers.length; i++) {
        r = recognizers[i];
        if (gs[r.name] && !handled[r.name]) {
            if (r.flow && -1 < r.flow.start.indexOf(ev.type) && r.reset) {
                r.reset();
            }
        }
    }
    for (let i = 0, r; i < recognizers.length; i++) {
        r = recognizers[i];
        if (gs[r.name] && !handled[r.name]) {
            handled[r.name] = !0;
            r[type](ev);
        }
    }
}
function _handleTouchAction(ev) {
    var _Mathabs = Math.abs;
    let t = ev.changedTouches[0],
        type = ev.type;
    if ("touchstart" === type) {
        POINTERSTATE.touch.x = t.clientX;
        POINTERSTATE.touch.y = t.clientY;
        POINTERSTATE.touch.scrollDecided = !1;
    } else if ("touchmove" === type) {
        if (POINTERSTATE.touch.scrollDecided) {
            return;
        }
        POINTERSTATE.touch.scrollDecided = !0;
        let ta = firstTouchAction(ev),
            shouldPrevent = !1,
            dx = _Mathabs(POINTERSTATE.touch.x - t.clientX),
            dy = _Mathabs(POINTERSTATE.touch.y - t.clientY);
        if (!ev.cancelable) {
        } else if ("none" === ta) {
            shouldPrevent = !0;
        } else if ("pan-x" === ta) {
            shouldPrevent = dy > dx;
        } else if ("pan-y" === ta) {
            shouldPrevent = dx > dy;
        }
        if (shouldPrevent) {
            ev.preventDefault();
        } else {
            prevent("track");
        }
    }
}
export function addListener(node, evType, handler) {
    if (gestures[evType]) {
        _add(node, evType, handler);
        return !0;
    }
    return !1;
}
export function removeListener(node, evType, handler) {
    if (gestures[evType]) {
        _remove(node, evType, handler);
        return !0;
    }
    return !1;
}
function _add(node, evType, handler) {
    let recognizer = gestures[evType],
        deps = recognizer.deps,
        name = recognizer.name,
        gobj = node[GESTURE_KEY];
    if (!gobj) {
        node[GESTURE_KEY] = gobj = {};
    }
    for (let i = 0, dep, gd; i < deps.length; i++) {
        dep = deps[i];
        if (IS_TOUCH_ONLY && isMouseEvent(dep) && "click" !== dep) {
            continue;
        }
        gd = gobj[dep];
        if (!gd) {
            gobj[dep] = gd = { _count: 0 };
        }
        if (0 === gd._count) {
            node.addEventListener(dep, _handleNative, PASSIVE_TOUCH(dep));
        }
        gd[name] = (gd[name] || 0) + 1;
        gd._count = (gd._count || 0) + 1;
    }
    node.addEventListener(evType, handler);
    if (recognizer.touchAction) {
        setTouchAction(node, recognizer.touchAction);
    }
}
function _remove(node, evType, handler) {
    let recognizer = gestures[evType],
        deps = recognizer.deps,
        name = recognizer.name,
        gobj = node[GESTURE_KEY];
    if (gobj) {
        for (let i = 0, dep, gd; i < deps.length; i++) {
            dep = deps[i];
            gd = gobj[dep];
            if (gd && gd[name]) {
                gd[name] = (gd[name] || 1) - 1;
                gd._count = (gd._count || 1) - 1;
                if (0 === gd._count) {
                    node.removeEventListener(dep, _handleNative, PASSIVE_TOUCH(dep));
                }
            }
        }
    }
    node.removeEventListener(evType, handler);
}
export function register(recog) {
    recognizers.push(recog);
    for (let i = 0; i < recog.emits.length; i++) {
        gestures[recog.emits[i]] = recog;
    }
}
function _findRecognizerByEvent(evName) {
    for (let i = 0, r; i < recognizers.length; i++) {
        r = recognizers[i];
        for (let j = 0, n; j < r.emits.length; j++) {
            n = r.emits[j];
            if (n === evName) {
                return r;
            }
        }
    }
    return null;
}
export function setTouchAction(node, value) {
    if (HAS_NATIVE_TA && node instanceof HTMLElement) {
        microTask.run(() => {
            node.style.touchAction = value;
        });
    }
    node[TOUCH_ACTION] = value;
}
function _fire(target, type, detail) {
    let ev = new Event(type, { bubbles: !0, cancelable: !0, composed: !0 });
    ev.detail = detail;
    target.dispatchEvent(ev);
    if (ev.defaultPrevented) {
        let preventer = detail.preventer || detail.sourceEvent;
        if (preventer && preventer.preventDefault) {
            preventer.preventDefault();
        }
    }
}
export function prevent(evName) {
    let recognizer = _findRecognizerByEvent(evName);
    if (recognizer.info) {
        recognizer.info.prevent = !0;
    }
}
export function resetMouseCanceller() {
    if (POINTERSTATE.mouse.mouseIgnoreJob) {
        POINTERSTATE.mouse.mouseIgnoreJob.flush();
    }
}
register({
    name: "downup",
    deps: ["mousedown", "touchstart", "touchend"],
    flow: { start: ["mousedown", "touchstart"], end: ["mouseup", "touchend"] },
    emits: ["down", "up"],
    info: { movefn: null, upfn: null },
    reset: function () {
        untrackDocument(this.info);
    },
    mousedown: function (e) {
        if (!hasLeftMouseButton(e)) {
            return;
        }
        let t = _findOriginalTarget(e),
            self = this,
            movefn = function movefn(e) {
                if (!hasLeftMouseButton(e)) {
                    downupFire("up", t, e);
                    untrackDocument(self.info);
                }
            },
            upfn = function upfn(e) {
                if (hasLeftMouseButton(e)) {
                    downupFire("up", t, e);
                }
                untrackDocument(self.info);
            };
        trackDocument(this.info, movefn, upfn);
        downupFire("down", t, e);
    },
    touchstart: function (e) {
        downupFire("down", _findOriginalTarget(e), e.changedTouches[0], e);
    },
    touchend: function (e) {
        downupFire("up", _findOriginalTarget(e), e.changedTouches[0], e);
    },
});
function downupFire(type, target, event, preventer) {
    if (!target) {
        return;
    }
    _fire(target, type, {
        x: event.clientX,
        y: event.clientY,
        sourceEvent: event,
        preventer: preventer,
        prevent: function (e) {
            return prevent(e);
        },
    });
}
register({
    name: "track",
    touchAction: "none",
    deps: ["mousedown", "touchstart", "touchmove", "touchend"],
    flow: { start: ["mousedown", "touchstart"], end: ["mouseup", "touchend"] },
    emits: ["track"],
    info: {
        x: 0,
        y: 0,
        state: "start",
        started: !1,
        moves: [],
        addMove: function (move) {
            if (this.moves.length > TRACK_LENGTH) {
                this.moves.shift();
            }
            this.moves.push(move);
        },
        movefn: null,
        upfn: null,
        prevent: !1,
    },
    reset: function () {
        this.info.state = "start";
        this.info.started = !1;
        this.info.moves = [];
        this.info.x = 0;
        this.info.y = 0;
        this.info.prevent = !1;
        untrackDocument(this.info);
    },
    mousedown: function (e) {
        if (!hasLeftMouseButton(e)) {
            return;
        }
        let t = _findOriginalTarget(e),
            self = this,
            movefn = function movefn(e) {
                let x = e.clientX,
                    y = e.clientY;
                if (trackHasMovedEnough(self.info, x, y)) {
                    self.info.state = self.info.started ? ("mouseup" === e.type ? "end" : "track") : "start";
                    if ("start" === self.info.state) {
                        prevent("tap");
                    }
                    self.info.addMove({ x: x, y: y });
                    if (!hasLeftMouseButton(e)) {
                        self.info.state = "end";
                        untrackDocument(self.info);
                    }
                    if (t) {
                        trackFire(self.info, t, e);
                    }
                    self.info.started = !0;
                }
            },
            upfn = function upfn(e) {
                if (self.info.started) {
                    movefn(e);
                }
                untrackDocument(self.info);
            };
        trackDocument(this.info, movefn, upfn);
        this.info.x = e.clientX;
        this.info.y = e.clientY;
    },
    touchstart: function (e) {
        let ct = e.changedTouches[0];
        this.info.x = ct.clientX;
        this.info.y = ct.clientY;
    },
    touchmove: function (e) {
        let t = _findOriginalTarget(e),
            ct = e.changedTouches[0],
            x = ct.clientX,
            y = ct.clientY;
        if (trackHasMovedEnough(this.info, x, y)) {
            if ("start" === this.info.state) {
                prevent("tap");
            }
            this.info.addMove({ x: x, y: y });
            trackFire(this.info, t, ct);
            this.info.state = "track";
            this.info.started = !0;
        }
    },
    touchend: function (e) {
        let t = _findOriginalTarget(e),
            ct = e.changedTouches[0];
        if (this.info.started) {
            this.info.state = "end";
            this.info.addMove({ x: ct.clientX, y: ct.clientY });
            trackFire(this.info, t, ct);
        }
    },
});
function trackHasMovedEnough(info, x, y) {
    var _Mathabs2 = Math.abs;
    if (info.prevent) {
        return !1;
    }
    if (info.started) {
        return !0;
    }
    let dx = _Mathabs2(info.x - x),
        dy = _Mathabs2(info.y - y);
    return dx >= TRACK_DISTANCE || dy >= TRACK_DISTANCE;
}
function trackFire(info, target, touch) {
    if (!target) {
        return;
    }
    let secondlast = info.moves[info.moves.length - 2],
        lastmove = info.moves[info.moves.length - 1],
        dx = lastmove.x - info.x,
        dy = lastmove.y - info.y,
        ddx,
        ddy = 0;
    if (secondlast) {
        ddx = lastmove.x - secondlast.x;
        ddy = lastmove.y - secondlast.y;
    }
    _fire(target, "track", {
        state: info.state,
        x: touch.clientX,
        y: touch.clientY,
        dx: dx,
        dy: dy,
        ddx: ddx,
        ddy: ddy,
        sourceEvent: touch,
        hover: function () {
            return deepTargetFind(touch.clientX, touch.clientY);
        },
    });
}
register({
    name: "tap",
    deps: ["mousedown", "click", "touchstart", "touchend"],
    flow: { start: ["mousedown", "touchstart"], end: ["click", "touchend"] },
    emits: ["tap"],
    info: { x: NaN, y: NaN, prevent: !1 },
    reset: function () {
        this.info.x = NaN;
        this.info.y = NaN;
        this.info.prevent = !1;
    },
    mousedown: function (e) {
        if (hasLeftMouseButton(e)) {
            this.info.x = e.clientX;
            this.info.y = e.clientY;
        }
    },
    click: function (e) {
        if (hasLeftMouseButton(e)) {
            trackForward(this.info, e);
        }
    },
    touchstart: function (e) {
        const touch = e.changedTouches[0];
        this.info.x = touch.clientX;
        this.info.y = touch.clientY;
    },
    touchend: function (e) {
        trackForward(this.info, e.changedTouches[0], e);
    },
});
function trackForward(info, e, preventer) {
    var _Mathabs3 = Math.abs;
    let dx = _Mathabs3(e.clientX - info.x),
        dy = _Mathabs3(e.clientY - info.y),
        t = _findOriginalTarget(preventer || e);
    if (!t || (canBeDisabled[t.localName] && t.hasAttribute("disabled"))) {
        return;
    }
    if (isNaN(dx) || isNaN(dy) || (dx <= TAP_DISTANCE && dy <= TAP_DISTANCE) || isSyntheticClick(e)) {
        if (!info.prevent) {
            _fire(t, "tap", { x: e.clientX, y: e.clientY, sourceEvent: e, preventer: preventer });
        }
    }
}
export const findOriginalTarget = _findOriginalTarget;
export const add = addListener;
export const remove = removeListener;
export const GestureEventListeners = dedupingMixin((superClass) => {
    class GestureEventListeners extends superClass {
        _addEventListenerToNode(node, eventName, handler) {
            if (!addListener(node, eventName, handler)) {
                super._addEventListenerToNode(node, eventName, handler);
            }
        }
        _removeEventListenerFromNode(node, eventName, handler) {
            if (!removeListener(node, eventName, handler)) {
                super._removeEventListenerFromNode(node, eventName, handler);
            }
        }
    }
    return GestureEventListeners;
});
const HOST_DIR = /:host\(:dir\((ltr|rtl)\)\)/g,
    HOST_DIR_REPLACMENT = ':host([dir="$1"])',
    EL_DIR = /([\s\w-#\.\[\]\*]*):dir\((ltr|rtl)\)/g,
    EL_DIR_REPLACMENT = ':host([dir="$2"]) $1',
    DIR_INSTANCES = [];
let observer = null,
    DOCUMENT_DIR = "";
function getRTL() {
    DOCUMENT_DIR = document.documentElement.getAttribute("dir");
}
function setRTL(instance) {
    if (!instance.__autoDirOptOut) {
        const el = instance;
        el.setAttribute("dir", DOCUMENT_DIR);
    }
}
function updateDirection() {
    getRTL();
    DOCUMENT_DIR = document.documentElement.getAttribute("dir");
    for (let i = 0; i < DIR_INSTANCES.length; i++) {
        setRTL(DIR_INSTANCES[i]);
    }
}
function takeRecords() {
    if (observer && observer.takeRecords().length) {
        updateDirection();
    }
}
export const DirMixin = dedupingMixin((base) => {
    if (!observer) {
        getRTL();
        observer = new MutationObserver(updateDirection);
        observer.observe(document.documentElement, { attributes: !0, attributeFilter: ["dir"] });
    }
    const elementBase = PropertyAccessors(base);
    class Dir extends elementBase {
        static _processStyleText(cssText, baseURI) {
            cssText = super._processStyleText(cssText, baseURI);
            cssText = this._replaceDirInCssText(cssText);
            return cssText;
        }
        static _replaceDirInCssText(text) {
            let replacedText = text;
            replacedText = replacedText.replace(HOST_DIR, HOST_DIR_REPLACMENT);
            replacedText = replacedText.replace(EL_DIR, EL_DIR_REPLACMENT);
            if (text !== replacedText) {
                this.__activateDir = !0;
            }
            return replacedText;
        }
        constructor() {
            super();
            this.__autoDirOptOut = !1;
        }
        ready() {
            super.ready();
            this.__autoDirOptOut = this.hasAttribute("dir");
        }
        connectedCallback() {
            if (elementBase.prototype.connectedCallback) {
                super.connectedCallback();
            }
            if (this.constructor.__activateDir) {
                takeRecords();
                DIR_INSTANCES.push(this);
                setRTL(this);
            }
        }
        disconnectedCallback() {
            if (elementBase.prototype.disconnectedCallback) {
                super.disconnectedCallback();
            }
            if (this.constructor.__activateDir) {
                const idx = DIR_INSTANCES.indexOf(this);
                if (-1 < idx) {
                    DIR_INSTANCES.splice(idx, 1);
                }
            }
        }
    }
    Dir.__activateDir = !1;
    return Dir;
});
let scheduled = !1,
    beforeRenderQueue = [],
    afterRenderQueue = [];
function schedule() {
    scheduled = !0;
    requestAnimationFrame(function () {
        scheduled = !1;
        flushQueue(beforeRenderQueue);
        setTimeout(function () {
            runQueue(afterRenderQueue);
        });
    });
}
function flushQueue(queue) {
    while (queue.length) {
        callMethod(queue.shift());
    }
}
function runQueue(queue) {
    for (let i = 0, l = queue.length; i < l; i++) {
        callMethod(queue.shift());
    }
}
function callMethod(info) {
    const context = info[0],
        callback = info[1],
        args = info[2];
    try {
        callback.apply(context, args);
    } catch (e) {
        setTimeout(() => {
            throw e;
        });
    }
}
export function flush_aw() {
    while (beforeRenderQueue.length || afterRenderQueue.length) {
        flushQueue(beforeRenderQueue);
        flushQueue(afterRenderQueue);
    }
    scheduled = !1;
}
export function beforeNextRender(context, callback, args) {
    if (!scheduled) {
        schedule();
    }
    beforeRenderQueue.push([context, callback, args]);
}
export function afterNextRender(context, callback, args) {
    if (!scheduled) {
        schedule();
    }
    afterRenderQueue.push([context, callback, args]);
}
function resolve() {
    document.body.removeAttribute("unresolved");
}
if ("interactive" === document.readyState || "complete" === document.readyState) {
    resolve();
} else {
    window.addEventListener("DOMContentLoaded", resolve);
}
function newSplice(index, removed, addedCount) {
    return { index: index, removed: removed, addedCount: addedCount };
}
const EDIT_LEAVE = 0,
    EDIT_UPDATE = 1,
    EDIT_ADD = 2,
    EDIT_DELETE = 3;
function calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd) {
    let rowCount = oldEnd - oldStart + 1,
        columnCount = currentEnd - currentStart + 1,
        distances = Array(rowCount);
    for (let i = 0; i < rowCount; i++) {
        distances[i] = Array(columnCount);
        distances[i][0] = i;
    }
    for (let j = 0; j < columnCount; j++) distances[0][j] = j;
    for (let i = 1; i < rowCount; i++) {
        for (let j = 1; j < columnCount; j++) {
            if (equals(current[currentStart + j - 1], old[oldStart + i - 1])) distances[i][j] = distances[i - 1][j - 1];
            else {
                let north = distances[i - 1][j] + 1,
                    west = distances[i][j - 1] + 1;
                distances[i][j] = north < west ? north : west;
            }
        }
    }
    return distances;
}
function spliceOperationsFromEditDistances(distances) {
    let i = distances.length - 1,
        j = distances[0].length - 1,
        current = distances[i][j],
        edits = [];
    while (0 < i || 0 < j) {
        if (0 == i) {
            edits.push(EDIT_ADD);
            j--;
            continue;
        }
        if (0 == j) {
            edits.push(EDIT_DELETE);
            i--;
            continue;
        }
        let northWest = distances[i - 1][j - 1],
            west = distances[i - 1][j],
            north = distances[i][j - 1],
            min;
        if (west < north) min = west < northWest ? west : northWest;
        else min = north < northWest ? north : northWest;
        if (min == northWest) {
            if (northWest == current) {
                edits.push(EDIT_LEAVE);
            } else {
                edits.push(EDIT_UPDATE);
                current = northWest;
            }
            i--;
            j--;
        } else if (min == west) {
            edits.push(EDIT_DELETE);
            i--;
            current = west;
        } else {
            edits.push(EDIT_ADD);
            j--;
            current = north;
        }
    }
    edits.reverse();
    return edits;
}
function calcSplices(current, currentStart, currentEnd, old, oldStart, oldEnd) {
    let prefixCount = 0,
        suffixCount = 0,
        splice,
        minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
    if (0 == currentStart && 0 == oldStart) prefixCount = sharedPrefix(current, old, minLength);
    if (currentEnd == current.length && oldEnd == old.length) suffixCount = sharedSuffix(current, old, minLength - prefixCount);
    currentStart += prefixCount;
    oldStart += prefixCount;
    currentEnd -= suffixCount;
    oldEnd -= suffixCount;
    if (0 == currentEnd - currentStart && 0 == oldEnd - oldStart) return [];
    if (currentStart == currentEnd) {
        splice = newSplice(currentStart, [], 0);
        while (oldStart < oldEnd) splice.removed.push(old[oldStart++]);
        return [splice];
    } else if (oldStart == oldEnd) return [newSplice(currentStart, [], currentEnd - currentStart)];
    let ops = spliceOperationsFromEditDistances(calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));
    splice = void 0;
    let splices = [],
        index = currentStart,
        oldIndex = oldStart;
    for (let i = 0; i < ops.length; i++) {
        switch (ops[i]) {
            case EDIT_LEAVE:
                if (splice) {
                    splices.push(splice);
                    splice = void 0;
                }
                index++;
                oldIndex++;
                break;
            case EDIT_UPDATE:
                if (!splice) splice = newSplice(index, [], 0);
                splice.addedCount++;
                index++;
                splice.removed.push(old[oldIndex]);
                oldIndex++;
                break;
            case EDIT_ADD:
                if (!splice) splice = newSplice(index, [], 0);
                splice.addedCount++;
                index++;
                break;
            case EDIT_DELETE:
                if (!splice) splice = newSplice(index, [], 0);
                splice.removed.push(old[oldIndex]);
                oldIndex++;
                break;
        }
    }
    if (splice) {
        splices.push(splice);
    }
    return splices;
}
function sharedPrefix(current, old, searchLength) {
    for (let i = 0; i < searchLength; i++) if (!equals(current[i], old[i])) return i;
    return searchLength;
}
function sharedSuffix(current, old, searchLength) {
    let index1 = current.length,
        index2 = old.length,
        count = 0;
    while (count < searchLength && equals(current[--index1], old[--index2])) count++;
    return count;
}
export function calculateSplices(current, previous) {
    return calcSplices(current, 0, current.length, previous, 0, previous.length);
}
function equals(currentValue, previousValue) {
    return currentValue === previousValue;
}
function isSlot(node) {
    return "slot" === node.localName;
}
export class FlattenedNodesObserver {
    static getFlattenedNodes(node) {
        if (isSlot(node)) {
            node = node;
            return node.assignedNodes({ flatten: !0 });
        } else {
            return Array.from(node.childNodes)
                .map((node) => {
                    if (isSlot(node)) {
                        node = node;
                        return node.assignedNodes({ flatten: !0 });
                    } else {
                        return [node];
                    }
                })
                .reduce((a, b) => a.concat(b), []);
        }
    }
    constructor(target, callback) {
        this._shadyChildrenObserver = null;
        this._nativeChildrenObserver = null;
        this._connected = !1;
        this._target = target;
        this.callback = callback;
        this._effectiveNodes = [];
        this._observer = null;
        this._scheduled = !1;
        this._boundSchedule = () => {
            this._schedule();
        };
        this.connect();
        this._schedule();
    }
    connect() {
        if (isSlot(this._target)) {
            this._listenSlots([this._target]);
        } else if (this._target.children) {
            this._listenSlots(this._target.children);
            if (window.ShadyDOM) {
                this._shadyChildrenObserver = ShadyDOM.observeChildren(this._target, (mutations) => {
                    this._processMutations(mutations);
                });
            } else {
                this._nativeChildrenObserver = new MutationObserver((mutations) => {
                    this._processMutations(mutations);
                });
                this._nativeChildrenObserver.observe(this._target, { childList: !0 });
            }
        }
        this._connected = !0;
    }
    disconnect() {
        if (isSlot(this._target)) {
            this._unlistenSlots([this._target]);
        } else if (this._target.children) {
            this._unlistenSlots(this._target.children);
            if (window.ShadyDOM && this._shadyChildrenObserver) {
                ShadyDOM.unobserveChildren(this._shadyChildrenObserver);
                this._shadyChildrenObserver = null;
            } else if (this._nativeChildrenObserver) {
                this._nativeChildrenObserver.disconnect();
                this._nativeChildrenObserver = null;
            }
        }
        this._connected = !1;
    }
    _schedule() {
        if (!this._scheduled) {
            this._scheduled = !0;
            microTask.run(() => this.flush());
        }
    }
    _processMutations(mutations) {
        this._processSlotMutations(mutations);
        this.flush();
    }
    _processSlotMutations(mutations) {
        if (mutations) {
            for (let i = 0, mutation; i < mutations.length; i++) {
                mutation = mutations[i];
                if (mutation.addedNodes) {
                    this._listenSlots(mutation.addedNodes);
                }
                if (mutation.removedNodes) {
                    this._unlistenSlots(mutation.removedNodes);
                }
            }
        }
    }
    flush() {
        if (!this._connected) {
            return !1;
        }
        if (window.ShadyDOM) {
            ShadyDOM.flush();
        }
        if (this._nativeChildrenObserver) {
            this._processSlotMutations(this._nativeChildrenObserver.takeRecords());
        } else if (this._shadyChildrenObserver) {
            this._processSlotMutations(this._shadyChildrenObserver.takeRecords());
        }
        this._scheduled = !1;
        let info = { target: this._target, addedNodes: [], removedNodes: [] },
            newNodes = this.constructor.getFlattenedNodes(this._target),
            splices = calculateSplices(newNodes, this._effectiveNodes);
        for (let i = 0, s; i < splices.length && (s = splices[i]); i++) {
            for (let j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
                info.removedNodes.push(n);
            }
        }
        for (let i = 0, s; i < splices.length && (s = splices[i]); i++) {
            for (let j = s.index; j < s.index + s.addedCount; j++) {
                info.addedNodes.push(newNodes[j]);
            }
        }
        this._effectiveNodes = newNodes;
        let didFlush = !1;
        if (info.addedNodes.length || info.removedNodes.length) {
            didFlush = !0;
            this.callback.call(this._target, info);
        }
        return didFlush;
    }
    _listenSlots(nodeList) {
        for (let i = 0, n; i < nodeList.length; i++) {
            n = nodeList[i];
            if (isSlot(n)) {
                n.addEventListener("slotchange", this._boundSchedule);
            }
        }
    }
    _unlistenSlots(nodeList) {
        for (let i = 0, n; i < nodeList.length; i++) {
            n = nodeList[i];
            if (isSlot(n)) {
                n.removeEventListener("slotchange", this._boundSchedule);
            }
        }
    }
}
let debouncerQueue = [];
export const enqueueDebouncer = function (debouncer) {
    debouncerQueue.push(debouncer);
};
function flushDebouncers() {
    const didFlush = !!debouncerQueue.length;
    while (debouncerQueue.length) {
        try {
            debouncerQueue.shift().flush();
        } catch (e) {
            setTimeout(() => {
                throw e;
            });
        }
    }
    return didFlush;
}
export const flush = function () {
    let shadyDOM, debouncers;
    do {
        shadyDOM = window.ShadyDOM && ShadyDOM.flush();
        if (window.ShadyCSS && window.ShadyCSS.ScopingShim) {
            window.ShadyCSS.ScopingShim.flush();
        }
        debouncers = flushDebouncers();
    } while (shadyDOM || debouncers);
};
const pAWDOM = Element.prototype,
    normalizedMatchesSelector =
        pAWDOM.matches ||
        pAWDOM.matchesSelector ||
        pAWDOM.mozMatchesSelector ||
        pAWDOM.msMatchesSelector ||
        pAWDOM.oMatchesSelector ||
        pAWDOM.webkitMatchesSelector;
export const matchesSelector = function (node, selector) {
    return normalizedMatchesSelector.call(node, selector);
};
export class DomApi {
    constructor(node) {
        this.node = node;
    }
    observeNodes(callback) {
        return new FlattenedNodesObserver(this.node, callback);
    }
    unobserveNodes(observerHandle) {
        observerHandle.disconnect();
    }
    notifyObserver() {}
    deepContains(node) {
        if (this.node.contains(node)) {
            return !0;
        }
        let n = node,
            doc = node.ownerDocument;
        while (n && n !== doc && n !== this.node) {
            n = n.parentNode || n.host;
        }
        return n === this.node;
    }
    getOwnerRoot() {
        return this.node.getRootNode();
    }
    getDistributedNodes() {
        return "slot" === this.node.localName ? this.node.assignedNodes({ flatten: !0 }) : [];
    }
    getDestinationInsertionPoints() {
        let ip$ = [],
            n = this.node.assignedSlot;
        while (n) {
            ip$.push(n);
            n = n.assignedSlot;
        }
        return ip$;
    }
    importNode(node, deep) {
        let doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
        return doc.importNode(node, deep);
    }
    getEffectiveChildNodes() {
        return FlattenedNodesObserver.getFlattenedNodes(this.node);
    }
    queryDistributedElements(selector) {
        let c$ = this.getEffectiveChildNodes(),
            list = [];
        for (let i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
            if (c.nodeType === Node.ELEMENT_NODE && matchesSelector(c, selector)) {
                list.push(c);
            }
        }
        return list;
    }
    get activeElement() {
        let node = this.node;
        return node._activeElement !== void 0 ? node._activeElement : node.activeElement;
    }
}
function forwardMethods(proto, methods) {
    for (let i = 0, method; i < methods.length; i++) {
        method = methods[i];
        proto[method] = function () {
            return this.node[method].apply(this.node, arguments);
        };
    }
}
function forwardReadOnlyProperties(proto, properties) {
    for (let i = 0, name; i < properties.length; i++) {
        name = properties[i];
        Object.defineProperty(proto, name, {
            get: function () {
                const domApi = this;
                return domApi.node[name];
            },
            configurable: !0,
        });
    }
}
function forwardProperties(proto, properties) {
    for (let i = 0, name; i < properties.length; i++) {
        name = properties[i];
        Object.defineProperty(proto, name, {
            get: function () {
                return this.node[name];
            },
            set: function (value) {
                this.node[name] = value;
            },
            configurable: !0,
        });
    }
}
export class EventApi {
    constructor(event) {
        this.event = event;
    }
    get rootTarget() {
        return this.event.composedPath()[0];
    }
    get localTarget() {
        return this.event.target;
    }
    get path() {
        return this.event.composedPath();
    }
}
DomApi.prototype.cloneNode;
DomApi.prototype.appendChild;
DomApi.prototype.insertBefore;
DomApi.prototype.removeChild;
DomApi.prototype.replaceChild;
DomApi.prototype.setAttribute;
DomApi.prototype.removeAttribute;
DomApi.prototype.querySelector;
DomApi.prototype.querySelectorAll;
DomApi.prototype.parentNode;
DomApi.prototype.firstChild;
DomApi.prototype.lastChild;
DomApi.prototype.nextSibling;
DomApi.prototype.previousSibling;
DomApi.prototype.firstElementChild;
DomApi.prototype.lastElementChild;
DomApi.prototype.nextElementSibling;
DomApi.prototype.previousElementSibling;
DomApi.prototype.childNodes;
DomApi.prototype.children;
DomApi.prototype.classList;
DomApi.prototype.textContent;
DomApi.prototype.innerHTML;
forwardMethods(DomApi.prototype, [
    "cloneNode",
    "appendChild",
    "insertBefore",
    "removeChild",
    "replaceChild",
    "setAttribute",
    "removeAttribute",
    "querySelector",
    "querySelectorAll",
]);
forwardReadOnlyProperties(DomApi.prototype, [
    "parentNode",
    "firstChild",
    "lastChild",
    "nextSibling",
    "previousSibling",
    "firstElementChild",
    "lastElementChild",
    "nextElementSibling",
    "previousElementSibling",
    "childNodes",
    "children",
    "classList",
]);
forwardProperties(DomApi.prototype, ["textContent", "innerHTML"]);
export const dom = function (obj) {
    obj = obj || document;
    if (!obj.__domApi) {
        let helper;
        if (obj instanceof Event) {
            helper = new EventApi(obj);
        } else {
            helper = new DomApi(obj);
        }
        obj.__domApi = helper;
    }
    return obj.__domApi;
};
let styleInterface = window.ShadyCSS;
export const LegacyElementMixin = dedupingMixin((base) => {
    const legacyElementBase = DirMixin(GestureEventListeners(ElementMixin(base))),
        DIRECTION_MAP = { x: "pan-x", y: "pan-y", none: "none", all: "auto" };
    class LegacyElement extends legacyElementBase {
        constructor() {
            super();
            this.isAttached;
            this.__boundListeners;
            this._debouncers;
            this._applyListeners();
        }
        static get importMeta() {
            return this.prototype.importMeta;
        }
        created() {}
        connectedCallback() {
            super.connectedCallback();
            this.isAttached = !0;
            this.attached();
        }
        attached() {}
        disconnectedCallback() {
            super.disconnectedCallback();
            this.isAttached = !1;
            this.detached();
        }
        detached() {}
        attributeChangedCallback(name, old, value, namespace) {
            if (old !== value) {
                super.attributeChangedCallback(name, old, value, namespace);
                this.attributeChanged(name, old, value);
            }
        }
        attributeChanged(name, old, value) {}
        _initializeProperties() {
            let proto = Object.getPrototypeOf(this);
            if (!proto.hasOwnProperty("__hasRegisterFinished")) {
                proto.__hasRegisterFinished = !0;
                this._registered();
            }
            super._initializeProperties();
            this.root = this;
            this.created();
        }
        _registered() {}
        ready() {
            this._ensureAttributes();
            super.ready();
        }
        _ensureAttributes() {}
        _applyListeners() {}
        serialize(value) {
            return this._serializeValue(value);
        }
        deserialize(value, type) {
            return this._deserializeValue(value, type);
        }
        reflectPropertyToAttribute(property, attribute, value) {
            this._propertyToAttribute(property, attribute, value);
        }
        serializeValueToAttribute(value, attribute, node) {
            this._valueToNodeAttribute(node || this, value, attribute);
        }
        extend(prototype, api) {
            if (!(prototype && api)) {
                return prototype || api;
            }
            let n$ = Object.getOwnPropertyNames(api);
            for (let i = 0, n, pd; i < n$.length && (n = n$[i]); i++) {
                pd = Object.getOwnPropertyDescriptor(api, n);
                if (pd) {
                    Object.defineProperty(prototype, n, pd);
                }
            }
            return prototype;
        }
        mixin(target, source) {
            for (let i in source) {
                target[i] = source[i];
            }
            return target;
        }
        chainObject(object, prototype) {
            if (object && prototype && object !== prototype) {
                object.__proto__ = prototype;
            }
            return object;
        }
        instanceTemplate(template) {
            let content = this.constructor._contentForTemplate(template),
                dom = document.importNode(content, !0);
            return dom;
        }
        fire(type, detail, options) {
            options = options || {};
            detail = null === detail || detail === void 0 ? {} : detail;
            let event = new Event(type, {
                bubbles: options.bubbles === void 0 ? !0 : options.bubbles,
                cancelable: !!options.cancelable,
                composed: options.composed === void 0 ? !0 : options.composed,
            });
            event.detail = detail;
            let node = options.node || this;
            node.dispatchEvent(event);
            return event;
        }
        listen(node, eventName, methodName) {
            node = node || this;
            let hbl = this.__boundListeners || (this.__boundListeners = new WeakMap()),
                bl = hbl.get(node);
            if (!bl) {
                bl = {};
                hbl.set(node, bl);
            }
            let key = eventName + methodName;
            if (!bl[key]) {
                bl[key] = this._addMethodEventListenerToNode(node, eventName, methodName, this);
            }
        }
        unlisten(node, eventName, methodName) {
            node = node || this;
            let bl = this.__boundListeners && this.__boundListeners.get(node),
                key = eventName + methodName,
                handler = bl && bl[key];
            if (handler) {
                this._removeEventListenerFromNode(node, eventName, handler);
                bl[key] = null;
            }
        }
        setScrollDirection(direction, node) {
            setTouchAction(node || this, DIRECTION_MAP[direction] || "auto");
        }
        $$(slctr) {
            return this.root.querySelector(slctr);
        }
        get domHost() {
            let root = this.getRootNode();
            return root instanceof DocumentFragment ? root.host : root;
        }
        distributeContent() {
            if (window.ShadyDOM && this.shadowRoot) {
                ShadyDOM.flush();
            }
        }
        getEffectiveChildNodes() {
            const thisEl = this,
                domApi = dom(thisEl);
            return domApi.getEffectiveChildNodes();
        }
        queryDistributedElements(selector) {
            const thisEl = this,
                domApi = dom(thisEl);
            return domApi.queryDistributedElements(selector);
        }
        getEffectiveChildren() {
            let list = this.getEffectiveChildNodes();
            return list.filter(function (n) {
                return n.nodeType === Node.ELEMENT_NODE;
            });
        }
        getEffectiveTextContent() {
            let cn = this.getEffectiveChildNodes(),
                tc = [];
            for (let i = 0, c; (c = cn[i]); i++) {
                if (c.nodeType !== Node.COMMENT_NODE) {
                    tc.push(c.textContent);
                }
            }
            return tc.join("");
        }
        queryEffectiveChildren(selector) {
            let e$ = this.queryDistributedElements(selector);
            return e$ && e$[0];
        }
        queryAllEffectiveChildren(selector) {
            return this.queryDistributedElements(selector);
        }
        getContentChildNodes(slctr) {
            let content = this.root.querySelector(slctr || "slot");
            return content ? dom(content).getDistributedNodes() : [];
        }
        getContentChildren(slctr) {
            let children = this.getContentChildNodes(slctr).filter(function (n) {
                return n.nodeType === Node.ELEMENT_NODE;
            });
            return children;
        }
        isLightDescendant(node) {
            const thisNode = this;
            return thisNode !== node && thisNode.contains(node) && thisNode.getRootNode() === node.getRootNode();
        }
        isLocalDescendant(node) {
            return this.root === node.getRootNode();
        }
        scopeSubtree(container, shouldObserve) {}
        getComputedStyleValue(property) {
            return styleInterface.getComputedStyleValue(this, property);
        }
        debounce(jobName, callback, wait) {
            this._debouncers = this._debouncers || {};
            return (this._debouncers[jobName] = Debouncer.debounce(
                this._debouncers[jobName],
                0 < wait ? timeOut.after(wait) : microTask,
                callback.bind(this)
            ));
        }
        isDebouncerActive(jobName) {
            this._debouncers = this._debouncers || {};
            let debouncer = this._debouncers[jobName];
            return !!(debouncer && debouncer.isActive());
        }
        flushDebouncer(jobName) {
            this._debouncers = this._debouncers || {};
            let debouncer = this._debouncers[jobName];
            if (debouncer) {
                debouncer.flush();
            }
        }
        cancelDebouncer(jobName) {
            this._debouncers = this._debouncers || {};
            let debouncer = this._debouncers[jobName];
            if (debouncer) {
                debouncer.cancel();
            }
        }
        async(callback, waitTime) {
            return 0 < waitTime ? timeOut.run(callback.bind(this), waitTime) : ~microTask.run(callback.bind(this));
        }
        cancelAsync(handle) {
            0 > handle ? microTask.cancel(~handle) : timeOut.cancel(handle);
        }
        create(tag, props) {
            let elt = document.createElement(tag);
            if (props) {
                if (elt.setProperties) {
                    elt.setProperties(props);
                } else {
                    for (let n in props) {
                        elt[n] = props[n];
                    }
                }
            }
            return elt;
        }
        elementMatches(selector, node) {
            return matchesSelector(node || this, selector);
        }
        toggleAttribute(name, bool) {
            let node = this;
            if (3 === arguments.length) {
                node = arguments[2];
            }
            if (1 == arguments.length) {
                bool = !node.hasAttribute(name);
            }
            if (bool) {
                node.setAttribute(name, "");
                return !0;
            } else {
                node.removeAttribute(name);
                return !1;
            }
        }
        toggleClass(name, bool, node) {
            node = node || this;
            if (1 == arguments.length) {
                bool = !node.classList.contains(name);
            }
            if (bool) {
                node.classList.add(name);
            } else {
                node.classList.remove(name);
            }
        }
        transform(transformText, node) {
            node = node || this;
            node.style.webkitTransform = transformText;
            node.style.transform = transformText;
        }
        translate3d(x, y, z, node) {
            node = node || this;
            this.transform("translate3d(" + x + "," + y + "," + z + ")", node);
        }
        arrayDelete(arrayOrPath, item) {
            let index;
            if (Array.isArray(arrayOrPath)) {
                index = arrayOrPath.indexOf(item);
                if (0 <= index) {
                    return arrayOrPath.splice(index, 1);
                }
            } else {
                let arr = get(this, arrayOrPath);
                index = arr.indexOf(item);
                if (0 <= index) {
                    return this.splice(arrayOrPath, index, 1);
                }
            }
            return null;
        }
        _logger(level, args) {
            if (Array.isArray(args) && 1 === args.length && Array.isArray(args[0])) {
                args = args[0];
            }
            switch (level) {
                case "log":
                case "warn":
                case "error":
                    console[level](...args);
            }
        }
        _log(...args) {
            this._logger("log", args);
        }
        _warn(...args) {
            this._logger("warn", args);
        }
        _error(...args) {
            this._logger("error", args);
        }
        _logf(methodName, ...args) {
            return ["[%s::%s]", this.is, methodName, ...args];
        }
    }
    LegacyElement.prototype.is = "";
    return LegacyElement;
});
let metaProps = { attached: !0, detached: !0, ready: !0, created: !0, beforeRegister: !0, registered: !0, attributeChanged: !0, behaviors: !0 };
export function mixinBehaviors(behaviors, klass) {
    if (!behaviors) {
        klass = klass;
        return klass;
    }
    klass = LegacyElementMixin(klass);
    if (!Array.isArray(behaviors)) {
        behaviors = [behaviors];
    }
    let superBehaviors = klass.prototype.behaviors;
    behaviors = flattenBehaviors(behaviors, null, superBehaviors);
    klass = _mixinBehaviors(behaviors, klass);
    if (superBehaviors) {
        behaviors = superBehaviors.concat(behaviors);
    }
    klass.prototype.behaviors = behaviors;
    return klass;
}
function _mixinBehaviors(behaviors, klass) {
    for (let i = 0, b; i < behaviors.length; i++) {
        b = behaviors[i];
        if (b) {
            klass = Array.isArray(b) ? _mixinBehaviors(b, klass) : GenerateClassFromInfo(b, klass);
        }
    }
    return klass;
}
function flattenBehaviors(behaviors, list, exclude) {
    list = list || [];
    for (let i = behaviors.length - 1, b; 0 <= i; i--) {
        b = behaviors[i];
        if (b) {
            if (Array.isArray(b)) {
                flattenBehaviors(b, list);
            } else {
                if (0 > list.indexOf(b) && (!exclude || 0 > exclude.indexOf(b))) {
                    list.unshift(b);
                }
            }
        } else {
            console.warn("behavior is null, check for missing or 404 import");
        }
    }
    return list;
}
function GenerateClassFromInfo(info, Base) {
    class PolymerGenerated extends Base {
        static get properties() {
            return info.properties;
        }
        static get observers() {
            return info.observers;
        }
        created() {
            super.created();
            if (info.created) {
                info.created.call(this);
            }
        }
        _registered() {
            super._registered();
            if (info.beforeRegister) {
                info.beforeRegister.call(Object.getPrototypeOf(this));
            }
            if (info.registered) {
                info.registered.call(Object.getPrototypeOf(this));
            }
        }
        _applyListeners() {
            super._applyListeners();
            if (info.listeners) {
                for (let l in info.listeners) {
                    this._addMethodEventListenerToNode(this, l, info.listeners[l]);
                }
            }
        }
        _ensureAttributes() {
            if (info.hostAttributes) {
                for (let a in info.hostAttributes) {
                    this._ensureAttribute(a, info.hostAttributes[a]);
                }
            }
            super._ensureAttributes();
        }
        ready() {
            super.ready();
            if (info.ready) {
                info.ready.call(this);
            }
        }
        attached() {
            super.attached();
            if (info.attached) {
                info.attached.call(this);
            }
        }
        detached() {
            super.detached();
            if (info.detached) {
                info.detached.call(this);
            }
        }
        attributeChanged(name, old, value) {
            super.attributeChanged(name, old, value);
            if (info.attributeChanged) {
                info.attributeChanged.call(this, name, old, value);
            }
        }
    }
    PolymerGenerated.generatedFrom = info;
    for (let p in info) {
        if (!(p in metaProps)) {
            let pd = Object.getOwnPropertyDescriptor(info, p);
            if (pd) {
                Object.defineProperty(PolymerGenerated.prototype, p, pd);
            }
        }
    }
    return PolymerGenerated;
}
export const Class = function (info, mixin) {
    if (!info) {
        console.warn(`Polymer's Class function requires \`info\` argument`);
    }
    const baseWithBehaviors = info.behaviors ? mixinBehaviors(info.behaviors, HTMLElement) : LegacyElementMixin(HTMLElement),
        baseWithMixin = mixin ? mixin(baseWithBehaviors) : baseWithBehaviors,
        klass = GenerateClassFromInfo(info, baseWithMixin);
    klass.is = info.is;
    return klass;
};
const Polymer = function (info) {
    let klass;
    if ("function" === typeof info) {
        klass = info;
    } else {
        klass = Polymer.Class(info);
    }
    customElements.define(klass.is, klass);
    return klass;
};
Polymer.Class = Class;
export { Polymer };
function mutablePropertyChange(inst, property, value, old, mutableData) {
    let isObject;
    if (mutableData) {
        isObject = "object" === typeof value && null !== value;
        if (isObject) {
            old = inst.__dataTemp[property];
        }
    }
    let shouldChange = old !== value && (old === old || value === value);
    if (isObject && shouldChange) {
        inst.__dataTemp[property] = value;
    }
    return shouldChange;
}
export const MutableData = dedupingMixin((superClass) => {
    class MutableData extends superClass {
        _shouldPropertyChange(property, value, old) {
            return mutablePropertyChange(this, property, value, old, !0);
        }
    }
    return MutableData;
});
export const OptionalMutableData = dedupingMixin((superClass) => {
    class OptionalMutableData extends superClass {
        static get properties() {
            return { mutableData: Boolean };
        }
        _shouldPropertyChange(property, value, old) {
            return mutablePropertyChange(this, property, value, old, this.mutableData);
        }
    }
    return OptionalMutableData;
});
MutableData._mutablePropertyChange = mutablePropertyChange;
let newInstance = null;
function HTMLTemplateElementExtension() {
    return newInstance;
}
HTMLTemplateElementExtension.prototype = Object.create(HTMLTemplateElement.prototype, {
    constructor: { value: HTMLTemplateElementExtension, writable: !0 },
});
const DataTemplate = PropertyEffects(HTMLTemplateElementExtension),
    MutableDataTemplate = MutableData(DataTemplate);
function upgradeTemplate(template, constructor) {
    newInstance = template;
    Object.setPrototypeOf(template, constructor.prototype);
    new constructor();
    newInstance = null;
}
const base = PropertyEffects(class {});
class TemplateInstanceBase extends base {
    constructor(props) {
        super();
        this._configureProperties(props);
        this.root = this._stampTemplate(this.__dataHost);
        let children = (this.children = []);
        for (let n = this.root.firstChild; n; n = n.nextSibling) {
            children.push(n);
            n.__templatizeInstance = this;
        }
        if (this.__templatizeOwner && this.__templatizeOwner.__hideTemplateChildren__) {
            this._showHideChildren(!0);
        }
        let options = this.__templatizeOptions;
        if ((props && options.instanceProps) || !options.instanceProps) {
            this._enableProperties();
        }
    }
    _configureProperties(props) {
        let options = this.__templatizeOptions;
        if (options.forwardHostProp) {
            for (let hprop in this.__hostProps) {
                this._setPendingProperty(hprop, this.__dataHost["_host_" + hprop]);
            }
        }
        for (let iprop in props) {
            this._setPendingProperty(iprop, props[iprop]);
        }
    }
    forwardHostProp(prop, value) {
        if (this._setPendingPropertyOrPath(prop, value, !1, !0)) {
            this.__dataHost._enqueueClient(this);
        }
    }
    _addEventListenerToNode(node, eventName, handler) {
        if (this._methodHost && this.__templatizeOptions.parentModel) {
            this._methodHost._addEventListenerToNode(node, eventName, (e) => {
                e.model = this;
                handler(e);
            });
        } else {
            let templateHost = this.__dataHost.__dataHost;
            if (templateHost) {
                templateHost._addEventListenerToNode(node, eventName, handler);
            }
        }
    }
    _showHideChildren(hide) {
        let c = this.children;
        for (let i = 0, n; i < c.length; i++) {
            n = c[i];
            if (!!hide != !!n.__hideTemplateChildren__) {
                if (n.nodeType === Node.TEXT_NODE) {
                    if (hide) {
                        n.__polymerTextContent__ = n.textContent;
                        n.textContent = "";
                    } else {
                        n.textContent = n.__polymerTextContent__;
                    }
                } else if ("slot" === n.localName) {
                    if (hide) {
                        n.__polymerReplaced__ = document.createComment("hidden-slot");
                        n.parentNode.replaceChild(n.__polymerReplaced__, n);
                    } else {
                        const replace = n.__polymerReplaced__;
                        if (replace) {
                            replace.parentNode.replaceChild(n, replace);
                        }
                    }
                } else if (n.style) {
                    if (hide) {
                        n.__polymerDisplay__ = n.style.display;
                        n.style.display = "none";
                    } else {
                        n.style.display = n.__polymerDisplay__;
                    }
                }
            }
            n.__hideTemplateChildren__ = hide;
            if (n._showHideChildren) {
                n._showHideChildren(hide);
            }
        }
    }
    _setUnmanagedPropertyToNode(node, prop, value) {
        if (node.__hideTemplateChildren__ && node.nodeType == Node.TEXT_NODE && "textContent" == prop) {
            node.__polymerTextContent__ = value;
        } else {
            super._setUnmanagedPropertyToNode(node, prop, value);
        }
    }
    get parentModel() {
        let model = this.__parentModel;
        if (!model) {
            let options;
            model = this;
            do {
                model = model.__dataHost.__dataHost;
            } while ((options = model.__templatizeOptions) && !options.parentModel);
            this.__parentModel = model;
        }
        return model;
    }
    dispatchEvent(event) {
        return !0;
    }
}
TemplateInstanceBase.prototype.__dataHost;
TemplateInstanceBase.prototype.__templatizeOptions;
TemplateInstanceBase.prototype._methodHost;
TemplateInstanceBase.prototype.__templatizeOwner;
TemplateInstanceBase.prototype.__hostProps;
const MutableTemplateInstanceBase = MutableData(TemplateInstanceBase);
function findMethodHost(template) {
    let templateHost = template.__dataHost;
    return (templateHost && templateHost._methodHost) || templateHost;
}
function createTemplatizerClass(template, templateInfo, options) {
    let base = options.mutableData ? MutableTemplateInstanceBase : TemplateInstanceBase,
        klass = class extendsbase {};
    klass.prototype.__templatizeOptions = options;
    klass.prototype._bindTemplate(template);
    addNotifyEffects(klass, template, templateInfo, options);
    return klass;
}
function addPropagateEffects(template, templateInfo, options) {
    let userForwardHostProp = options.forwardHostProp;
    if (userForwardHostProp) {
        let klass = templateInfo.templatizeTemplateClass;
        if (!klass) {
            let base = options.mutableData ? MutableDataTemplate : DataTemplate;
            klass = templateInfo.templatizeTemplateClass = class TemplatizedTemplate extends base {};
            let hostProps = templateInfo.hostProps;
            for (let prop in hostProps) {
                klass.prototype._addPropertyEffect("_host_" + prop, klass.prototype.PROPERTY_EFFECT_TYPES.PROPAGATE, {
                    fn: createForwardHostPropEffect(prop, userForwardHostProp),
                });
                klass.prototype._createNotifyingProperty("_host_" + prop);
            }
        }
        upgradeTemplate(template, klass);
        if (template.__dataProto) {
            Object.assign(template.__data, template.__dataProto);
        }
        template.__dataTemp = {};
        template.__dataPending = null;
        template.__dataOld = null;
        template._enableProperties();
    }
}
function createForwardHostPropEffect(hostProp, userForwardHostProp) {
    return function forwardHostProp(template, prop, props) {
        userForwardHostProp.call(template.__templatizeOwner, prop.substring("_host_".length), props[prop]);
    };
}
function addNotifyEffects(klass, template, templateInfo, options) {
    let hostProps = templateInfo.hostProps || {};
    for (let iprop in options.instanceProps) {
        delete hostProps[iprop];
        let userNotifyInstanceProp = options.notifyInstanceProp;
        if (userNotifyInstanceProp) {
            klass.prototype._addPropertyEffect(iprop, klass.prototype.PROPERTY_EFFECT_TYPES.NOTIFY, {
                fn: createNotifyInstancePropEffect(iprop, userNotifyInstanceProp),
            });
        }
    }
    if (options.forwardHostProp && template.__dataHost) {
        for (let hprop in hostProps) {
            klass.prototype._addPropertyEffect(hprop, klass.prototype.PROPERTY_EFFECT_TYPES.NOTIFY, { fn: createNotifyHostPropEffect() });
        }
    }
}
function createNotifyInstancePropEffect(instProp, userNotifyInstanceProp) {
    return function notifyInstanceProp(inst, prop, props) {
        userNotifyInstanceProp.call(inst.__templatizeOwner, inst, prop, props[prop]);
    };
}
function createNotifyHostPropEffect() {
    return function notifyHostProp(inst, prop, props) {
        inst.__dataHost._setPendingPropertyOrPath("_host_" + prop, props[prop], !0, !0);
    };
}
export function templatize(template, owner, options) {
    if (strictTemplatePolicy && !findMethodHost(template)) {
        throw new Error("strictTemplatePolicy: template owner not trusted");
    }
    options = options || {};
    if (template.__templatizeOwner) {
        throw new Error("A <template> can only be templatized once");
    }
    template.__templatizeOwner = owner;
    const ctor = owner ? owner.constructor : TemplateInstanceBase;
    let templateInfo = ctor._parseTemplate(template),
        baseClass = templateInfo.templatizeInstanceClass;
    if (!baseClass) {
        baseClass = createTemplatizerClass(template, templateInfo, options);
        templateInfo.templatizeInstanceClass = baseClass;
    }
    addPropagateEffects(template, templateInfo, options);
    let klass = class TemplateInstance extends baseClass {};
    klass.prototype._methodHost = findMethodHost(template);
    klass.prototype.__dataHost = template;
    klass.prototype.__templatizeOwner = owner;
    klass.prototype.__hostProps = templateInfo.hostProps;
    klass = klass;
    return klass;
}
export function modelForElement(template, node) {
    let model;
    while (node) {
        if ((model = node.__templatizeInstance)) {
            if (model.__dataHost != template) {
                node = model.__dataHost;
            } else {
                return model;
            }
        } else {
            node = node.parentNode;
        }
    }
    return null;
}
export { TemplateInstanceBase };
let TemplatizerUser;
export const Templatizer = {
    templatize(template, mutableData) {
        this._templatizerTemplate = template;
        this.ctor = templatize(template, this, {
            mutableData: !!mutableData,
            parentModel: this._parentModel,
            instanceProps: this._instanceProps,
            forwardHostProp: this._forwardHostPropV2,
            notifyInstanceProp: this._notifyInstancePropV2,
        });
    },
    stamp(model) {
        return new this.ctor(model);
    },
    modelForElement(el) {
        return modelForElement(this._templatizerTemplate, el);
    },
};
const domBindBase = GestureEventListeners(OptionalMutableData(PropertyEffects(HTMLElement)));
export class DomBind extends domBindBase {
    static get observedAttributes() {
        return ["mutable-data"];
    }
    constructor() {
        super();
        if (strictTemplatePolicy) {
            throw new Error(`strictTemplatePolicy: dom-bind not allowed`);
        }
        this.root = null;
        this.$ = null;
        this.__children = null;
    }
    attributeChangedCallback() {
        this.mutableData = !0;
    }
    connectedCallback() {
        this.style.display = "none";
        this.render();
    }
    disconnectedCallback() {
        this.__removeChildren();
    }
    __insertChildren() {
        this.parentNode.insertBefore(this.root, this);
    }
    __removeChildren() {
        if (this.__children) {
            for (let i = 0; i < this.__children.length; i++) {
                this.root.appendChild(this.__children[i]);
            }
        }
    }
    render() {
        let template;
        if (!this.__children) {
            template = template || this.querySelector("template");
            if (!template) {
                let observer = new MutationObserver(() => {
                    template = this.querySelector("template");
                    if (template) {
                        observer.disconnect();
                        this.render();
                    } else {
                        throw new Error("dom-bind requires a <template> child");
                    }
                });
                observer.observe(this, { childList: !0 });
                return;
            }
            this.root = this._stampTemplate(template);
            this.$ = this.root.$;
            this.__children = [];
            for (let n = this.root.firstChild; n; n = n.nextSibling) {
                this.__children[this.__children.length] = n;
            }
            this._enableProperties();
        }
        this.__insertChildren();
        this.dispatchEvent(new CustomEvent("dom-change", { bubbles: !0, composed: !0 }));
    }
}
customElements.define("dom-bind", DomBind);
const domRepeatBase = OptionalMutableData(PolymerElement);
export class DomRepeat extends domRepeatBase {
    static get is() {
        return "dom-repeat";
    }
    static get template() {
        return null;
    }
    static get properties() {
        return {
            items: { type: Array },
            as: { type: String, value: "item" },
            indexAs: { type: String, value: "index" },
            itemsIndexAs: { type: String, value: "itemsIndex" },
            sort: { type: Function, observer: "__sortChanged" },
            filter: { type: Function, observer: "__filterChanged" },
            observe: { type: String, observer: "__observeChanged" },
            delay: Number,
            renderedItemCount: { type: Number, notify: !0, readOnly: !0 },
            initialCount: { type: Number, observer: "__initializeChunking" },
            targetFramerate: { type: Number, value: 20 },
            _targetFrameTime: { type: Number, computed: "__computeFrameTime(targetFramerate)" },
        };
    }
    static get observers() {
        return ["__itemsChanged(items.*)"];
    }
    constructor() {
        super();
        this.__instances = [];
        this.__limit = 1 / 0;
        this.__pool = [];
        this.__renderDebouncer = null;
        this.__itemsIdxToInstIdx = {};
        this.__chunkCount = null;
        this.__lastChunkTime = null;
        this.__sortFn = null;
        this.__filterFn = null;
        this.__observePaths = null;
        this.__ctor = null;
        this.__isDetached = !0;
        this.template = null;
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.__isDetached = !0;
        for (let i = 0; i < this.__instances.length; i++) {
            this.__detachInstance(i);
        }
    }
    connectedCallback() {
        super.connectedCallback();
        this.style.display = "none";
        if (this.__isDetached) {
            this.__isDetached = !1;
            let parent = this.parentNode;
            for (let i = 0; i < this.__instances.length; i++) {
                this.__attachInstance(i, parent);
            }
        }
    }
    __ensureTemplatized() {
        if (!this.__ctor) {
            let template = (this.template = this.querySelector("template"));
            if (!template) {
                let observer = new MutationObserver(() => {
                    if (this.querySelector("template")) {
                        observer.disconnect();
                        this.__render();
                    } else {
                        throw new Error("dom-repeat requires a <template> child");
                    }
                });
                observer.observe(this, { childList: !0 });
                return !1;
            }
            let instanceProps = {};
            instanceProps[this.as] = !0;
            instanceProps[this.indexAs] = !0;
            instanceProps[this.itemsIndexAs] = !0;
            this.__ctor = templatize(template, this, {
                mutableData: this.mutableData,
                parentModel: !0,
                instanceProps: instanceProps,
                forwardHostProp: function (prop, value) {
                    let i$ = this.__instances;
                    for (let i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
                        inst.forwardHostProp(prop, value);
                    }
                },
                notifyInstanceProp: function (inst, prop, value) {
                    if (matches(this.as, prop)) {
                        let idx = inst[this.itemsIndexAs];
                        if (prop == this.as) {
                            this.items[idx] = value;
                        }
                        let path = translate(this.as, "items." + idx, prop);
                        this.notifyPath(path, value);
                    }
                },
            });
        }
        return !0;
    }
    __getMethodHost() {
        return this.__dataHost._methodHost || this.__dataHost;
    }
    __functionFromPropertyValue(functionOrMethodName) {
        if ("string" === typeof functionOrMethodName) {
            let methodName = functionOrMethodName,
                obj = this.__getMethodHost();
            return function () {
                return obj[methodName].apply(obj, arguments);
            };
        }
        return functionOrMethodName;
    }
    __sortChanged(sort) {
        this.__sortFn = this.__functionFromPropertyValue(sort);
        if (this.items) {
            this.__debounceRender(this.__render);
        }
    }
    __filterChanged(filter) {
        this.__filterFn = this.__functionFromPropertyValue(filter);
        if (this.items) {
            this.__debounceRender(this.__render);
        }
    }
    __computeFrameTime(rate) {
        return Math.ceil(1e3 / rate);
    }
    __initializeChunking() {
        if (this.initialCount) {
            this.__limit = this.initialCount;
            this.__chunkCount = this.initialCount;
            this.__lastChunkTime = performance.now();
        }
    }
    __tryRenderChunk() {
        if (this.items && this.__limit < this.items.length) {
            this.__debounceRender(this.__requestRenderChunk);
        }
    }
    __requestRenderChunk() {
        requestAnimationFrame(() => this.__renderChunk());
    }
    __renderChunk() {
        let currChunkTime = performance.now(),
            ratio = this._targetFrameTime / (currChunkTime - this.__lastChunkTime);
        this.__chunkCount = Math.round(this.__chunkCount * ratio) || 1;
        this.__limit += this.__chunkCount;
        this.__lastChunkTime = currChunkTime;
        this.__debounceRender(this.__render);
    }
    __observeChanged() {
        this.__observePaths = this.observe && this.observe.replace(".*", ".").split(" ");
    }
    __itemsChanged(change) {
        if (this.items && !Array.isArray(this.items)) {
            console.warn("dom-repeat expected array for `items`, found", this.items);
        }
        if (!this.__handleItemPath(change.path, change.value)) {
            this.__initializeChunking();
            this.__debounceRender(this.__render);
        }
    }
    __handleObservedPaths(path) {
        if (this.__sortFn || this.__filterFn) {
            if (!path) {
                this.__debounceRender(this.__render, this.delay);
            } else if (this.__observePaths) {
                let paths = this.__observePaths;
                for (let i = 0; i < paths.length; i++) {
                    if (0 === path.indexOf(paths[i])) {
                        this.__debounceRender(this.__render, this.delay);
                    }
                }
            }
        }
    }
    __debounceRender(fn, delay = 0) {
        this.__renderDebouncer = Debouncer.debounce(this.__renderDebouncer, 0 < delay ? timeOut.after(delay) : microTask, fn.bind(this));
        enqueueDebouncer(this.__renderDebouncer);
    }
    render() {
        this.__debounceRender(this.__render);
        flush();
    }
    __render() {
        if (!this.__ensureTemplatized()) {
            return;
        }
        this.__applyFullRefresh();
        this.__pool.length = 0;
        this._setRenderedItemCount(this.__instances.length);
        this.dispatchEvent(new CustomEvent("dom-change", { bubbles: !0, composed: !0 }));
        this.__tryRenderChunk();
    }
    __applyFullRefresh() {
        let items = this.items || [],
            isntIdxToItemsIdx = Array(items.length);
        for (let i = 0; i < items.length; i++) {
            isntIdxToItemsIdx[i] = i;
        }
        if (this.__filterFn) {
            isntIdxToItemsIdx = isntIdxToItemsIdx.filter((i, idx, array) => this.__filterFn(items[i], idx, array));
        }
        if (this.__sortFn) {
            isntIdxToItemsIdx.sort((a, b) => this.__sortFn(items[a], items[b]));
        }
        const itemsIdxToInstIdx = (this.__itemsIdxToInstIdx = {});
        let instIdx = 0;
        const limit = Math.min(isntIdxToItemsIdx.length, this.__limit);
        for (; instIdx < limit; instIdx++) {
            let inst = this.__instances[instIdx],
                itemIdx = isntIdxToItemsIdx[instIdx],
                item = items[itemIdx];
            itemsIdxToInstIdx[itemIdx] = instIdx;
            if (inst) {
                inst._setPendingProperty(this.as, item);
                inst._setPendingProperty(this.indexAs, instIdx);
                inst._setPendingProperty(this.itemsIndexAs, itemIdx);
                inst._flushProperties();
            } else {
                this.__insertInstance(item, instIdx, itemIdx);
            }
        }
        for (let i = this.__instances.length - 1; i >= instIdx; i--) {
            this.__detachAndRemoveInstance(i);
        }
    }
    __detachInstance(idx) {
        let inst = this.__instances[idx];
        for (let i = 0, el; i < inst.children.length; i++) {
            el = inst.children[i];
            inst.root.appendChild(el);
        }
        return inst;
    }
    __attachInstance(idx, parent) {
        let inst = this.__instances[idx];
        parent.insertBefore(inst.root, this);
    }
    __detachAndRemoveInstance(idx) {
        let inst = this.__detachInstance(idx);
        if (inst) {
            this.__pool.push(inst);
        }
        this.__instances.splice(idx, 1);
    }
    __stampInstance(item, instIdx, itemIdx) {
        let model = {};
        model[this.as] = item;
        model[this.indexAs] = instIdx;
        model[this.itemsIndexAs] = itemIdx;
        return new this.__ctor(model);
    }
    __insertInstance(item, instIdx, itemIdx) {
        let inst = this.__pool.pop();
        if (inst) {
            inst._setPendingProperty(this.as, item);
            inst._setPendingProperty(this.indexAs, instIdx);
            inst._setPendingProperty(this.itemsIndexAs, itemIdx);
            inst._flushProperties();
        } else {
            inst = this.__stampInstance(item, instIdx, itemIdx);
        }
        let beforeRow = this.__instances[instIdx + 1],
            beforeNode = beforeRow ? beforeRow.children[0] : this;
        this.parentNode.insertBefore(inst.root, beforeNode);
        this.__instances[instIdx] = inst;
        return inst;
    }
    _showHideChildren(hidden) {
        for (let i = 0; i < this.__instances.length; i++) {
            this.__instances[i]._showHideChildren(hidden);
        }
    }
    __handleItemPath(path, value) {
        let itemsPath = path.slice(6),
            dot = itemsPath.indexOf("."),
            itemsIdx = 0 > dot ? itemsPath : itemsPath.substring(0, dot);
        if (itemsIdx == parseInt(itemsIdx, 10)) {
            let itemSubPath = 0 > dot ? "" : itemsPath.substring(dot + 1);
            this.__handleObservedPaths(itemSubPath);
            let instIdx = this.__itemsIdxToInstIdx[itemsIdx],
                inst = this.__instances[instIdx];
            if (inst) {
                let itemPath = this.as + (itemSubPath ? "." + itemSubPath : "");
                inst._setPendingPropertyOrPath(itemPath, value, !1, !0);
                inst._flushProperties();
            }
            return !0;
        }
    }
    itemForElement(el) {
        let instance = this.modelForElement(el);
        return instance && instance[this.as];
    }
    indexForElement(el) {
        let instance = this.modelForElement(el);
        return instance && instance[this.indexAs];
    }
    modelForElement(el) {
        return modelForElement(this.template, el);
    }
}
customElements.define(DomRepeat.is, DomRepeat);
export class DomIf extends PolymerElement {
    static get is() {
        return "dom-if";
    }
    static get template() {
        return null;
    }
    static get properties() {
        return { if: { type: Boolean, observer: "__debounceRender" }, restamp: { type: Boolean, observer: "__debounceRender" } };
    }
    constructor() {
        super();
        this.__renderDebouncer = null;
        this.__invalidProps = null;
        this.__instance = null;
        this._lastIf = !1;
        this.__ctor = null;
        this.__hideTemplateChildren__ = !1;
    }
    __debounceRender() {
        this.__renderDebouncer = Debouncer.debounce(this.__renderDebouncer, microTask, () => this.__render());
        enqueueDebouncer(this.__renderDebouncer);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (!this.parentNode || (this.parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE && !this.parentNode.host)) {
            this.__teardownInstance();
        }
    }
    connectedCallback() {
        super.connectedCallback();
        this.style.display = "none";
        if (this.if) {
            this.__debounceRender();
        }
    }
    render() {
        flush();
    }
    __render() {
        if (this.if) {
            if (!this.__ensureInstance()) {
                return;
            }
            this._showHideChildren();
        } else if (this.restamp) {
            this.__teardownInstance();
        }
        if (!this.restamp && this.__instance) {
            this._showHideChildren();
        }
        if (this.if != this._lastIf) {
            this.dispatchEvent(new CustomEvent("dom-change", { bubbles: !0, composed: !0 }));
            this._lastIf = this.if;
        }
    }
    __ensureInstance() {
        let parentNode = this.parentNode;
        if (parentNode) {
            if (!this.__ctor) {
                let template = this.querySelector("template");
                if (!template) {
                    let observer = new MutationObserver(() => {
                        if (this.querySelector("template")) {
                            observer.disconnect();
                            this.__render();
                        } else {
                            throw new Error("dom-if requires a <template> child");
                        }
                    });
                    observer.observe(this, { childList: !0 });
                    return !1;
                }
                this.__ctor = templatize(template, this, {
                    mutableData: !0,
                    forwardHostProp: function (prop, value) {
                        if (this.__instance) {
                            if (this.if) {
                                this.__instance.forwardHostProp(prop, value);
                            } else {
                                this.__invalidProps = this.__invalidProps || Object.create(null);
                                this.__invalidProps[root(prop)] = !0;
                            }
                        }
                    },
                });
            }
            if (!this.__instance) {
                this.__instance = new this.__ctor();
                parentNode.insertBefore(this.__instance.root, this);
            } else {
                this.__syncHostProperties();
                let c$ = this.__instance.children;
                if (c$ && c$.length) {
                    let lastChild = this.previousSibling;
                    if (lastChild !== c$[c$.length - 1]) {
                        for (let i = 0, n; i < c$.length && (n = c$[i]); i++) {
                            parentNode.insertBefore(n, this);
                        }
                    }
                }
            }
        }
        return !0;
    }
    __syncHostProperties() {
        let props = this.__invalidProps;
        if (props) {
            for (let prop in props) {
                this.__instance._setPendingProperty(prop, this.__dataHost[prop]);
            }
            this.__invalidProps = null;
            this.__instance._flushProperties();
        }
    }
    __teardownInstance() {
        if (this.__instance) {
            let c$ = this.__instance.children;
            if (c$ && c$.length) {
                let parent = c$[0].parentNode;
                if (parent) {
                    for (let i = 0, n; i < c$.length && (n = c$[i]); i++) {
                        parent.removeChild(n);
                    }
                }
            }
            this.__instance = null;
            this.__invalidProps = null;
        }
    }
    _showHideChildren() {
        let hidden = this.__hideTemplateChildren__ || !this.if;
        if (this.__instance) {
            this.__instance._showHideChildren(hidden);
        }
    }
}
customElements.define(DomIf.is, DomIf);
let ArraySelectorMixin = dedupingMixin((superClass) => {
    let elementBase = ElementMixin(superClass);
    class ArraySelectorMixin extends elementBase {
        static get properties() {
            return {
                items: { type: Array },
                multi: { type: Boolean, value: !1 },
                selected: { type: Object, notify: !0 },
                selectedItem: { type: Object, notify: !0 },
                toggle: { type: Boolean, value: !1 },
            };
        }
        static get observers() {
            return ["__updateSelection(multi, items.*)"];
        }
        constructor() {
            super();
            this.__lastItems = null;
            this.__lastMulti = null;
            this.__selectedMap = null;
        }
        __updateSelection(multi, itemsInfo) {
            let path = itemsInfo.path;
            if ("items" == path) {
                let newItems = itemsInfo.base || [],
                    lastItems = this.__lastItems,
                    lastMulti = this.__lastMulti;
                if (multi !== lastMulti) {
                    this.clearSelection();
                }
                if (lastItems) {
                    let splices = calculateSplices(newItems, lastItems);
                    this.__applySplices(splices);
                }
                this.__lastItems = newItems;
                this.__lastMulti = multi;
            } else if ("items.splices" == itemsInfo.path) {
                this.__applySplices(itemsInfo.value.indexSplices);
            } else {
                let part = path.slice("items.".length),
                    idx = parseInt(part, 10);
                if (0 > part.indexOf(".") && part == idx) {
                    this.__deselectChangedIdx(idx);
                }
            }
        }
        __applySplices(splices) {
            let selected = this.__selectedMap;
            for (let i = 0, s; i < splices.length; i++) {
                s = splices[i];
                selected.forEach((idx, item) => {
                    if (idx < s.index) {
                    } else if (idx >= s.index + s.removed.length) {
                        selected.set(item, idx + s.addedCount - s.removed.length);
                    } else {
                        selected.set(item, -1);
                    }
                });
                for (let j = 0, idx; j < s.addedCount; j++) {
                    idx = s.index + j;
                    if (selected.has(this.items[idx])) {
                        selected.set(this.items[idx], idx);
                    }
                }
            }
            this.__updateLinks();
            let sidx = 0;
            selected.forEach((idx, item) => {
                if (0 > idx) {
                    if (this.multi) {
                        this.splice("selected", sidx, 1);
                    } else {
                        this.selected = this.selectedItem = null;
                    }
                    selected.delete(item);
                } else {
                    sidx++;
                }
            });
        }
        __updateLinks() {
            this.__dataLinkedPaths = {};
            if (this.multi) {
                let sidx = 0;
                this.__selectedMap.forEach((idx) => {
                    if (0 <= idx) {
                        this.linkPaths("items." + idx, "selected." + sidx++);
                    }
                });
            } else {
                this.__selectedMap.forEach((idx) => {
                    this.linkPaths("selected", "items." + idx);
                    this.linkPaths("selectedItem", "items." + idx);
                });
            }
        }
        clearSelection() {
            this.__dataLinkedPaths = {};
            this.__selectedMap = new Map();
            this.selected = this.multi ? [] : null;
            this.selectedItem = null;
        }
        isSelected(item) {
            return this.__selectedMap.has(item);
        }
        isIndexSelected(idx) {
            return this.isSelected(this.items[idx]);
        }
        __deselectChangedIdx(idx) {
            let sidx = this.__selectedIndexForItemIndex(idx);
            if (0 <= sidx) {
                let i = 0;
                this.__selectedMap.forEach((idx, item) => {
                    if (sidx == i++) {
                        this.deselect(item);
                    }
                });
            }
        }
        __selectedIndexForItemIndex(idx) {
            let selected = this.__dataLinkedPaths["items." + idx];
            if (selected) {
                return parseInt(selected.slice("selected.".length), 10);
            }
        }
        deselect(item) {
            let idx = this.__selectedMap.get(item);
            if (0 <= idx) {
                this.__selectedMap.delete(item);
                let sidx;
                if (this.multi) {
                    sidx = this.__selectedIndexForItemIndex(idx);
                }
                this.__updateLinks();
                if (this.multi) {
                    this.splice("selected", sidx, 1);
                } else {
                    this.selected = this.selectedItem = null;
                }
            }
        }
        deselectIndex(idx) {
            this.deselect(this.items[idx]);
        }
        select(item) {
            this.selectIndex(this.items.indexOf(item));
        }
        selectIndex(idx) {
            let item = this.items[idx];
            if (!this.isSelected(item)) {
                if (!this.multi) {
                    this.__selectedMap.clear();
                }
                this.__selectedMap.set(item, idx);
                this.__updateLinks();
                if (this.multi) {
                    this.push("selected", item);
                } else {
                    this.selected = this.selectedItem = item;
                }
            } else if (this.toggle) {
                this.deselectIndex(idx);
            }
        }
    }
    return ArraySelectorMixin;
});
export { ArraySelectorMixin };
let baseArraySelector = ArraySelectorMixin(PolymerElement);
class ArraySelector extends baseArraySelector {
    static get is() {
        return "array-selector";
    }
}
customElements.define(ArraySelector.is, ArraySelector);
export { ArraySelector };
const attr = "include",
    CustomStyleInterface = window.ShadyCSS.CustomStyleInterface;
export class CustomStyle extends HTMLElement {
    constructor() {
        super();
        this._style = null;
        CustomStyleInterface.addCustomStyle(this);
    }
    getStyle() {
        if (this._style) {
            return this._style;
        }
        const style = this.querySelector("style");
        if (!style) {
            return null;
        }
        this._style = style;
        const include = style.getAttribute(attr);
        if (include) {
            style.removeAttribute(attr);
            style.textContent = cssFromModules(include) + style.textContent;
        }
        if (this.ownerDocument !== window.document) {
            window.document.head.appendChild(this);
        }
        return this._style;
    }
}
window.customElements.define("custom-style", CustomStyle);
export const MutableDataBehavior = {
    _shouldPropertyChange(property, value, old) {
        return mutablePropertyChange(this, property, value, old, !0);
    },
};
export const OptionalMutableDataBehavior = {
    properties: { mutableData: Boolean },
    _shouldPropertyChange(property, value, old) {
        return mutablePropertyChange(this, property, value, old, this.mutableData);
    },
};
export const Base = LegacyElementMixin(HTMLElement).prototype;
