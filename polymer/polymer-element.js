window.JSCompiler_renameProperty = function (prop, obj) {
    return prop;
};
let CSS_URL_RX = /(url\()([^)]*)(\))/g,
    ABS_URL = /(^\/)|(^#)|(^[\w-\d]*:)/,
    workingURL,
    resolveDoc;
export function resolveUrl(url, baseURI) {
    if (url && ABS_URL.test(url)) {
        return url;
    }
    if (workingURL === void 0) {
        workingURL = !1;
        try {
            const u = new URL("b", "http://a");
            u.pathname = "c%20d";
            workingURL = "http://a/c%20d" === u.href;
        } catch (e) {}
    }
    if (!baseURI) {
        baseURI = document.baseURI || window.location.href;
    }
    if (workingURL) {
        return new URL(url, baseURI).href;
    }
    if (!resolveDoc) {
        resolveDoc = document.implementation.createHTMLDocument("temp");
        resolveDoc.base = resolveDoc.createElement("base");
        resolveDoc.head.appendChild(resolveDoc.base);
        resolveDoc.anchor = resolveDoc.createElement("a");
        resolveDoc.body.appendChild(resolveDoc.anchor);
    }
    resolveDoc.base.href = baseURI;
    resolveDoc.anchor.href = url;
    return resolveDoc.anchor.href || url;
}
export function resolveCss(cssText, baseURI) {
    return cssText.replace(CSS_URL_RX, function (m, pre, url, post) {
        return pre + "'" + resolveUrl(url.replace(/["']/g, ""), baseURI) + "'" + post;
    });
}
export function pathFromUrl(url) {
    return url.substring(0, url.lastIndexOf("/") + 1);
}
export const useShadow = !window.ShadyDOM;
export const useNativeCSSProperties = !!(!window.ShadyCSS || window.ShadyCSS.nativeCss);
export const useNativeCustomElements = !window.customElements.polyfillWrapFlushCallback;
export let rootPath = void 0 || pathFromUrl(document.baseURI || window.location.href);
export const setRootPath = function (path) {
    rootPath = path;
};
export let sanitizeDOMValue = (window.Polymer && window.Polymer.sanitizeDOMValue) || void 0;
export const setSanitizeDOMValue = function (newSanitizeDOMValue) {
    sanitizeDOMValue = newSanitizeDOMValue;
};
export let passiveTouchGestures = !1;
export const setPassiveTouchGestures = function (usePassive) {
    passiveTouchGestures = usePassive;
};
export let strictTemplatePolicy = !1;
export const setStrictTemplatePolicy = function (useStrictPolicy) {
    strictTemplatePolicy = useStrictPolicy;
};
export let allowTemplateFromDomModule = !1;
export const setAllowTemplateFromDomModule = function (allowDomModule) {
    allowTemplateFromDomModule = allowDomModule;
};
let dedupeId = 0;
function MixinFunction() {}
MixinFunction.prototype.__mixinApplications;
MixinFunction.prototype.__mixinSet;
export const dedupingMixin = function (mixin) {
    let mixinApplications = mixin.__mixinApplications;
    if (!mixinApplications) {
        mixinApplications = new WeakMap();
        mixin.__mixinApplications = mixinApplications;
    }
    let mixinDedupeId = dedupeId++;
    function dedupingMixin(base) {
        let baseSet = base.__mixinSet;
        if (baseSet && baseSet[mixinDedupeId]) {
            return base;
        }
        let map = mixinApplications,
            extended = map.get(base);
        if (!extended) {
            extended = mixin(base);
            map.set(base, extended);
        }
        let mixinSet = Object.create(extended.__mixinSet || baseSet || null);
        mixinSet[mixinDedupeId] = !0;
        extended.__mixinSet = mixinSet;
        return extended;
    }
    return dedupingMixin;
};
let modules = {},
    lcModules = {};
function setModule(id, module) {
    modules[id] = lcModules[id.toLowerCase()] = module;
}
function findModule(id) {
    return modules[id] || lcModules[id.toLowerCase()];
}
function styleOutsideTemplateCheck(inst) {
    if (inst.querySelector("style")) {
        console.warn("dom-module %s has style outside template", inst.id);
    }
}
export class DomModule extends HTMLElement {
    static get observedAttributes() {
        return ["id"];
    }
    static import(id, selector) {
        if (id) {
            let m = findModule(id);
            if (m && selector) {
                return m.querySelector(selector);
            }
            return m;
        }
        return null;
    }
    attributeChangedCallback(name, old, value, namespace) {
        if (old !== value) {
            this.register();
        }
    }
    get assetpath() {
        if (!this.__assetpath) {
            const owner = window.HTMLImports && HTMLImports.importForElement ? HTMLImports.importForElement(this) || document : this.ownerDocument,
                url = resolveUrl(this.getAttribute("assetpath") || "", owner.baseURI);
            this.__assetpath = pathFromUrl(url);
        }
        return this.__assetpath;
    }
    register(id) {
        id = id || this.id;
        if (id) {
            if (strictTemplatePolicy && findModule(id) !== void 0) {
                setModule(id, null);
                throw new Error(`strictTemplatePolicy: dom-module ${id} re-registered`);
            }
            this.id = id;
            setModule(id, this);
            styleOutsideTemplateCheck(this);
        }
    }
}
DomModule.prototype.modules = modules;
customElements.define("dom-module", DomModule);
const MODULE_STYLE_LINK_SELECTOR = "link[rel=import][type~=css]",
    INCLUDE_ATTR = "include",
    SHADY_UNSCOPED_ATTR = "shady-unscoped";
function importModule(moduleId) {
    return DomModule.import(moduleId);
}
function styleForImport(importDoc) {
    let container = importDoc.body ? importDoc.body : importDoc;
    const importCss = resolveCss(container.textContent, importDoc.baseURI),
        style = document.createElement("style");
    style.textContent = importCss;
    return style;
}
let templateWithAssetPath;
export function stylesFromModules(moduleIds) {
    const modules = moduleIds.trim().split(/\s+/),
        styles = [];
    for (let i = 0; i < modules.length; i++) {
        styles.push(...stylesFromModule(modules[i]));
    }
    return styles;
}
export function stylesFromModule(moduleId) {
    const m = importModule(moduleId);
    if (!m) {
        console.warn("Could not find style data in module named", moduleId);
        return [];
    }
    if (m._styles === void 0) {
        const styles = [..._stylesFromModuleImports(m)],
            template = m.querySelector("template");
        if (template) {
            styles.push(...stylesFromTemplate(template, m.assetpath));
        }
        m._styles = styles;
    }
    return m._styles;
}
export function stylesFromTemplate(template, baseURI) {
    if (!template._styles) {
        const styles = [],
            e$ = template.content.querySelectorAll("style");
        for (let i = 0; i < e$.length; i++) {
            let e = e$[i],
                include = e.getAttribute(INCLUDE_ATTR);
            if (include) {
                styles.push(
                    ...stylesFromModules(include).filter(function (item, index, self) {
                        return self.indexOf(item) === index;
                    })
                );
            }
            if (baseURI) {
                e.textContent = resolveCss(e.textContent, baseURI);
            }
            styles.push(e);
        }
        template._styles = styles;
    }
    return template._styles;
}
export function stylesFromModuleImports(moduleId) {
    let m = importModule(moduleId);
    return m ? _stylesFromModuleImports(m) : [];
}
function _stylesFromModuleImports(module) {
    const styles = [],
        p$ = module.querySelectorAll(MODULE_STYLE_LINK_SELECTOR);
    for (let i = 0, p; i < p$.length; i++) {
        p = p$[i];
        if (p.import) {
            const importDoc = p.import,
                unscoped = p.hasAttribute(SHADY_UNSCOPED_ATTR);
            if (unscoped && !importDoc._unscopedStyle) {
                const style = styleForImport(importDoc);
                style.setAttribute(SHADY_UNSCOPED_ATTR, "");
                importDoc._unscopedStyle = style;
            } else if (!importDoc._style) {
                importDoc._style = styleForImport(importDoc);
            }
            styles.push(unscoped ? importDoc._unscopedStyle : importDoc._style);
        }
    }
    return styles;
}
export function cssFromModules(moduleIds) {
    let modules = moduleIds.trim().split(/\s+/),
        cssText = "";
    for (let i = 0; i < modules.length; i++) {
        cssText += cssFromModule(modules[i]);
    }
    return cssText;
}
export function cssFromModule(moduleId) {
    let m = importModule(moduleId);
    if (m && m._cssText === void 0) {
        let cssText = _cssFromModuleImports(m),
            t = m.querySelector("template");
        if (t) {
            cssText += cssFromTemplate(t, m.assetpath);
        }
        m._cssText = cssText || null;
    }
    if (!m) {
        console.warn("Could not find style data in module named", moduleId);
    }
    return (m && m._cssText) || "";
}
export function cssFromTemplate(template, baseURI) {
    let cssText = "";
    const e$ = stylesFromTemplate(template, baseURI);
    for (let i = 0, e; i < e$.length; i++) {
        e = e$[i];
        if (e.parentNode) {
            e.parentNode.removeChild(e);
        }
        cssText += e.textContent;
    }
    return cssText;
}
export function cssFromModuleImports(moduleId) {
    let m = importModule(moduleId);
    return m ? _cssFromModuleImports(m) : "";
}
function _cssFromModuleImports(module) {
    let cssText = "",
        styles = _stylesFromModuleImports(module);
    for (let i = 0; i < styles.length; i++) {
        cssText += styles[i].textContent;
    }
    return cssText;
}
export function isPath(path) {
    return 0 <= path.indexOf(".");
}
export function root(path) {
    let dotIndex = path.indexOf(".");
    if (-1 === dotIndex) {
        return path;
    }
    return path.slice(0, dotIndex);
}
export function isAncestor(base, path) {
    return 0 === base.indexOf(path + ".");
}
export function isDescendant(base, path) {
    return 0 === path.indexOf(base + ".");
}
export function translate(base, newBase, path) {
    return newBase + path.slice(base.length);
}
export function matches(base, path) {
    return base === path || isAncestor(base, path) || isDescendant(base, path);
}
export function normalize(path) {
    if (Array.isArray(path)) {
        let parts = [];
        for (let i = 0, args; i < path.length; i++) {
            args = path[i].toString().split(".");
            for (let j = 0; j < args.length; j++) {
                parts.push(args[j]);
            }
        }
        return parts.join(".");
    } else {
        return path;
    }
}
export function split(path) {
    if (Array.isArray(path)) {
        return normalize(path).split(".");
    }
    return path.toString().split(".");
}
export function get(root, path, info) {
    let prop = root,
        parts = split(path);
    for (let i = 0; i < parts.length; i++) {
        if (!prop) {
            return;
        }
        let part = parts[i];
        prop = prop[part];
    }
    if (info) {
        info.path = parts.join(".");
    }
    return prop;
}
export function set(root, path, value) {
    let prop = root,
        parts = split(path),
        last = parts[parts.length - 1];
    if (1 < parts.length) {
        for (let i = 0, part; i < parts.length - 1; i++) {
            part = parts[i];
            prop = prop[part];
            if (!prop) {
                return;
            }
        }
        prop[last] = value;
    } else {
        prop[path] = value;
    }
    return parts.join(".");
}
export const isDeep = isPath;
const caseMap = {},
    DASH_TO_CAMEL = /-[a-z]/g,
    CAMEL_TO_DASH = /([A-Z])/g;
export function dashToCamelCase(dash) {
    return caseMap[dash] || (caseMap[dash] = 0 > dash.indexOf("-") ? dash : dash.replace(DASH_TO_CAMEL, (m) => m[1].toUpperCase()));
}
export function camelToDashCase(camel) {
    return caseMap[camel] || (caseMap[camel] = camel.replace(CAMEL_TO_DASH, "-$1").toLowerCase());
}
let microtaskCurrHandle = 0,
    microtaskLastHandle = 0,
    microtaskCallbacks = [],
    microtaskNodeContent = 0,
    microtaskNode = document.createTextNode("");
new window.MutationObserver(microtaskFlush).observe(microtaskNode, { characterData: !0 });
function microtaskFlush() {
    const len = microtaskCallbacks.length;
    for (let i = 0, cb; i < len; i++) {
        cb = microtaskCallbacks[i];
        if (cb) {
            try {
                cb();
            } catch (e) {
                setTimeout(() => {
                    throw e;
                });
            }
        }
    }
    microtaskCallbacks.splice(0, len);
    microtaskLastHandle += len;
}
const timeOut = {
    after(delay) {
        return {
            run(fn) {
                return window.setTimeout(fn, delay);
            },
            cancel(handle) {
                window.clearTimeout(handle);
            },
        };
    },
    run(fn, delay) {
        return window.setTimeout(fn, delay);
    },
    cancel(handle) {
        window.clearTimeout(handle);
    },
};
export { timeOut };
const animationFrame = {
    run(fn) {
        return window.requestAnimationFrame(fn);
    },
    cancel(handle) {
        window.cancelAnimationFrame(handle);
    },
};
export { animationFrame };
const idlePeriod = {
    run(fn) {
        return window.requestIdleCallback ? window.requestIdleCallback(fn) : window.setTimeout(fn, 16);
    },
    cancel(handle) {
        window.cancelIdleCallback ? window.cancelIdleCallback(handle) : window.clearTimeout(handle);
    },
};
export { idlePeriod };
const microTask = {
    run(callback) {
        microtaskNode.textContent = microtaskNodeContent++;
        microtaskCallbacks.push(callback);
        return microtaskCurrHandle++;
    },
    cancel(handle) {
        const idx = handle - microtaskLastHandle;
        if (0 <= idx) {
            if (!microtaskCallbacks[idx]) {
                throw new Error("invalid async handle: " + handle);
            }
            microtaskCallbacks[idx] = null;
        }
    },
};
export { microTask };
const microtask = microTask;
export const PropertiesChanged = dedupingMixin((superClass) => {
    class PropertiesChanged extends superClass {
        static createProperties(props) {
            const proto = this.prototype;
            for (let prop in props) {
                if (!(prop in proto)) {
                    proto._createPropertyAccessor(prop);
                }
            }
        }
        static attributeNameForProperty(property) {
            return property.toLowerCase();
        }
        static typeForProperty(name) {}
        _createPropertyAccessor(property, readOnly) {
            this._addPropertyToAttributeMap(property);
            if (!this.hasOwnProperty("__dataHasAccessor")) {
                this.__dataHasAccessor = Object.assign({}, this.__dataHasAccessor);
            }
            if (!this.__dataHasAccessor[property]) {
                this.__dataHasAccessor[property] = !0;
                this._definePropertyAccessor(property, readOnly);
            }
        }
        _addPropertyToAttributeMap(property) {
            if (!this.hasOwnProperty("__dataAttributes")) {
                this.__dataAttributes = Object.assign({}, this.__dataAttributes);
            }
            if (!this.__dataAttributes[property]) {
                const attr = this.constructor.attributeNameForProperty(property);
                this.__dataAttributes[attr] = property;
            }
        }
        _definePropertyAccessor(property, readOnly) {
            Object.defineProperty(this, property, {
                get() {
                    return this._getProperty(property);
                },
                set: readOnly
                    ? function () {}
                    : function (value) {
                          this._setProperty(property, value);
                      },
            });
        }
        constructor() {
            super();
            this.__dataEnabled = !1;
            this.__dataReady = !1;
            this.__dataInvalid = !1;
            this.__data = {};
            this.__dataPending = null;
            this.__dataOld = null;
            this.__dataInstanceProps = null;
            this.__serializing = !1;
            this._initializeProperties();
        }
        ready() {
            this.__dataReady = !0;
            this._flushProperties();
        }
        _initializeProperties() {
            for (let p in this.__dataHasAccessor) {
                if (this.hasOwnProperty(p)) {
                    this.__dataInstanceProps = this.__dataInstanceProps || {};
                    this.__dataInstanceProps[p] = this[p];
                    delete this[p];
                }
            }
        }
        _initializeInstanceProperties(props) {
            Object.assign(this, props);
        }
        _setProperty(property, value) {
            if (this._setPendingProperty(property, value)) {
                this._invalidateProperties();
            }
        }
        _getProperty(property) {
            return this.__data[property];
        }
        _setPendingProperty(property, value, ext) {
            let old = this.__data[property],
                changed = this._shouldPropertyChange(property, value, old);
            if (changed) {
                if (!this.__dataPending) {
                    this.__dataPending = {};
                    this.__dataOld = {};
                }
                if (this.__dataOld && !(property in this.__dataOld)) {
                    this.__dataOld[property] = old;
                }
                this.__data[property] = value;
                this.__dataPending[property] = value;
            }
            return changed;
        }
        _invalidateProperties() {
            if (!this.__dataInvalid && this.__dataReady) {
                this.__dataInvalid = !0;
                microtask.run(() => {
                    if (this.__dataInvalid) {
                        this.__dataInvalid = !1;
                        this._flushProperties();
                    }
                });
            }
        }
        _enableProperties() {
            if (!this.__dataEnabled) {
                this.__dataEnabled = !0;
                if (this.__dataInstanceProps) {
                    this._initializeInstanceProperties(this.__dataInstanceProps);
                    this.__dataInstanceProps = null;
                }
                this.ready();
            }
        }
        _flushProperties() {
            const props = this.__data,
                changedProps = this.__dataPending,
                old = this.__dataOld;
            if (this._shouldPropertiesChange(props, changedProps, old)) {
                this.__dataPending = null;
                this.__dataOld = null;
                this._propertiesChanged(props, changedProps, old);
            }
        }
        _shouldPropertiesChange(currentProps, changedProps, oldProps) {
            return !!changedProps;
        }
        _propertiesChanged(currentProps, changedProps, oldProps) {}
        _shouldPropertyChange(property, value, old) {
            return old !== value && (old === old || value === value);
        }
        attributeChangedCallback(name, old, value, namespace) {
            if (old !== value) {
                this._attributeToProperty(name, value);
            }
            if (super.attributeChangedCallback) {
                super.attributeChangedCallback(name, old, value, namespace);
            }
        }
        _attributeToProperty(attribute, value, type) {
            if (!this.__serializing) {
                const map = this.__dataAttributes,
                    property = (map && map[attribute]) || attribute;
                this[property] = this._deserializeValue(value, type || this.constructor.typeForProperty(property));
            }
        }
        _propertyToAttribute(property, attribute, value) {
            this.__serializing = !0;
            value = 3 > arguments.length ? this[property] : value;
            this._valueToNodeAttribute(this, value, attribute || this.constructor.attributeNameForProperty(property));
            this.__serializing = !1;
        }
        _valueToNodeAttribute(node, value, attribute) {
            const str = this._serializeValue(value);
            if (str === void 0) {
                node.removeAttribute(attribute);
            } else {
                node.setAttribute(attribute, str);
            }
        }
        _serializeValue(value) {
            switch (typeof value) {
                case "boolean":
                    return value ? "" : void 0;
                default:
                    return null != value ? value.toString() : void 0;
            }
        }
        _deserializeValue(value, type) {
            switch (type) {
                case Boolean:
                    return null !== value;
                case Number:
                    return +value;
                default:
                    return value;
            }
        }
    }
    return PropertiesChanged;
});
const nativeProperties = {};
let proto = HTMLElement.prototype;
while (proto) {
    let props = Object.getOwnPropertyNames(proto);
    for (let i = 0; i < props.length; i++) {
        nativeProperties[props[i]] = !0;
    }
    proto = Object.getPrototypeOf(proto);
}
function saveAccessorValue(model, property) {
    if (!nativeProperties[property]) {
        let value = model[property];
        if (value !== void 0) {
            if (model.__data) {
                model._setPendingProperty(property, value);
            } else {
                if (!model.__dataProto) {
                    model.__dataProto = {};
                } else if (!model.hasOwnProperty(JSCompiler_renameProperty("__dataProto", model))) {
                    model.__dataProto = Object.create(model.__dataProto);
                }
                model.__dataProto[property] = value;
            }
        }
    }
}
export const PropertyAccessors = dedupingMixin((superClass) => {
    const base = PropertiesChanged(superClass);
    class PropertyAccessors extends base {
        static createPropertiesForAttributes() {
            let a$ = this.observedAttributes;
            for (let i = 0; i < a$.length; i++) {
                this.prototype._createPropertyAccessor(dashToCamelCase(a$[i]));
            }
        }
        static attributeNameForProperty(property) {
            return camelToDashCase(property);
        }
        _initializeProperties() {
            if (this.__dataProto) {
                this._initializeProtoProperties(this.__dataProto);
                this.__dataProto = null;
            }
            super._initializeProperties();
        }
        _initializeProtoProperties(props) {
            for (let p in props) {
                this._setProperty(p, props[p]);
            }
        }
        _ensureAttribute(attribute, value) {
            const el = this;
            if (!el.hasAttribute(attribute)) {
                this._valueToNodeAttribute(el, value, attribute);
            }
        }
        _serializeValue(value) {
            switch (typeof value) {
                case "object":
                    if (value instanceof Date) {
                        return value.toString();
                    } else if (value) {
                        try {
                            return JSON.stringify(value);
                        } catch (x) {
                            return "";
                        }
                    }
                default:
                    return super._serializeValue(value);
            }
        }
        _deserializeValue(value, type) {
            let outValue;
            switch (type) {
                case Object:
                    try {
                        outValue = JSON.parse(value);
                    } catch (x) {
                        outValue = value;
                    }
                    break;
                case Array:
                    try {
                        outValue = JSON.parse(value);
                    } catch (x) {
                        outValue = null;
                        console.warn(`Polymer::Attributes: couldn't decode Array as JSON: ${value}`);
                    }
                    break;
                case Date:
                    outValue = isNaN(value) ? value + "" : +value;
                    outValue = new Date(outValue);
                    break;
                default:
                    outValue = super._deserializeValue(value, type);
                    break;
            }
            return outValue;
        }
        _definePropertyAccessor(property, readOnly) {
            saveAccessorValue(this, property);
            super._definePropertyAccessor(property, readOnly);
        }
        _hasAccessor(property) {
            return this.__dataHasAccessor && this.__dataHasAccessor[property];
        }
        _isPropertyPending(prop) {
            return !!(this.__dataPending && prop in this.__dataPending);
        }
    }
    return PropertyAccessors;
});
const templateExtensions = { "dom-if": !0, "dom-repeat": !0 };
function wrapTemplateExtension(node) {
    let is = node.getAttribute("is");
    if (is && templateExtensions[is]) {
        let t = node;
        t.removeAttribute("is");
        node = t.ownerDocument.createElement(is);
        t.parentNode.replaceChild(node, t);
        node.appendChild(t);
        while (t.attributes.length) {
            node.setAttribute(t.attributes[0].name, t.attributes[0].value);
            t.removeAttribute(t.attributes[0].name);
        }
    }
    return node;
}
function findTemplateNode(root, nodeInfo) {
    let parent = nodeInfo.parentInfo && findTemplateNode(root, nodeInfo.parentInfo);
    if (parent) {
        for (let n = parent.firstChild, i = 0; n; n = n.nextSibling) {
            if (nodeInfo.parentIndex === i++) {
                return n;
            }
        }
    } else {
        return root;
    }
}
function applyIdToMap(inst, map, node, nodeInfo) {
    if (nodeInfo.id) {
        map[nodeInfo.id] = node;
    }
}
function applyEventListener(inst, node, nodeInfo) {
    if (nodeInfo.events && nodeInfo.events.length) {
        for (let j = 0, e$ = nodeInfo.events, e; j < e$.length && (e = e$[j]); j++) {
            inst._addMethodEventListenerToNode(node, e.name, e.value, inst);
        }
    }
}
function applyTemplateContent(inst, node, nodeInfo) {
    if (nodeInfo.templateInfo) {
        node._templateInfo = nodeInfo.templateInfo;
    }
}
function createNodeEventHandler(context, eventName, methodName) {
    context = context._methodHost || context;
    let handler = function (e) {
        if (context[methodName]) {
            context[methodName](e, e.detail);
        } else {
            console.warn("listener method `" + methodName + "` not defined");
        }
    };
    return handler;
}
export const TemplateStamp = dedupingMixin((superClass) => {
    class TemplateStamp extends superClass {
        static _parseTemplate(template, outerTemplateInfo) {
            if (!template._templateInfo) {
                let templateInfo = (template._templateInfo = {});
                templateInfo.nodeInfoList = [];
                templateInfo.stripWhiteSpace = (outerTemplateInfo && outerTemplateInfo.stripWhiteSpace) || template.hasAttribute("strip-whitespace");
                this._parseTemplateContent(template, templateInfo, { parent: null });
            }
            return template._templateInfo;
        }
        static _parseTemplateContent(template, templateInfo, nodeInfo) {
            return this._parseTemplateNode(template.content, templateInfo, nodeInfo);
        }
        static _parseTemplateNode(node, templateInfo, nodeInfo) {
            let noted,
                element = node;
            if ("template" == element.localName && !element.hasAttribute("preserve-content")) {
                noted = this._parseTemplateNestedTemplate(element, templateInfo, nodeInfo) || noted;
            } else if ("slot" === element.localName) {
                templateInfo.hasInsertionPoint = !0;
            }
            if (element.firstChild) {
                noted = this._parseTemplateChildNodes(element, templateInfo, nodeInfo) || noted;
            }
            if (element.hasAttributes && element.hasAttributes()) {
                noted = this._parseTemplateNodeAttributes(element, templateInfo, nodeInfo) || noted;
            }
            return noted;
        }
        static _parseTemplateChildNodes(root, templateInfo, nodeInfo) {
            if ("script" === root.localName || "style" === root.localName) {
                return;
            }
            for (let node = root.firstChild, parentIndex = 0, next; node; node = next) {
                if ("template" == node.localName) {
                    node = wrapTemplateExtension(node);
                }
                next = node.nextSibling;
                if (node.nodeType === Node.TEXT_NODE) {
                    let n = next;
                    while (n && n.nodeType === Node.TEXT_NODE) {
                        node.textContent += n.textContent;
                        next = n.nextSibling;
                        root.removeChild(n);
                        n = next;
                    }
                    if (templateInfo.stripWhiteSpace && !node.textContent.trim()) {
                        root.removeChild(node);
                        continue;
                    }
                }
                let childInfo = { parentIndex, parentInfo: nodeInfo };
                if (this._parseTemplateNode(node, templateInfo, childInfo)) {
                    childInfo.infoIndex = templateInfo.nodeInfoList.push(childInfo) - 1;
                }
                if (node.parentNode) {
                    parentIndex++;
                }
            }
        }
        static _parseTemplateNestedTemplate(node, outerTemplateInfo, nodeInfo) {
            let templateInfo = this._parseTemplate(node, outerTemplateInfo),
                content = (templateInfo.content = node.content.ownerDocument.createDocumentFragment());
            content.appendChild(node.content);
            nodeInfo.templateInfo = templateInfo;
            return !0;
        }
        static _parseTemplateNodeAttributes(node, templateInfo, nodeInfo) {
            let noted = !1,
                attrs = Array.from(node.attributes);
            for (let i = attrs.length - 1, a; (a = attrs[i]); i--) {
                noted = this._parseTemplateNodeAttribute(node, templateInfo, nodeInfo, a.name, a.value) || noted;
            }
            return noted;
        }
        static _parseTemplateNodeAttribute(node, templateInfo, nodeInfo, name, value) {
            if ("on-" === name.slice(0, 3)) {
                node.removeAttribute(name);
                nodeInfo.events = nodeInfo.events || [];
                nodeInfo.events.push({ name: name.slice(3), value });
                return !0;
            } else if ("id" === name) {
                nodeInfo.id = value;
                return !0;
            }
            return !1;
        }
        static _contentForTemplate(template) {
            let templateInfo = template._templateInfo;
            return (templateInfo && templateInfo.content) || template.content;
        }
        _stampTemplate(template) {
            if (template && !template.content && window.HTMLTemplateElement && HTMLTemplateElement.decorate) {
                HTMLTemplateElement.decorate(template);
            }
            let templateInfo = this.constructor._parseTemplate(template),
                nodeInfo = templateInfo.nodeInfoList,
                content = templateInfo.content || template.content,
                dom = document.importNode(content, !0);
            dom.__noInsertionPoint = !templateInfo.hasInsertionPoint;
            let nodes = (dom.nodeList = Array(nodeInfo.length));
            dom.$ = {};
            for (let i = 0, l = nodeInfo.length, info, node; i < l && (info = nodeInfo[i]); i++) {
                node = nodes[i] = findTemplateNode(dom, info);
                applyIdToMap(this, dom.$, node, info);
                applyTemplateContent(this, node, info);
                applyEventListener(this, node, info);
            }
            dom = dom;
            return dom;
        }
        _addMethodEventListenerToNode(node, eventName, methodName, context) {
            context = context || node;
            let handler = createNodeEventHandler(context, eventName, methodName);
            this._addEventListenerToNode(node, eventName, handler);
            return handler;
        }
        _addEventListenerToNode(node, eventName, handler) {
            node.addEventListener(eventName, handler);
        }
        _removeEventListenerFromNode(node, eventName, handler) {
            node.removeEventListener(eventName, handler);
        }
    }
    return TemplateStamp;
});
const TYPES = {
        COMPUTE: "__computeEffects",
        REFLECT: "__reflectEffects",
        NOTIFY: "__notifyEffects",
        PROPAGATE: "__propagateEffects",
        OBSERVE: "__observeEffects",
        READ_ONLY: "__readOnly",
    },
    capitalAttributeRegex = /[A-Z]/;
let DataTrigger, DataEffect, PropertyEffectsType;
function ensureOwnEffectMap(model, type) {
    let effects = model[type];
    if (!effects) {
        effects = model[type] = {};
    } else if (!model.hasOwnProperty(type)) {
        effects = model[type] = Object.create(model[type]);
        for (let p in effects) {
            let protoFx = effects[p],
                instFx = (effects[p] = Array(protoFx.length));
            for (let i = 0; i < protoFx.length; i++) {
                instFx[i] = protoFx[i];
            }
        }
    }
    return effects;
}
function runEffects(inst, effects, props, oldProps, hasPaths, extraArgs) {
    if (effects) {
        let ran = !1,
            id = dedupeId++;
        for (let prop in props) {
            if (runEffectsForProperty(inst, effects, id, prop, props, oldProps, hasPaths, extraArgs)) {
                ran = !0;
            }
        }
        return ran;
    }
    return !1;
}
function runEffectsForProperty(inst, effects, dedupeId, prop, props, oldProps, hasPaths, extraArgs) {
    let ran = !1,
        rootProperty = hasPaths ? root(prop) : prop,
        fxs = effects[rootProperty];
    if (fxs) {
        for (let i = 0, l = fxs.length, fx; i < l && (fx = fxs[i]); i++) {
            if ((!fx.info || fx.info.lastRun !== dedupeId) && (!hasPaths || pathMatchesTrigger(prop, fx.trigger))) {
                if (fx.info) {
                    fx.info.lastRun = dedupeId;
                }
                fx.fn(inst, prop, props, oldProps, fx.info, hasPaths, extraArgs);
                ran = !0;
            }
        }
    }
    return ran;
}
function pathMatchesTrigger(path, trigger) {
    if (trigger) {
        let triggerPath = trigger.name;
        return triggerPath == path || (trigger.structured && isAncestor(triggerPath, path)) || (trigger.wildcard && isDescendant(triggerPath, path));
    } else {
        return !0;
    }
}
function runObserverEffect(inst, property, props, oldProps, info) {
    let fn = "string" === typeof info.method ? inst[info.method] : info.method,
        changedProp = info.property;
    if (fn) {
        fn.call(inst, inst.__data[changedProp], oldProps[changedProp]);
    } else if (!info.dynamicFn) {
        console.warn("observer method `" + info.method + "` not defined");
    }
}
function runNotifyEffects(inst, notifyProps, props, oldProps, hasPaths) {
    let fxs = inst[TYPES.NOTIFY],
        notified,
        id = dedupeId++;
    for (let prop in notifyProps) {
        if (notifyProps[prop]) {
            if (fxs && runEffectsForProperty(inst, fxs, id, prop, props, oldProps, hasPaths)) {
                notified = !0;
            } else if (hasPaths && notifyPath(inst, prop, props)) {
                notified = !0;
            }
        }
    }
    let host;
    if (notified && (host = inst.__dataHost) && host._invalidateProperties) {
        host._invalidateProperties();
    }
}
function notifyPath(inst, path, props) {
    let rootProperty = root(path);
    if (rootProperty !== path) {
        let eventName = camelToDashCase(rootProperty) + "-changed";
        dispatchNotifyEvent(inst, eventName, props[path], path);
        return !0;
    }
    return !1;
}
function dispatchNotifyEvent(inst, eventName, value, path) {
    let detail = { value: value, queueProperty: !0 };
    if (path) {
        detail.path = path;
    }
    inst.dispatchEvent(new CustomEvent(eventName, { detail }));
}
function runNotifyEffect(inst, property, props, oldProps, info, hasPaths) {
    let rootProperty = hasPaths ? root(property) : property,
        path = rootProperty != property ? property : null,
        value = path ? get(inst, path) : inst.__data[property];
    if (path && value === void 0) {
        value = props[property];
    }
    dispatchNotifyEvent(inst, info.eventName, value, path);
}
function handleNotification(event, inst, fromProp, toPath, negate) {
    let value,
        detail = event.detail,
        fromPath = detail && detail.path;
    if (fromPath) {
        toPath = translate(fromProp, toPath, fromPath);
        value = detail && detail.value;
    } else {
        value = event.currentTarget[fromProp];
    }
    value = negate ? !value : value;
    if (!inst[TYPES.READ_ONLY] || !inst[TYPES.READ_ONLY][toPath]) {
        if (inst._setPendingPropertyOrPath(toPath, value, !0, !!fromPath) && (!detail || !detail.queueProperty)) {
            inst._invalidateProperties();
        }
    }
}
function runReflectEffect(inst, property, props, oldProps, info) {
    let value = inst.__data[property];
    if (sanitizeDOMValue) {
        value = sanitizeDOMValue(value, info.attrName, "attribute", inst);
    }
    inst._propertyToAttribute(property, info.attrName, value);
}
function runComputedEffects(inst, changedProps, oldProps, hasPaths) {
    let computeEffects = inst[TYPES.COMPUTE];
    if (computeEffects) {
        let inputProps = changedProps;
        while (runEffects(inst, computeEffects, inputProps, oldProps, hasPaths)) {
            Object.assign(oldProps, inst.__dataOld);
            Object.assign(changedProps, inst.__dataPending);
            inputProps = inst.__dataPending;
            inst.__dataPending = null;
        }
    }
}
function runComputedEffect(inst, property, props, oldProps, info) {
    let result = runMethodEffect(inst, property, props, oldProps, info),
        computedProp = info.methodInfo;
    if (inst.__dataHasAccessor && inst.__dataHasAccessor[computedProp]) {
        inst._setPendingProperty(computedProp, result, !0);
    } else {
        inst[computedProp] = result;
    }
}
function computeLinkedPaths(inst, path, value) {
    let links = inst.__dataLinkedPaths;
    if (links) {
        let link;
        for (let a in links) {
            let b = links[a];
            if (isDescendant(a, path)) {
                link = translate(a, b, path);
                inst._setPendingPropertyOrPath(link, value, !0, !0);
            } else if (isDescendant(b, path)) {
                link = translate(b, a, path);
                inst._setPendingPropertyOrPath(link, value, !0, !0);
            }
        }
    }
}
function addBinding(constructor, templateInfo, nodeInfo, kind, target, parts, literal) {
    nodeInfo.bindings = nodeInfo.bindings || [];
    let binding = { kind, target, parts, literal, isCompound: 1 !== parts.length };
    nodeInfo.bindings.push(binding);
    if (shouldAddListener(binding)) {
        let { event, negate } = binding.parts[0];
        binding.listenerEvent = event || camelToDashCase(target) + "-changed";
        binding.listenerNegate = negate;
    }
    let index = templateInfo.nodeInfoList.length;
    for (let i = 0, part; i < binding.parts.length; i++) {
        part = binding.parts[i];
        part.compoundIndex = i;
        addEffectForBindingPart(constructor, templateInfo, binding, part, index);
    }
}
function addEffectForBindingPart(constructor, templateInfo, binding, part, index) {
    if (!part.literal) {
        if ("attribute" === binding.kind && "-" === binding.target[0]) {
            console.warn("Cannot set attribute " + binding.target + ' because "-" is not a valid attribute starting character');
        } else {
            let dependencies = part.dependencies,
                info = { index, binding, part, evaluator: constructor };
            for (let j = 0, trigger; j < dependencies.length; j++) {
                trigger = dependencies[j];
                if ("string" == typeof trigger) {
                    trigger = parseArg(trigger);
                    trigger.wildcard = !0;
                }
                constructor._addTemplatePropertyEffect(templateInfo, trigger.rootProperty, { fn: runBindingEffect, info, trigger });
            }
        }
    }
}
function runBindingEffect(inst, path, props, oldProps, info, hasPaths, nodeList) {
    let node = nodeList[info.index],
        binding = info.binding,
        part = info.part;
    if (
        hasPaths &&
        part.source &&
        path.length > part.source.length &&
        "property" == binding.kind &&
        !binding.isCompound &&
        node.__isPropertyEffectsClient &&
        node.__dataHasAccessor &&
        node.__dataHasAccessor[binding.target]
    ) {
        let value = props[path];
        path = translate(part.source, binding.target, path);
        if (node._setPendingPropertyOrPath(path, value, !1, !0)) {
            inst._enqueueClient(node);
        }
    } else {
        let value = info.evaluator._evaluateBinding(inst, part, path, props, oldProps, hasPaths);
        applyBindingValue(inst, node, binding, part, value);
    }
}
function applyBindingValue(inst, node, binding, part, value) {
    value = computeBindingValue(node, value, binding, part);
    if (sanitizeDOMValue) {
        value = sanitizeDOMValue(value, binding.target, binding.kind, node);
    }
    if ("attribute" == binding.kind) {
        inst._valueToNodeAttribute(node, value, binding.target);
    } else {
        let prop = binding.target;
        if (node.__isPropertyEffectsClient && node.__dataHasAccessor && node.__dataHasAccessor[prop]) {
            if (!node[TYPES.READ_ONLY] || !node[TYPES.READ_ONLY][prop]) {
                if (node._setPendingProperty(prop, value)) {
                    inst._enqueueClient(node);
                }
            }
        } else {
            inst._setUnmanagedPropertyToNode(node, prop, value);
        }
    }
}
function computeBindingValue(node, value, binding, part) {
    if (binding.isCompound) {
        let storage = node.__dataCompoundStorage[binding.target];
        storage[part.compoundIndex] = value;
        value = storage.join("");
    }
    if ("attribute" !== binding.kind) {
        if ("textContent" === binding.target || ("value" === binding.target && ("input" === node.localName || "textarea" === node.localName))) {
            value = value == void 0 ? "" : value;
        }
    }
    return value;
}
function shouldAddListener(binding) {
    return !!binding.target && "attribute" != binding.kind && "text" != binding.kind && !binding.isCompound && "{" === binding.parts[0].mode;
}
function setupBindings(inst, templateInfo) {
    let { nodeList, nodeInfoList } = templateInfo;
    if (nodeInfoList.length) {
        for (let i = 0; i < nodeInfoList.length; i++) {
            let info = nodeInfoList[i],
                node = nodeList[i],
                bindings = info.bindings;
            if (bindings) {
                for (let i = 0, binding; i < bindings.length; i++) {
                    binding = bindings[i];
                    setupCompoundStorage(node, binding);
                    addNotifyListener(node, inst, binding);
                }
            }
            node.__dataHost = inst;
        }
    }
}
function setupCompoundStorage(node, binding) {
    if (binding.isCompound) {
        let storage = node.__dataCompoundStorage || (node.__dataCompoundStorage = {}),
            parts = binding.parts,
            literals = Array(parts.length);
        for (let j = 0; j < parts.length; j++) {
            literals[j] = parts[j].literal;
        }
        let target = binding.target;
        storage[target] = literals;
        if (binding.literal && "property" == binding.kind) {
            node[target] = binding.literal;
        }
    }
}
function addNotifyListener(node, inst, binding) {
    if (binding.listenerEvent) {
        let part = binding.parts[0];
        node.addEventListener(binding.listenerEvent, function (e) {
            handleNotification(e, inst, binding.target, part.source, part.negate);
        });
    }
}
function createMethodEffect(model, sig, type, effectFn, methodInfo, dynamicFn) {
    dynamicFn = sig.static || (dynamicFn && ("object" !== typeof dynamicFn || dynamicFn[sig.methodName]));
    let info = { methodName: sig.methodName, args: sig.args, methodInfo, dynamicFn };
    for (let i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
        if (!arg.literal) {
            model._addPropertyEffect(arg.rootProperty, type, { fn: effectFn, info: info, trigger: arg });
        }
    }
    if (dynamicFn) {
        model._addPropertyEffect(sig.methodName, type, { fn: effectFn, info: info });
    }
}
function runMethodEffect(inst, property, props, oldProps, info) {
    let context = inst._methodHost || inst,
        fn = context[info.methodName];
    if (fn) {
        let args = inst._marshalArgs(info.args, property, props);
        return fn.apply(context, args);
    } else if (!info.dynamicFn) {
        console.warn("method `" + info.methodName + "` not defined");
    }
}
const emptyArray = [],
    IDENT = "(?:[a-zA-Z_$][\\w.:$\\-*]*)",
    NUMBER = "(?:[-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?)",
    SQUOTE_STRING = "(?:'(?:[^'\\\\]|\\\\.)*')",
    DQUOTE_STRING = '(?:"(?:[^"\\\\]|\\\\.)*")',
    STRING = "(?:" + SQUOTE_STRING + "|" + DQUOTE_STRING + ")",
    ARGUMENT = "(?:(" + IDENT + "|" + NUMBER + "|" + STRING + ")\\s*)",
    ARGUMENTS = "(?:" + ARGUMENT + "(?:,\\s*" + ARGUMENT + ")*)",
    ARGUMENT_LIST = "(?:\\(\\s*(?:" + ARGUMENTS + "?)\\)\\s*)",
    BINDING = "(" + IDENT + "\\s*" + ARGUMENT_LIST + "?)",
    OPEN_BRACKET = "(\\[\\[|{{)" + "\\s*",
    CLOSE_BRACKET = "(?:]]|}})",
    NEGATE = "(?:(!)\\s*)?",
    EXPRESSION = OPEN_BRACKET + NEGATE + BINDING + CLOSE_BRACKET,
    bindingRegex = new RegExp(EXPRESSION, "g");
function literalFromParts(parts) {
    let s = "";
    for (let i = 0, literal; i < parts.length; i++) {
        literal = parts[i].literal;
        s += literal || "";
    }
    return s;
}
function parseMethod(expression) {
    let m = expression.match(/([^\s]+?)\(([\s\S]*)\)/);
    if (m) {
        let methodName = m[1],
            sig = { methodName, static: !0, args: emptyArray };
        if (m[2].trim()) {
            let args = m[2].replace(/\\,/g, "&comma;").split(",");
            return parseArgs(args, sig);
        } else {
            return sig;
        }
    }
    return null;
}
function parseArgs(argList, sig) {
    sig.args = argList.map(function (rawArg) {
        let arg = parseArg(rawArg);
        if (!arg.literal) {
            sig.static = !1;
        }
        return arg;
    }, this);
    return sig;
}
function parseArg(rawArg) {
    let arg = rawArg
            .trim()
            .replace(/&comma;/g, ",")
            .replace(/\\(.)/g, "$1"),
        a = { name: arg, value: "", literal: !1 },
        fc = arg[0];
    if ("-" === fc) {
        fc = arg[1];
    }
    if ("0" <= fc && "9" >= fc) {
        fc = "#";
    }
    switch (fc) {
        case "'":
        case '"':
            a.value = arg.slice(1, -1);
            a.literal = !0;
            break;
        case "#":
            a.value = +arg;
            a.literal = !0;
            break;
    }
    if (!a.literal) {
        a.rootProperty = root(arg);
        a.structured = isPath(arg);
        if (a.structured) {
            a.wildcard = ".*" == arg.slice(-2);
            if (a.wildcard) {
                a.name = arg.slice(0, -2);
            }
        }
    }
    return a;
}
function notifySplices(inst, array, path, splices) {
    let splicesPath = path + ".splices";
    inst.notifyPath(splicesPath, { indexSplices: splices });
    inst.notifyPath(path + ".length", array.length);
    inst.__data[splicesPath] = { indexSplices: null };
}
function notifySplice(inst, array, path, index, addedCount, removed) {
    notifySplices(inst, array, path, [{ index: index, addedCount: addedCount, removed: removed, object: array, type: "splice" }]);
}
function upper(name) {
    return name[0].toUpperCase() + name.substring(1);
}
export const PropertyEffects = dedupingMixin((superClass) => {
    const propertyEffectsBase = TemplateStamp(PropertyAccessors(superClass));
    class PropertyEffects extends propertyEffectsBase {
        constructor() {
            super();
            this.__isPropertyEffectsClient = !0;
            this.__dataCounter = 0;
            this.__dataClientsReady;
            this.__dataPendingClients;
            this.__dataToNotify;
            this.__dataLinkedPaths;
            this.__dataHasPaths;
            this.__dataCompoundStorage;
            this.__dataHost;
            this.__dataTemp;
            this.__dataClientsInitialized;
            this.__data;
            this.__dataPending;
            this.__dataOld;
            this.__computeEffects;
            this.__reflectEffects;
            this.__notifyEffects;
            this.__propagateEffects;
            this.__observeEffects;
            this.__readOnly;
            this.__templateInfo;
        }
        get PROPERTY_EFFECT_TYPES() {
            return TYPES;
        }
        _initializeProperties() {
            super._initializeProperties();
            hostStack.registerHost(this);
            this.__dataClientsReady = !1;
            this.__dataPendingClients = null;
            this.__dataToNotify = null;
            this.__dataLinkedPaths = null;
            this.__dataHasPaths = !1;
            this.__dataCompoundStorage = this.__dataCompoundStorage || null;
            this.__dataHost = this.__dataHost || null;
            this.__dataTemp = {};
            this.__dataClientsInitialized = !1;
        }
        _initializeProtoProperties(props) {
            this.__data = Object.create(props);
            this.__dataPending = Object.create(props);
            this.__dataOld = {};
        }
        _initializeInstanceProperties(props) {
            let readOnly = this[TYPES.READ_ONLY];
            for (let prop in props) {
                if (!readOnly || !readOnly[prop]) {
                    this.__dataPending = this.__dataPending || {};
                    this.__dataOld = this.__dataOld || {};
                    this.__data[prop] = this.__dataPending[prop] = props[prop];
                }
            }
        }
        _addPropertyEffect(property, type, effect) {
            this._createPropertyAccessor(property, type == TYPES.READ_ONLY);
            let effects = ensureOwnEffectMap(this, type)[property];
            if (!effects) {
                effects = this[type][property] = [];
            }
            effects.push(effect);
        }
        _removePropertyEffect(property, type, effect) {
            let effects = ensureOwnEffectMap(this, type)[property],
                idx = effects.indexOf(effect);
            if (0 <= idx) {
                effects.splice(idx, 1);
            }
        }
        _hasPropertyEffect(property, type) {
            let effects = this[type];
            return !!(effects && effects[property]);
        }
        _hasReadOnlyEffect(property) {
            return this._hasPropertyEffect(property, TYPES.READ_ONLY);
        }
        _hasNotifyEffect(property) {
            return this._hasPropertyEffect(property, TYPES.NOTIFY);
        }
        _hasReflectEffect(property) {
            return this._hasPropertyEffect(property, TYPES.REFLECT);
        }
        _hasComputedEffect(property) {
            return this._hasPropertyEffect(property, TYPES.COMPUTE);
        }
        _setPendingPropertyOrPath(path, value, shouldNotify, isPathNotification) {
            if (isPathNotification || root(Array.isArray(path) ? path[0] : path) !== path) {
                if (!isPathNotification) {
                    let old = get(this, path);
                    path = set(this, path, value);
                    if (!path || !super._shouldPropertyChange(path, value, old)) {
                        return !1;
                    }
                }
                this.__dataHasPaths = !0;
                if (this._setPendingProperty(path, value, shouldNotify)) {
                    computeLinkedPaths(this, path, value);
                    return !0;
                }
            } else {
                if (this.__dataHasAccessor && this.__dataHasAccessor[path]) {
                    return this._setPendingProperty(path, value, shouldNotify);
                } else {
                    this[path] = value;
                }
            }
            return !1;
        }
        _setUnmanagedPropertyToNode(node, prop, value) {
            if (value !== node[prop] || "object" == typeof value) {
                node[prop] = value;
            }
        }
        _setPendingProperty(property, value, shouldNotify) {
            let propIsPath = this.__dataHasPaths && isPath(property),
                prevProps = propIsPath ? this.__dataTemp : this.__data;
            if (this._shouldPropertyChange(property, value, prevProps[property])) {
                if (!this.__dataPending) {
                    this.__dataPending = {};
                    this.__dataOld = {};
                }
                if (!(property in this.__dataOld)) {
                    this.__dataOld[property] = this.__data[property];
                }
                if (propIsPath) {
                    this.__dataTemp[property] = value;
                } else {
                    this.__data[property] = value;
                }
                this.__dataPending[property] = value;
                if (propIsPath || (this[TYPES.NOTIFY] && this[TYPES.NOTIFY][property])) {
                    this.__dataToNotify = this.__dataToNotify || {};
                    this.__dataToNotify[property] = shouldNotify;
                }
                return !0;
            }
            return !1;
        }
        _setProperty(property, value) {
            if (this._setPendingProperty(property, value, !0)) {
                this._invalidateProperties();
            }
        }
        _invalidateProperties() {
            if (this.__dataReady) {
                this._flushProperties();
            }
        }
        _enqueueClient(client) {
            this.__dataPendingClients = this.__dataPendingClients || [];
            if (client !== this) {
                this.__dataPendingClients.push(client);
            }
        }
        _flushProperties() {
            this.__dataCounter++;
            super._flushProperties();
            this.__dataCounter--;
        }
        _flushClients() {
            if (!this.__dataClientsReady) {
                this.__dataClientsReady = !0;
                this._readyClients();
                this.__dataReady = !0;
            } else {
                this.__enableOrFlushClients();
            }
        }
        __enableOrFlushClients() {
            let clients = this.__dataPendingClients;
            if (clients) {
                this.__dataPendingClients = null;
                for (let i = 0, client; i < clients.length; i++) {
                    client = clients[i];
                    if (!client.__dataEnabled) {
                        client._enableProperties();
                    } else if (client.__dataPending) {
                        client._flushProperties();
                    }
                }
            }
        }
        _readyClients() {
            this.__enableOrFlushClients();
        }
        setProperties(props, setReadOnly) {
            for (let path in props) {
                if (setReadOnly || !this[TYPES.READ_ONLY] || !this[TYPES.READ_ONLY][path]) {
                    this._setPendingPropertyOrPath(path, props[path], !0);
                }
            }
            this._invalidateProperties();
        }
        ready() {
            this._flushProperties();
            if (!this.__dataClientsReady) {
                this._flushClients();
            }
            if (this.__dataPending) {
                this._flushProperties();
            }
        }
        _propertiesChanged(currentProps, changedProps, oldProps) {
            let hasPaths = this.__dataHasPaths;
            this.__dataHasPaths = !1;
            runComputedEffects(this, changedProps, oldProps, hasPaths);
            let notifyProps = this.__dataToNotify;
            this.__dataToNotify = null;
            this._propagatePropertyChanges(changedProps, oldProps, hasPaths);
            this._flushClients();
            runEffects(this, this[TYPES.REFLECT], changedProps, oldProps, hasPaths);
            runEffects(this, this[TYPES.OBSERVE], changedProps, oldProps, hasPaths);
            if (notifyProps) {
                runNotifyEffects(this, notifyProps, changedProps, oldProps, hasPaths);
            }
            if (1 == this.__dataCounter) {
                this.__dataTemp = {};
            }
        }
        _propagatePropertyChanges(changedProps, oldProps, hasPaths) {
            if (this[TYPES.PROPAGATE]) {
                runEffects(this, this[TYPES.PROPAGATE], changedProps, oldProps, hasPaths);
            }
            let templateInfo = this.__templateInfo;
            while (templateInfo) {
                runEffects(this, templateInfo.propertyEffects, changedProps, oldProps, hasPaths, templateInfo.nodeList);
                templateInfo = templateInfo.nextTemplateInfo;
            }
        }
        linkPaths(to, from) {
            to = normalize(to);
            from = normalize(from);
            this.__dataLinkedPaths = this.__dataLinkedPaths || {};
            this.__dataLinkedPaths[to] = from;
        }
        unlinkPaths(path) {
            path = normalize(path);
            if (this.__dataLinkedPaths) {
                delete this.__dataLinkedPaths[path];
            }
        }
        notifySplices(path, splices) {
            let info = { path: "" },
                array = get(this, path, info);
            notifySplices(this, array, info.path, splices);
        }
        get(path, root) {
            return get(root || this, path);
        }
        set(path, value, root) {
            if (root) {
                set(root, path, value);
            } else {
                if (!this[TYPES.READ_ONLY] || !this[TYPES.READ_ONLY][path]) {
                    if (this._setPendingPropertyOrPath(path, value, !0)) {
                        this._invalidateProperties();
                    }
                }
            }
        }
        push(path, ...items) {
            let info = { path: "" },
                array = get(this, path, info),
                len = array.length,
                ret = array.push(...items);
            if (items.length) {
                notifySplice(this, array, info.path, len, items.length, []);
            }
            return ret;
        }
        pop(path) {
            let info = { path: "" },
                array = get(this, path, info),
                hadLength = !!array.length,
                ret = array.pop();
            if (hadLength) {
                notifySplice(this, array, info.path, array.length, 0, [ret]);
            }
            return ret;
        }
        splice(path, start, deleteCount, ...items) {
            var _Mathfloor = Math.floor;
            let info = { path: "" },
                array = get(this, path, info);
            if (0 > start) {
                start = array.length - _Mathfloor(-start);
            } else if (start) {
                start = _Mathfloor(start);
            }
            let ret;
            if (2 === arguments.length) {
                ret = array.splice(start);
            } else {
                ret = array.splice(start, deleteCount, ...items);
            }
            if (items.length || ret.length) {
                notifySplice(this, array, info.path, start, items.length, ret);
            }
            return ret;
        }
        shift(path) {
            let info = { path: "" },
                array = get(this, path, info),
                hadLength = !!array.length,
                ret = array.shift();
            if (hadLength) {
                notifySplice(this, array, info.path, 0, 0, [ret]);
            }
            return ret;
        }
        unshift(path, ...items) {
            let info = { path: "" },
                array = get(this, path, info),
                ret = array.unshift(...items);
            if (items.length) {
                notifySplice(this, array, info.path, 0, items.length, []);
            }
            return ret;
        }
        notifyPath(path, value) {
            let propPath;
            if (1 == arguments.length) {
                let info = { path: "" };
                value = get(this, path, info);
                propPath = info.path;
            } else if (Array.isArray(path)) {
                propPath = normalize(path);
            } else {
                propPath = path;
            }
            if (this._setPendingPropertyOrPath(propPath, value, !0, !0)) {
                this._invalidateProperties();
            }
        }
        _createReadOnlyProperty(property, protectedSetter) {
            this._addPropertyEffect(property, TYPES.READ_ONLY);
            if (protectedSetter) {
                this["_set" + upper(property)] = function (value) {
                    this._setProperty(property, value);
                };
            }
        }
        _createPropertyObserver(property, method, dynamicFn) {
            let info = { property, method, dynamicFn: !!dynamicFn };
            this._addPropertyEffect(property, TYPES.OBSERVE, { fn: runObserverEffect, info, trigger: { name: property } });
            if (dynamicFn) {
                this._addPropertyEffect(method, TYPES.OBSERVE, { fn: runObserverEffect, info, trigger: { name: method } });
            }
        }
        _createMethodObserver(expression, dynamicFn) {
            let sig = parseMethod(expression);
            if (!sig) {
                throw new Error("Malformed observer expression '" + expression + "'");
            }
            createMethodEffect(this, sig, TYPES.OBSERVE, runMethodEffect, null, dynamicFn);
        }
        _createNotifyingProperty(property) {
            this._addPropertyEffect(property, TYPES.NOTIFY, {
                fn: runNotifyEffect,
                info: { eventName: camelToDashCase(property) + "-changed", property: property },
            });
        }
        _createReflectedProperty(property) {
            let attr = this.constructor.attributeNameForProperty(property);
            if ("-" === attr[0]) {
                console.warn(
                    "Property " +
                        property +
                        " cannot be reflected to attribute " +
                        attr +
                        ' because "-" is not a valid starting attribute name. Use a lowercase first letter for the property instead.'
                );
            } else {
                this._addPropertyEffect(property, TYPES.REFLECT, { fn: runReflectEffect, info: { attrName: attr } });
            }
        }
        _createComputedProperty(property, expression, dynamicFn) {
            let sig = parseMethod(expression);
            if (!sig) {
                throw new Error("Malformed computed expression '" + expression + "'");
            }
            createMethodEffect(this, sig, TYPES.COMPUTE, runComputedEffect, property, dynamicFn);
        }
        _marshalArgs(args, path, props) {
            const data = this.__data;
            let values = [];
            for (let i = 0, l = args.length; i < l; i++) {
                let arg = args[i],
                    name = arg.name,
                    v;
                if (arg.literal) {
                    v = arg.value;
                } else {
                    if (arg.structured) {
                        v = get(data, name);
                        if (v === void 0) {
                            v = props[name];
                        }
                    } else {
                        v = data[name];
                    }
                }
                if (arg.wildcard) {
                    let baseChanged = 0 === name.indexOf(path + "."),
                        matches = 0 === path.indexOf(name) && !baseChanged;
                    values[i] = { path: matches ? path : name, value: matches ? props[path] : v, base: v };
                } else {
                    values[i] = v;
                }
            }
            return values;
        }
        static addPropertyEffect(property, type, effect) {
            this.prototype._addPropertyEffect(property, type, effect);
        }
        static createPropertyObserver(property, method, dynamicFn) {
            this.prototype._createPropertyObserver(property, method, dynamicFn);
        }
        static createMethodObserver(expression, dynamicFn) {
            this.prototype._createMethodObserver(expression, dynamicFn);
        }
        static createNotifyingProperty(property) {
            this.prototype._createNotifyingProperty(property);
        }
        static createReadOnlyProperty(property, protectedSetter) {
            this.prototype._createReadOnlyProperty(property, protectedSetter);
        }
        static createReflectedProperty(property) {
            this.prototype._createReflectedProperty(property);
        }
        static createComputedProperty(property, expression, dynamicFn) {
            this.prototype._createComputedProperty(property, expression, dynamicFn);
        }
        static bindTemplate(template) {
            return this.prototype._bindTemplate(template);
        }
        _bindTemplate(template, instanceBinding) {
            let templateInfo = this.constructor._parseTemplate(template),
                wasPreBound = this.__templateInfo == templateInfo;
            if (!wasPreBound) {
                for (let prop in templateInfo.propertyEffects) {
                    this._createPropertyAccessor(prop);
                }
            }
            if (instanceBinding) {
                templateInfo = Object.create(templateInfo);
                templateInfo.wasPreBound = wasPreBound;
                if (!wasPreBound && this.__templateInfo) {
                    let last = this.__templateInfoLast || this.__templateInfo;
                    this.__templateInfoLast = last.nextTemplateInfo = templateInfo;
                    templateInfo.previousTemplateInfo = last;
                    return templateInfo;
                }
            }
            return (this.__templateInfo = templateInfo);
        }
        static _addTemplatePropertyEffect(templateInfo, prop, effect) {
            let hostProps = (templateInfo.hostProps = templateInfo.hostProps || {});
            hostProps[prop] = !0;
            let effects = (templateInfo.propertyEffects = templateInfo.propertyEffects || {}),
                propEffects = (effects[prop] = effects[prop] || []);
            propEffects.push(effect);
        }
        _stampTemplate(template) {
            hostStack.beginHosting(this);
            let dom = super._stampTemplate(template);
            hostStack.endHosting(this);
            let templateInfo = this._bindTemplate(template, !0);
            templateInfo.nodeList = dom.nodeList;
            if (!templateInfo.wasPreBound) {
                let nodes = (templateInfo.childNodes = []);
                for (let n = dom.firstChild; n; n = n.nextSibling) {
                    nodes.push(n);
                }
            }
            dom.templateInfo = templateInfo;
            setupBindings(this, templateInfo);
            if (this.__dataReady) {
                runEffects(this, templateInfo.propertyEffects, this.__data, null, !1, templateInfo.nodeList);
            }
            return dom;
        }
        _removeBoundDom(dom) {
            let templateInfo = dom.templateInfo;
            if (templateInfo.previousTemplateInfo) {
                templateInfo.previousTemplateInfo.nextTemplateInfo = templateInfo.nextTemplateInfo;
            }
            if (templateInfo.nextTemplateInfo) {
                templateInfo.nextTemplateInfo.previousTemplateInfo = templateInfo.previousTemplateInfo;
            }
            if (this.__templateInfoLast == templateInfo) {
                this.__templateInfoLast = templateInfo.previousTemplateInfo;
            }
            templateInfo.previousTemplateInfo = templateInfo.nextTemplateInfo = null;
            let nodes = templateInfo.childNodes;
            for (let i = 0, node; i < nodes.length; i++) {
                node = nodes[i];
                node.parentNode.removeChild(node);
            }
        }
        static _parseTemplateNode(node, templateInfo, nodeInfo) {
            let noted = super._parseTemplateNode(node, templateInfo, nodeInfo);
            if (node.nodeType === Node.TEXT_NODE) {
                let parts = this._parseBindings(node.textContent, templateInfo);
                if (parts) {
                    node.textContent = literalFromParts(parts) || " ";
                    addBinding(this, templateInfo, nodeInfo, "text", "textContent", parts);
                    noted = !0;
                }
            }
            return noted;
        }
        static _parseTemplateNodeAttribute(node, templateInfo, nodeInfo, name, value) {
            let parts = this._parseBindings(value, templateInfo);
            if (parts) {
                let origName = name,
                    kind = "property";
                if (capitalAttributeRegex.test(name)) {
                    kind = "attribute";
                } else if ("$" == name[name.length - 1]) {
                    name = name.slice(0, -1);
                    kind = "attribute";
                }
                let literal = literalFromParts(parts);
                if (literal && "attribute" == kind) {
                    node.setAttribute(name, literal);
                }
                if ("input" === node.localName && "value" === origName) {
                    node.setAttribute(origName, "");
                }
                node.removeAttribute(origName);
                if ("property" === kind) {
                    name = dashToCamelCase(name);
                }
                addBinding(this, templateInfo, nodeInfo, kind, name, parts, literal);
                return !0;
            } else {
                return super._parseTemplateNodeAttribute(node, templateInfo, nodeInfo, name, value);
            }
        }
        static _parseTemplateNestedTemplate(node, templateInfo, nodeInfo) {
            let noted = super._parseTemplateNestedTemplate(node, templateInfo, nodeInfo),
                hostProps = nodeInfo.templateInfo.hostProps,
                mode = "{";
            for (let source in hostProps) {
                let parts = [{ mode, source, dependencies: [source] }];
                addBinding(this, templateInfo, nodeInfo, "property", "_host_" + source, parts);
            }
            return noted;
        }
        static _parseBindings(text, templateInfo) {
            let parts = [],
                lastIndex = 0,
                m;
            while (null !== (m = bindingRegex.exec(text))) {
                if (m.index > lastIndex) {
                    parts.push({ literal: text.slice(lastIndex, m.index) });
                }
                let mode = m[1][0],
                    negate = !!m[2],
                    source = m[3].trim(),
                    customEvent = !1,
                    notifyEvent = "",
                    colon = -1;
                if ("{" == mode && 0 < (colon = source.indexOf("::"))) {
                    notifyEvent = source.substring(colon + 2);
                    source = source.substring(0, colon);
                    customEvent = !0;
                }
                let signature = parseMethod(source),
                    dependencies = [];
                if (signature) {
                    let { args, methodName } = signature;
                    for (let i = 0, arg; i < args.length; i++) {
                        arg = args[i];
                        if (!arg.literal) {
                            dependencies.push(arg);
                        }
                    }
                    let dynamicFns = templateInfo.dynamicFns;
                    if ((dynamicFns && dynamicFns[methodName]) || signature.static) {
                        dependencies.push(methodName);
                        signature.dynamicFn = !0;
                    }
                } else {
                    dependencies.push(source);
                }
                parts.push({ source, mode, negate, customEvent, signature, dependencies, event: notifyEvent });
                lastIndex = bindingRegex.lastIndex;
            }
            if (lastIndex && lastIndex < text.length) {
                let literal = text.substring(lastIndex);
                if (literal) {
                    parts.push({ literal: literal });
                }
            }
            if (parts.length) {
                return parts;
            } else {
                return null;
            }
        }
        static _evaluateBinding(inst, part, path, props, oldProps, hasPaths) {
            let value;
            if (part.signature) {
                value = runMethodEffect(inst, path, props, oldProps, part.signature);
            } else if (path != part.source) {
                value = get(inst, part.source);
            } else {
                if (hasPaths && isPath(path)) {
                    value = get(inst, path);
                } else {
                    value = inst.__data[path];
                }
            }
            if (part.negate) {
                value = !value;
            }
            return value;
        }
    }
    PropertyEffectsType = PropertyEffects;
    return PropertyEffects;
});
class HostStack {
    constructor() {
        this.stack = [];
    }
    registerHost(inst) {
        if (this.stack.length) {
            let host = this.stack[this.stack.length - 1];
            host._enqueueClient(inst);
        }
    }
    beginHosting(inst) {
        this.stack.push(inst);
    }
    endHosting(inst) {
        let stackLen = this.stack.length;
        if (stackLen && this.stack[stackLen - 1] == inst) {
            this.stack.pop();
        }
    }
}
const hostStack = new HostStack();
function normalizeProperties(props) {
    const output = {};
    for (let p in props) {
        const o = props[p];
        output[p] = "function" === typeof o ? { type: o } : o;
    }
    return output;
}
export const PropertiesMixin = dedupingMixin((superClass) => {
    const base = PropertiesChanged(superClass);
    function superPropertiesClass(constructor) {
        const superCtor = Object.getPrototypeOf(constructor);
        return superCtor.prototype instanceof PropertiesMixin ? superCtor : null;
    }
    function ownProperties(constructor) {
        if (!constructor.hasOwnProperty(JSCompiler_renameProperty("__ownProperties", constructor))) {
            let props = null;
            if (constructor.hasOwnProperty(JSCompiler_renameProperty("properties", constructor))) {
                const properties = constructor.properties;
                if (properties) {
                    props = normalizeProperties(properties);
                }
            }
            constructor.__ownProperties = props;
        }
        return constructor.__ownProperties;
    }
    class PropertiesMixin extends base {
        static get observedAttributes() {
            const props = this._properties;
            return props ? Object.keys(props).map((p) => this.attributeNameForProperty(p)) : [];
        }
        static finalize() {
            if (!this.hasOwnProperty(JSCompiler_renameProperty("__finalized", this))) {
                const superCtor = superPropertiesClass(this);
                if (superCtor) {
                    superCtor.finalize();
                }
                this.__finalized = !0;
                this._finalizeClass();
            }
        }
        static _finalizeClass() {
            const props = ownProperties(this);
            if (props) {
                this.createProperties(props);
            }
        }
        static get _properties() {
            if (!this.hasOwnProperty(JSCompiler_renameProperty("__properties", this))) {
                const superCtor = superPropertiesClass(this);
                this.__properties = Object.assign({}, superCtor && superCtor._properties, ownProperties(this));
            }
            return this.__properties;
        }
        static typeForProperty(name) {
            const info = this._properties[name];
            return info && info.type;
        }
        _initializeProperties() {
            this.constructor.finalize();
            super._initializeProperties();
        }
        connectedCallback() {
            if (super.connectedCallback) {
                super.connectedCallback();
            }
            this._enableProperties();
        }
        disconnectedCallback() {
            if (super.disconnectedCallback) {
                super.disconnectedCallback();
            }
        }
    }
    return PropertiesMixin;
});
export const version = "3.0.5";
export const ElementMixin = dedupingMixin((base) => {
    const polymerElementBase = PropertiesMixin(PropertyEffects(base));
    function propertyDefaults(constructor) {
        if (!constructor.hasOwnProperty(JSCompiler_renameProperty("__propertyDefaults", constructor))) {
            constructor.__propertyDefaults = null;
            let props = constructor._properties;
            for (let p in props) {
                let info = props[p];
                if ("value" in info) {
                    constructor.__propertyDefaults = constructor.__propertyDefaults || {};
                    constructor.__propertyDefaults[p] = info;
                }
            }
        }
        return constructor.__propertyDefaults;
    }
    function ownObservers(constructor) {
        if (!constructor.hasOwnProperty(JSCompiler_renameProperty("__ownObservers", constructor))) {
            constructor.__ownObservers = constructor.hasOwnProperty(JSCompiler_renameProperty("observers", constructor))
                ? constructor.observers
                : null;
        }
        return constructor.__ownObservers;
    }
    function createPropertyFromConfig(proto, name, info, allProps) {
        if (info.computed) {
            info.readOnly = !0;
        }
        if (info.computed && !proto._hasReadOnlyEffect(name)) {
            proto._createComputedProperty(name, info.computed, allProps);
        }
        if (info.readOnly && !proto._hasReadOnlyEffect(name)) {
            proto._createReadOnlyProperty(name, !info.computed);
        }
        if (info.reflectToAttribute && !proto._hasReflectEffect(name)) {
            proto._createReflectedProperty(name);
        }
        if (info.notify && !proto._hasNotifyEffect(name)) {
            proto._createNotifyingProperty(name);
        }
        if (info.observer) {
            proto._createPropertyObserver(name, info.observer, allProps[info.observer]);
        }
        proto._addPropertyToAttributeMap(name);
    }
    function processElementStyles(klass, template, is, baseURI) {
        const templateStyles = template.content.querySelectorAll("style"),
            stylesWithImports = stylesFromTemplate(template),
            linkedStyles = stylesFromModuleImports(is),
            firstTemplateChild = template.content.firstElementChild;
        for (let idx = 0, s; idx < linkedStyles.length; idx++) {
            s = linkedStyles[idx];
            s.textContent = klass._processStyleText(s.textContent, baseURI);
            template.content.insertBefore(s, firstTemplateChild);
        }
        let templateStyleIndex = 0;
        for (let i = 0; i < stylesWithImports.length; i++) {
            let s = stylesWithImports[i],
                templateStyle = templateStyles[templateStyleIndex];
            if (templateStyle !== s) {
                s = s.cloneNode(!0);
                templateStyle.parentNode.insertBefore(s, templateStyle);
            } else {
                templateStyleIndex++;
            }
            s.textContent = klass._processStyleText(s.textContent, baseURI);
        }
        if (window.ShadyCSS) {
            window.ShadyCSS.prepareTemplate(template, is);
        }
    }
    function getTemplateFromDomModule(is) {
        let template = null;
        if (is && (!strictTemplatePolicy || allowTemplateFromDomModule)) {
            template = DomModule.import(is, "template");
            if (strictTemplatePolicy && !template) {
                throw new Error(`strictTemplatePolicy: expecting dom-module or null template for ${is}`);
            }
        }
        return template;
    }
    class PolymerElement extends polymerElementBase {
        static get polymerElementVersion() {
            return version;
        }
        static _finalizeClass() {
            super._finalizeClass();
            if (this.hasOwnProperty(JSCompiler_renameProperty("is", this)) && this.is) {
                register(this.prototype);
            }
            const observers = ownObservers(this);
            if (observers) {
                this.createObservers(observers, this._properties);
            }
            let template = this.template;
            if (template) {
                if ("string" === typeof template) {
                    console.error("template getter must return HTMLTemplateElement");
                    template = null;
                } else {
                    template = template.cloneNode(!0);
                }
            }
            this.prototype._template = template;
        }
        static createProperties(props) {
            for (let p in props) {
                createPropertyFromConfig(this.prototype, p, props[p], props);
            }
        }
        static createObservers(observers, dynamicFns) {
            const proto = this.prototype;
            for (let i = 0; i < observers.length; i++) {
                proto._createMethodObserver(observers[i], dynamicFns);
            }
        }
        static get template() {
            if (!this.hasOwnProperty(JSCompiler_renameProperty("_template", this))) {
                this._template = this.prototype.hasOwnProperty(JSCompiler_renameProperty("_template", this.prototype))
                    ? this.prototype._template
                    : getTemplateFromDomModule(this.is) || Object.getPrototypeOf(this.prototype).constructor.template;
            }
            return this._template;
        }
        static set template(value) {
            this._template = value;
        }
        static get importPath() {
            if (!this.hasOwnProperty(JSCompiler_renameProperty("_importPath", this))) {
                const meta = this.importMeta;
                if (meta) {
                    this._importPath = pathFromUrl(meta.url);
                } else {
                    const module = DomModule.import(this.is);
                    this._importPath = (module && module.assetpath) || Object.getPrototypeOf(this.prototype).constructor.importPath;
                }
            }
            return this._importPath;
        }
        constructor() {
            super();
            this._template;
            this._importPath;
            this.rootPath;
            this.importPath;
            this.root;
            this.$;
        }
        _initializeProperties() {
            instanceCount++;
            this.constructor.finalize();
            this.constructor._finalizeTemplate(this.localName);
            super._initializeProperties();
            this.rootPath = rootPath;
            this.importPath = this.constructor.importPath;
            let p$ = propertyDefaults(this.constructor);
            if (!p$) {
                return;
            }
            for (let p in p$) {
                let info = p$[p];
                if (!this.hasOwnProperty(p)) {
                    let value = "function" == typeof info.value ? info.value.call(this) : info.value;
                    if (this._hasAccessor(p)) {
                        this._setPendingProperty(p, value, !0);
                    } else {
                        this[p] = value;
                    }
                }
            }
        }
        static _processStyleText(cssText, baseURI) {
            return resolveCss(cssText, baseURI);
        }
        static _finalizeTemplate(is) {
            const template = this.prototype._template;
            if (template && !template.__polymerFinalized) {
                template.__polymerFinalized = !0;
                const importPath = this.importPath,
                    baseURI = importPath ? resolveUrl(importPath) : "";
                processElementStyles(this, template, is, baseURI);
                this.prototype._bindTemplate(template);
            }
        }
        connectedCallback() {
            if (window.ShadyCSS && this._template) {
                window.ShadyCSS.styleElement(this);
            }
            super.connectedCallback();
        }
        ready() {
            if (this._template) {
                this.root = this._stampTemplate(this._template);
                this.$ = this.root.$;
            }
            super.ready();
        }
        _readyClients() {
            if (this._template) {
                this.root = this._attachDom(this.root);
            }
            super._readyClients();
        }
        _attachDom(dom) {
            if (this.attachShadow) {
                if (dom) {
                    if (!this.shadowRoot) {
                        this.attachShadow({ mode: "open" });
                    }
                    this.shadowRoot.appendChild(dom);
                    return this.shadowRoot;
                }
                return null;
            } else {
                throw new Error(
                    "ShadowDOM not available. " +
                        "PolymerElement can create dom as children instead of in ShadowDOM by setting `this.root = this;` before `ready`."
                );
            }
        }
        updateStyles(properties) {
            if (window.ShadyCSS) {
                window.ShadyCSS.styleSubtree(this, properties);
            }
        }
        resolveUrl(url, base) {
            if (!base && this.importPath) {
                base = resolveUrl(this.importPath);
            }
            return resolveUrl(url, base);
        }
        static _parseTemplateContent(template, templateInfo, nodeInfo) {
            templateInfo.dynamicFns = templateInfo.dynamicFns || this._properties;
            return super._parseTemplateContent(template, templateInfo, nodeInfo);
        }
    }
    return PolymerElement;
});
export let instanceCount = 0;
export const registrations = [];
function _regLog(prototype) {
    console.log("[" + prototype.is + "]: registered");
}
export function register(prototype) {
    registrations.push(prototype);
}
export function dumpRegistrations() {
    registrations.forEach(_regLog);
}
export const updateStyles = function (props) {
    if (window.ShadyCSS) {
        window.ShadyCSS.styleDocument(props);
    }
};
class LiteralString {
    constructor(string) {
        this.value = string.toString();
    }
    toString() {
        return this.value;
    }
}
function literalValue(value) {
    if (value instanceof LiteralString) {
        return value.value;
    } else {
        throw new Error(`non-literal value passed to Polymer's htmlLiteral function: ${value}`);
    }
}
function htmlValue(value) {
    if (value instanceof HTMLTemplateElement) {
        return value.innerHTML;
    } else if (value instanceof LiteralString) {
        return literalValue(value);
    } else {
        throw new Error(`non-template value passed to Polymer's html function: ${value}`);
    }
}
export const html = function html(strings, ...values) {
    const template = document.createElement("template");
    template.innerHTML = values.reduce((acc, v, idx) => acc + htmlValue(v) + strings[idx + 1], strings[0]);
    return template;
};
export const htmlLiteral = function (strings, ...values) {
    return new LiteralString(values.reduce((acc, v, idx) => acc + literalValue(v) + strings[idx + 1], strings[0]));
};
export const PolymerElement = ElementMixin(HTMLElement);
import "../../mjo-webcomponents/shadycss/entrypoints/apply-shim.js";
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
export function register_gesture(recog) {
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
register_gesture({
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
register_gesture({
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
register_gesture({
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
        klass = class extends base {};
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
// Exportamos polymer a la ventana
//window.Polymer = Polymer;
// Polymer.Animate
(function () {
    var init = function (el, props, settings, fn) {
        if (!el || !props) {
            console.error("[Polymer.Animate] No has pasado el elemento HTML o las propiedades");
            return false;
        }
        if (!el.hasAttribute("aw-poly-animate")) {
            el.setAttribute("aw-poly-animate", el.style.transition);
        }
        if (typeof settings === "function") {
            fn = settings;
            settings = { speed: 400, effect: "ease" };
        }
        var now = Date.now();
        el.setAttribute("aw-poly-animate-now", now);
        settings = _setSettings(settings);
        var newTrans = _setTransition(props, settings);
        el.style.transition = newTrans;
        setTimeout(function () {
            for (var prop in props) {
                if (props.hasOwnProperty(prop)) {
                    el.style[prop] = props[prop];
                }
            }
        }, 10);
        _finishAnimation(el, settings.speed, fn, now);
    };
    var _setSettings = function (settings) {
        return { speed: settings.speed || 400, effect: settings.effect || "ease", delay: settings.delay || 0 };
    };
    var _setTransition = function (props, settings) {
        var newTrans = "";
        var cont = 0;
        for (var prop in props) {
            if (props.hasOwnProperty(prop)) {
                if (cont === 0) {
                    newTrans = prop + " " + settings.speed / 1000 + "s " + settings.effect + " " + settings.delay / 1000 + "s";
                } else {
                    newTrans += ", " + prop + " " + settings.speed / 1000 + "s " + settings.effect + " " + settings.delay / 1000 + "s";
                }
                cont++;
            }
        }
        return newTrans;
    };
    var _finishAnimation = function (el, speed, fn, now) {
        setTimeout(function () {
            var nowAttr = el.getAttribute("aw-poly-animate-now");
            if (now.toString() === nowAttr) {
                var styleTrans = el.getAttribute("aw-poly-animate");
                el.removeAttribute("aw-poly-animate");
                el.removeAttribute("aw-poly-animate-now");
                el.style.transition = styleTrans || "";
                if (typeof fn === "function") {
                    fn.call(this);
                }
            }
        }, speed + 5);
    };
    const Animate = function (el, props, settings = { speed: 400, effect: "ease", delay: 0 }, fn = null) {
        setTimeout(function () {
            init(el, props, settings, fn);
        }, 10);
    };
    Polymer.Animate = Animate;
})();
// Polymer.Colors
(function () {
    const AW_colors = {
        type: function (color) {
            var regHEX = /^\#(([A-Fa-f0-9]){3}|([A-Fa-f0-9]){6})$/;
            var regRGB = /^rgb\((((\d{1,2})|([0-1][0-9]{2})|([0-2][0-4][0-9])|([0-2][0-5][0-5]))\,){2}((\d{1,2})|([0-1][0-9]{2})|([0-2][0-4][0-9])|([0-2][0-5][0-5]))\)$/;
            var regRGBA = /^rgba\((((\d{1,2})|([0-1][0-9]{2})|([0-2][0-4][0-9])|([0-2][0-5][0-5]))\,){3}((0?\.[0-9]{1,2})|(1))\)$/;
            var regHSL = /^hsl\(((\d{1,2})|([0-2][0-9]\d)|([0-3][0-5]\d)|(360))\,((\d{1,2})|(100))\%\,((\d{1,2})|(100))\%\)$/;
            var regHSLA = /^hsla\(((\d{1,2})|([0-2][0-9]\d)|([0-3][0-5]\d)|(360))\,(((\d{1,2})|(100))\%\,){2}((0?\.[0-9]{1,2})|(1))\)$/;
            var text = /[a-zA-z]/;
            if (regHEX.test(color)) {
                return "HEX";
            }
            color = color.toString();
            let newColor = color.replace(new RegExp(" ", "g"), "");
            if (regRGB.test(newColor)) {
                return "RGB";
            }
            if (regRGBA.test(newColor)) {
                return "RGBA";
            }
            if (regHSL.test(newColor)) {
                return "HSL";
            }
            if (regHSLA.test(newColor)) {
                return "HSLA";
            }
            if (text.test(newColor)) {
                return "TEXTO";
            }
            console.error("[Polymer.Colors] El color introducido no tiene un formato válido (hexadecimal, rgb, rgba, hsl, hsla): " + color);
            return false;
        },
        toRGB: function (color) {
            var type = this.type(color);
            if (!type) {
                return false;
            }
            color = color.toString();
            color = color.replace(new RegExp(" ", "g"), "");
            if (type === "RGB") {
                return color;
            }
            if (type === "RGBA") {
                type = "HEX";
                color = this.toHEX(color);
            }
            if (type === "HEX") {
                var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
                color = color.replace(shorthandRegex, function (m, r, g, b) {
                    return r + r + g + g + b + b;
                });
                var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
                if (result) {
                    var rgb = "rgb(" + parseInt(result[1], 16) + "," + parseInt(result[2], 16) + "," + parseInt(result[3], 16) + ")";
                    return rgb;
                } else {
                    return false;
                }
            }
            if (type === "HSL" || type === "HSLA") {
                var sp = color.split("(")[1].split(")")[0];
                sp = sp.split(",");
                var r, g, b;
                var m1, m2, hue;
                var h = parseInt(sp["0"]);
                var s = parseInt(sp["1"]);
                var l = parseInt(sp["2"]);
                s /= 100;
                l /= 100;
                if (s === 0) r = g = b = l * 255;
                else {
                    if (l <= 0.5) {
                        m2 = l * (s + 1);
                    } else {
                        m2 = l + s - l * s;
                    }
                    m1 = l * 2 - m2;
                    hue = h / 360;
                    r = Math.round(this._hue2rgb(m1, m2, hue + 1 / 3));
                    g = Math.round(this._hue2rgb(m1, m2, hue));
                    b = Math.round(this._hue2rgb(m1, m2, hue - 1 / 3));
                }
                return "rgb(" + r + "," + g + "," + b + ")";
            }
        },
        toRGBA: function (color, trans) {
            var type = this.type(color);
            if (!type) {
                return false;
            }
            color = color.toString();
            color = color.replace(new RegExp(" ", "g"), "");
            if (type === "RGBA") {
                return color;
            }
            if (type === "RGB") {
                type = "HEX";
                color = this.toHEX(color);
            }
            if (!trans) {
                trans = 1;
            }
            if (type === "HEX") {
                var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
                color = color.replace(shorthandRegex, function (m, r, g, b) {
                    return r + r + g + g + b + b;
                });
                var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
                if (result) {
                    var rgba = "rgba(" + parseInt(result[1], 16) + "," + parseInt(result[2], 16) + "," + parseInt(result[3], 16) + "," + trans + ")";
                    return rgba;
                } else {
                    return false;
                }
            }
            if (type === "HSL" || type === "HSLA") {
                var sp = color.split("(")[1].split(")")[0];
                sp = sp.split(",");
                var r, g, b;
                var m1, m2, hue;
                var h = parseInt(sp["0"]);
                var s = parseInt(sp["1"]);
                var l = parseInt(sp["2"]);
                s /= 100;
                l /= 100;
                if (s === 0) r = g = b = l * 255;
                else {
                    if (l <= 0.5) {
                        m2 = l * (s + 1);
                    } else {
                        m2 = l + s - l * s;
                    }
                    m1 = l * 2 - m2;
                    hue = h / 360;
                    r = Math.round(this._hue2rgb(m1, m2, hue + 1 / 3));
                    g = Math.round(this._hue2rgb(m1, m2, hue));
                    b = Math.round(this._hue2rgb(m1, m2, hue - 1 / 3));
                }
                return "rgba(" + r + "," + g + "," + b + "," + trans + ")";
            }
        },
        toHSL: function (color) {
            "use strict";
            var type = this.type(color);
            if (!type) {
                return false;
            }
            color = color.toString();
            color = color.replace(new RegExp(" ", "g"), "");
            if (type === "HSL") {
                return color;
            }
            if (type !== "RGB") {
                type = "RGB";
                color = this.toRGB(color);
            }
            var sp = color.split("(")[1].split(")")[0];
            sp = sp.split(",");
            var r = parseInt(sp["0"]);
            var g = parseInt(sp["1"]);
            var b = parseInt(sp["2"]);
            r /= 255;
            g /= 255;
            b /= 255;
            var max = Math.max(r, g, b),
                min = Math.min(r, g, b);
            var l = (max + min) / 2;
            var s = 0;
            var h = 0;
            if (max !== min) {
                if (l < 0.5) {
                    s = (max - min) / (max + min);
                } else {
                    s = (max - min) / (2 - max - min);
                }
                if (r === max) {
                    h = (g - b) / (max - min);
                } else if (g === max) {
                    h = 2 + (b - r) / (max - min);
                } else {
                    h = 4 + (r - g) / (max - min);
                }
            }
            h = Math.round(h * 60);
            s = Math.round(s * 100);
            l = Math.round(l * 100);
            if (h < 0) {
                h *= -1;
                h = 360 - h;
            }
            return "hsl(" + h + "," + s + "%," + l + "%)";
        },
        toHSLA: function (color, trans) {
            "use strict";
            var type = this.type(color);
            if (!type) {
                return false;
            }
            color = color.toString();
            color = color.replace(new RegExp(" ", "g"), "");
            if (type === "HSLA") {
                return color;
            }
            if (type !== "RGB") {
                type = "RGB";
                color = this.toRGB(color);
            }
            if (!trans) {
                trans = 1;
            }
            var sp = color.split("(")[1].split(")")[0];
            sp = sp.split(",");
            var r = parseInt(sp["0"]);
            var g = parseInt(sp["1"]);
            var b = parseInt(sp["2"]);
            r /= 255;
            g /= 255;
            b /= 255;
            var max = Math.max(r, g, b),
                min = Math.min(r, g, b);
            var l = (max + min) / 2;
            var s = 0;
            var h = 0;
            if (max !== min) {
                if (l < 0.5) {
                    s = (max - min) / (max + min);
                } else {
                    s = (max - min) / (2 - max - min);
                }
                if (r === max) {
                    h = (g - b) / (max - min);
                } else if (g === max) {
                    h = 2 + (b - r) / (max - min);
                } else {
                    h = 4 + (r - g) / (max - min);
                }
            }
            h = Math.round(h * 60);
            s = Math.round(s * 100);
            l = Math.round(l * 100);
            if (h < 0) {
                h *= -1;
                h = 360 - h;
            }
            return "hsla(" + Math.round(h) + "," + s + "%," + l + "%," + trans + ")";
        },
        toHEX: function (color) {
            "use strict";
            var type = this.type(color);
            if (!type) {
                return false;
            }
            color = color.toString();
            color = color.replace(new RegExp(" ", "g"), "");
            if (type === "HEX") {
                return color;
            }
            if (type !== "RGB" && type !== "RGBA") {
                color = this.toRGB(color);
            }
            var sp = color.split("(")[1].split(")")[0];
            sp = sp.split(",");
            var r = parseInt(sp["0"]).toString(16);
            r = r.length === 1 ? "0" + r : r;
            var g = parseInt(sp["1"]).toString(16);
            g = g.length === 1 ? "0" + g : g;
            var b = parseInt(sp["2"]).toString(16);
            b = b.length === 1 ? "0" + b : b;
            return "#" + r + "" + g + "" + b;
        },
        contrast: function (color) {
            var type = this.type(color);
            if (!type || type == "TEXTO") {
                return false;
            }
            if (type !== "RGB") {
                color = this.toRGB(color);
            }
            color = color.toString();
            color = color.replace(new RegExp(" ", "g"), "");
            var sp = color.split("(")[1].split(")")[0];
            sp = sp.split(",");
            var r = parseInt(sp["0"]);
            var g = parseInt(sp["1"]);
            var b = parseInt(sp["2"]);
            var brillo = (r * 299 + g * 587 + b * 114) / 1000;
            if (brillo > 125) {
                return "light";
            } else {
                return "dark";
            }
        },
        _hue2rgb: function (m1, m2, hue) {
            var v;
            if (hue < 0) {
                hue += 1;
            } else if (hue > 1) {
                hue -= 1;
            }
            if (6 * hue < 1) {
                v = m1 + (m2 - m1) * hue * 6;
            } else if (2 * hue < 1) {
                v = m2;
            } else if (3 * hue < 2) {
                v = m1 + (m2 - m1) * (2 / 3 - hue) * 6;
            } else {
                v = m1;
            }
            return 255 * v;
        },
    };
    Polymer.Colors = AW_colors;
})();
// Polymer.Slide
(function () {
    const AW_slide = {
        toggle(el, settings = { speed: 400, effect: "ease" }, func = null) {
            if (el.offsetHeight === 0) {
                this.down(el, settings, func);
            } else {
                this.up(el, settings, func);
            }
        },
        up(el, settings = { speed: 400, effect: "ease" }, func = null) {
            if (el.offsetHeight === 0) {
                return false;
            }
            if (el.hasAttribute("aw-slide-animating")) {
                return false;
            } else {
                el.setAttribute("aw-slide-animating", "");
            }
            if (typeof settings === "function") {
                func = settings;
                settings = { speed: 400, effect: "ease" };
            }
            settings = this._setSettings(settings);
            var style = this._getStyles(el);
            var padding = this._getPadding(el);
            var margin = this._getMargin(el);
            var border = this._getBorder(el);
            var height = el.offsetHeight - padding.top - padding.bottom - border.top - border.bottom;
            el.style.overflow = "hidden";
            el.style.height = height + "px";
            el.style.transition = "all " + settings.speed / 1000 + "s " + settings.effect;
            setTimeout(function () {
                el.style.height = "0px";
                el.style.paddingTop = "0px";
                el.style.paddingBottom = "0px";
                el.style.padding = "0px " + padding.right + "px 0px" + padding.left + "px";
                el.style.marginTop = "0px";
                el.style.marginBottom = "0px";
                el.style.margin = "0px " + margin.right + "px 0px" + margin.left + "px";
                el.style.borderTopWidth = "0px";
                el.style.borderBottomWidth = "0px";
            }, 20);
            if (typeof func === "function") {
                var response = { action: "up" };
                setTimeout(function () {
                    func.call(this, response);
                }, settings.speed);
            }
            this._resetElement(el, style, settings.speed, true);
        },
        down(el, settings = { speed: 400, effect: "ease" }, func = null) {
            if (el.offsetHeight > 0) {
                return false;
            }
            if (el.hasAttribute("aw-slide-animating")) {
                return false;
            } else {
                el.setAttribute("aw-slide-animating", "");
            }
            if (typeof settings === "function") {
                func = settings;
                settings = { speed: 400, effect: "ease" };
            }
            settings = this._setSettings(settings);
            var style = this._getStyles(el);
            var padding = this._getPadding(el);
            var margin = this._getMargin(el);
            var border = this._getBorder(el);
            let clon = el.cloneNode(true);
            clon.style.display = "block";
            var anEl = window.getComputedStyle(el, "").width;
            if (anEl === "auto") {
                anEl = "100%";
            }
            var prov = document.createElement("DIV");
            prov.style.position = "absolute";
            prov.style.width = anEl;
            prov.style.zIndex = "-1000";
            prov.style.opacity = "0";
            prov.appendChild(clon);
            if (!el.parentElement) {
                document.body.appendChild(prov);
            } else {
                el.parentElement.appendChild(prov);
            }
            var height = clon.offsetHeight - padding.top - padding.bottom - border.top - border.bottom;
            if (prov.parentNode) {
                prov.parentNode.removeChild(prov);
            }
            el.style.height = "0px";
            el.style.paddingTop = "0px";
            el.style.paddingBottom = "0px";
            el.style.padding = "0px " + padding.right + "px 0px" + padding.left + "px";
            el.style.marginTop = "0px";
            el.style.marginBottom = "0px";
            el.style.margin = "0px " + margin.right + "px 0px" + margin.left + "px";
            el.style.borderTopWidth = "0px";
            el.style.borderBottomWidth = "0px";
            el.style.overflow = "hidden";
            el.style.transition = "all " + settings.speed / 1000 + "s " + settings.effect;
            el.style.display = "block";
            setTimeout(function () {
                el.style.height = height + "px";
                el.style.paddingTop = padding.top + "px";
                el.style.paddingBottom = padding.bottom + "px";
                el.style.padding = padding.top + "px " + padding.right + "px " + padding.bottom + "px " + padding.left + "px";
                el.style.marginTop = margin.top + "px";
                el.style.marginBottom = margin.bottom + "px";
                el.style.margin = margin.top + "px " + margin.right + "px " + margin.bottom + "px " + margin.left + "px";
                el.style.borderTopWidth = border.top + "px";
                el.style.borderBottomWidth = border.bottom + "px";
            }, 10);
            if (typeof func === "function") {
                var response = { action: "down" };
                setTimeout(function () {
                    func.call(this, response);
                }, settings.speed);
            }
            this._resetElement(el, style, settings.speed);
        },
        _setSettings(settings) {
            return { speed: settings.speed || 400, effect: settings.effect || "ease" };
        },
        _getStyles(el) {
            return {
                opacity: el.style.opacity || null,
                height: el.style.height || null,
                paddingTop: el.style.paddingTop || null,
                paddingBottom: el.style.paddingBottom || null,
                padding: el.style.padding || null,
                marginTop: el.style.marginTop || null,
                marginBottom: el.style.marginBottom || null,
                margin: el.style.margin || null,
                borderTopWidth: el.style.borderTopWidth || null,
                borderBottomWidth: el.style.borderBottomWidth || null,
                overflow: el.style.overflow || null,
                transition: el.style.transition || null,
            };
        },
        _resetElement(el, style, speed, hide = false) {
            setTimeout(function () {
                el.removeAttribute("aw-slide-animating");
                el.style.opacity = style.opacity;
                el.style.height = style.height;
                el.style.paddingTop = style.paddingTop;
                el.style.paddingBottom = style.paddingBottom;
                el.style.padding = style.padding;
                el.style.marginTop = style.marginTop;
                el.style.marginBottom = style.marginBottom;
                el.style.margin = style.margin;
                el.style.borderTopWidth = style.borderTopWidth;
                el.style.borderBottomWidth = style.borderBottomWidth;
                el.style.overflow = style.overflow;
                el.style.transition = style.transition;
                if (hide) {
                    el.style.display = "none";
                }
            }, speed + 10);
        },
        _getPadding(el) {
            var paddTop = parseInt(window.getComputedStyle(el, "").paddingTop.replace("px", ""));
            var paddRight = parseInt(window.getComputedStyle(el, "").paddingRight.replace("px", ""));
            var paddBottom = parseInt(window.getComputedStyle(el, "").paddingBottom.replace("px", ""));
            var paddLeft = parseInt(window.getComputedStyle(el, "").paddingLeft.replace("px", ""));
            return { top: paddTop, right: paddRight, bottom: paddBottom, left: paddLeft };
        },
        _getMargin(el) {
            var marginTop = parseInt(window.getComputedStyle(el, "").marginTop.replace("px", ""));
            var marginRight = parseInt(window.getComputedStyle(el, "").marginRight.replace("px", ""));
            var marginBottom = parseInt(window.getComputedStyle(el, "").marginBottom.replace("px", ""));
            var marginLeft = parseInt(window.getComputedStyle(el, "").marginLeft.replace("px", ""));
            return { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft };
        },
        _getBorder(el) {
            var borderTop = parseInt(window.getComputedStyle(el, "").borderTopWidth.replace("px", ""));
            var borderRight = parseInt(window.getComputedStyle(el, "").borderRightWidth.replace("px", ""));
            var borderBottom = parseInt(window.getComputedStyle(el, "").borderBottomWidth.replace("px", ""));
            var borderLeft = parseInt(window.getComputedStyle(el, "").borderLeftWidth.replace("px", ""));
            return { top: borderTop, right: borderRight, bottom: borderBottom, left: borderLeft };
        },
    };
    Polymer.Slide = AW_slide;
})();
// Polymer.Fade
(function () {
    const Fade = {
        toggle(el, settings = { speed: 400, effect: "ease" }, func = null) {
            if (el.offsetHeight === 0) {
                this.in(el, settings, func);
            } else {
                this.out(el, settings, func);
            }
        },
        in(el, settings = { speed: 400, effect: "ease" }, func = null) {
            if (el.offsetHeight > 0) {
                return false;
            }
            if (el.hasAttribute("aw-fade-animating")) {
                return false;
            } else {
                el.setAttribute("aw-fade-animating", "");
            }
            if (typeof settings === "function") {
                func = settings;
                settings = { speed: 400, effect: "ease" };
            }
            settings = this._setSettings(settings);
            var style = this._getStyles(el);
            el.style.opacity = "0";
            if (el.style.opacity && el.style.opacity !== "1") {
                el.style.opacity = el.style.opacity;
            }
            el.style.transition = "all " + settings.speed / 1000 + "s " + settings.effect;
            el.style.display = "block";
            setTimeout(function () {
                el.style.opacity = "1";
            }, 10);
            if (typeof func === "function") {
                var response = { action: "in" };
                setTimeout(function () {
                    func.call(this, response);
                }, settings.speed);
            }
            this._resetElement(el, style, settings.speed);
        },
        out(el, settings = { speed: 400, effect: "ease" }, func = null) {
            if (el.offsetHeight === 0) {
                return false;
            }
            if (el.hasAttribute("aw-fade-animating")) {
                return false;
            } else {
                el.setAttribute("aw-fade-animating", "");
            }
            if (typeof settings === "function") {
                func = settings;
                settings = { speed: 400, effect: "ease" };
            }
            settings = this._setSettings(settings);
            var style = this._getStyles(el);
            el.style.opacity = "1";
            if (el.style.opacity && el.style.opacity !== "0") {
                el.style.opacity = el.style.opacity;
            }
            el.style.transition = "all " + settings.speed / 1000 + "s " + settings.effect;
            el.style.display = "block";
            setTimeout(function () {
                el.style.opacity = "0";
            }, 10);
            if (typeof func === "function") {
                var response = { action: "out" };
                setTimeout(function () {
                    func.call(this, response);
                }, settings.speed);
            }
            this._resetElement(el, style, settings.speed, true);
        },
        _setSettings(settings) {
            return { speed: settings.speed || 400, effect: settings.effect || "ease" };
        },
        _getStyles(el) {
            return { opacity: el.style.opacity || null, transition: el.style.transition || null };
        },
        _resetElement(el, style, speed, hide = false) {
            setTimeout(function () {
                el.removeAttribute("aw-fade-animating");
                el.style.opacity = style.opacity;
                el.style.transition = style.transition;
                if (hide) {
                    el.style.display = "none";
                }
            }, speed + 10);
        },
    };
    Polymer.Fade = Fade;
})();
// Polymer.ListenDom
(function () {
    const ListenDom = {
        init() {
            this.registers = [];
            document.addEventListener(
                "DOMNodeInserted",
                function (ev) {
                    this._reloadEvents();
                }.bind(this)
            );
            document.addEventListener(
                "DOMNodeRemoved",
                function (ev) {
                    this._reloadEvents();
                }.bind(this)
            );
        },
        on(event, selector, func) {
            this._registerElements(event, selector, func);
        },
        off(event, selector, func) {
            this._unregisterElements(event, selector, func);
        },
        _registerElements(event, selector, func) {
            var exists = false;
            for (var i = 0; i < this.registers.length; i++) {
                var register = this.registers[i];
                if (register.event === event && register.selector === selector && register.func === func) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                var els = document.querySelectorAll(selector);
                var isListend = false;
                for (var o = 0; o < els.length; o++) {
                    isListend = true;
                    els[o].addEventListener(event, func);
                    if (!els[o].hasAttribute("aw-listen-dom")) {
                        els[o].setAttribute("aw-listen-dom", event);
                    } else {
                        var attr = els[o].getAttribute("aw-listen-dom");
                        els[o].setAttribute("aw-listen-dom", event + "|" + attr);
                    }
                }
                this.registers.push({ els: els, event: event, selector: selector, func: func, isListened: isListend });
            }
        },
        _unregisterElements(event, selector, func) {
            var exists = false;
            var key = [];
            for (var i = 0; i < this.registers.length; i++) {
                var register = this.registers[i];
                if (register.event === event && register.selector === selector) {
                    if (!func || register.func === func) {
                        exists = true;
                        key.push(i);
                        if (register.func === func) {
                            break;
                        }
                    }
                }
            }
            if (exists) {
                for (var i = 0; i < key.length; i++) {
                    var k = key[i];
                    var els = document.querySelectorAll(this.registers[k].selector);
                    for (var o = 0; o < els.length; o++) {
                        els[o].removeEventListener(event, this.registers[k].func);
                    }
                    delete this.registers[k];
                }
                this._reajustRegisters();
            }
        },
        _reloadEvents() {
            this._removeEvents();
            for (var i = 0; i < this.registers.length; i++) {
                var els = document.querySelectorAll(this.registers[i].selector);
                if (els.length > 0) {
                    for (var o = 0; o < els.length; o++) {
                        if (!els[o].hasAttribute("aw-listen-dom")) {
                            els[o].addEventListener(this.registers[i].event, this.registers[i].func);
                            els[o].setAttribute("aw-listen-dom", this.registers[i].event);
                        } else {
                            var attr = els[o].getAttribute("aw-listen-dom");
                            var sAttrs = attr.split("|");
                            var exists = false;
                            for (var z = 0; z < attr.length; z++) {
                                if (sAttrs[z] === this.registers[i].event) {
                                    exists = true;
                                    break;
                                }
                            }
                            if (!exists) {
                                els[o].addEventListener(this.registers[i].event, this.registers[i].func);
                                els[o].setAttribute("aw-listen-dom", attr + "|" + this.registers[i].event);
                            }
                        }
                    }
                    this.registers[i].isListened = true;
                    this.registers[i].els = els;
                }
            }
        },
        _removeEvents() {
            for (var i = 0; i < this.registers.length; i++) {
                for (var o = 0; o < this.registers[i].els.length; o++) {
                    var el = this.registers[i].els[o];
                    if (!document.body.contains(el)) {
                        el.removeEventListener(this.registers[i].event, this.registers[i].func);
                    }
                }
            }
        },
        _reajustRegisters() {
            var newArray = [];
            for (var i = 0; i < this.registers.length; i++) {
                if (this.registers[i]) {
                    newArray.push(this.registers[i]);
                }
            }
            this.registers = newArray;
        },
    };
    Polymer.ListenDom = ListenDom;
    Polymer.ListenDom.init();
})();
// Polymer.Parallax
(() => {
    const Parallax = {
        init(el, settings = null) {
            settings = this._compatibilty(settings);
            settings = this._extends([this._defaults(), settings]);
            settings = this._setToppers(el, settings);
            if ("background" == settings.property) {
                settings.direction = "down";
                var bgPrep = this._prepareBackground(el, settings);
                el = bgPrep.el;
                settings = bgPrep.settings;
            }
            this._register(el, settings);
        },
        _compatibilty(settings) {
            if (!settings) {
                return null;
            }
            var newSettings = {};
            if (settings.cssProperty) {
                if ("background-position" == settings.cssProperty) {
                    newSettings.property = "background";
                } else {
                    newSettings.property = "element";
                }
            }
            if (settings.parallaxDir) {
                newSettings.direction = settings.parallaxDir;
            }
            if (settings.topLimit || settings.topEnd) {
                newSettings.topEnd = null;
            }
            if (settings.property) {
                newSettings.property = settings.property;
            }
            if (settings.direction) {
                newSettings.direction = settings.direction;
            }
            if (settings.speed) {
                newSettings.speed = settings.speed;
            }
            if (settings.topStart) {
                newSettings.topStart = null;
            }
            if (settings.topEnd) {
                newSettings.topEnd = settings.topEnd;
            }
            if (settings.bgColor) {
                newSettings.bgColor = settings.bgColor;
            }
            return newSettings;
        },
        _defaults() {
            return { property: "background", direction: "down", speed: 5, bgColor: "transparent", topStart: null, topEnd: null, initialTop: 0 };
        },
        _extends(objs) {
            var newObj = {};
            for (let i = 0; i < objs.length; i++) {
                for (var prop in objs[i]) {
                    newObj[prop] = objs[i][prop];
                }
            }
            return newObj;
        },
        _prepareBackground(el, settings) {
            var compStyles = window.getComputedStyle(el, null),
                image = compStyles.getPropertyValue("background-image"),
                position = compStyles.getPropertyValue("background-position"),
                repeat = compStyles.getPropertyValue("background-repeat"),
                size = compStyles.getPropertyValue("background-size"),
                attachment = compStyles.getPropertyValue("background-attachment"),
                adjusts = { top: 0, left: 0, width: "100%", height: "100%" };
            if (el.offsetHeight < window.innerHeight / 2) {
                var percent = 100 - (100 * el.offsetHeight) / (window.innerHeight / 2) + 10;
                adjusts.top = "-" + percent / 2 + "%";
                adjusts.left = "-" + percent / 2 + "%";
                adjusts.width = 100 + percent + "%";
                adjusts.height = 100 + percent + "%";
                settings.initialTop -= 2 * ((percent * el.offsetHeight) / 100);
            }
            var div = document.createElement("DIV");
            div.style.position = "absolute";
            div.style.top = adjusts.top;
            div.style.left = adjusts.left;
            div.style.width = adjusts.width;
            div.style.height = adjusts.height;
            div.style.backgroundImage = image ? image : "";
            div.style.backgroundPosition = position ? position : "";
            div.style.backgroundRepeat = repeat ? repeat : "";
            div.style.backgroundSize = size ? size : "";
            div.style.backgroundAttachment = attachment ? attachment : "";
            if (el.children[0]) {
                el.insertBefore(div, el.children[0]);
            } else {
                el.append(div);
            }
            el.style.background = settings.bgColor;
            el.style.overflow = "hidden";
            return { el: div, settings: settings };
        },
        _setToppers(el, settings) {
            if (!settings.topStart) {
                settings.topStart = 0;
                if ("background" == settings.property) {
                    var diff = 0;
                    if (el.getBoundingClientRect().top + window.scrollY > window.innerHeight) {
                        settings.topStart = el.getBoundingClientRect().top + window.scrollY - window.innerHeight;
                        diff = el.getBoundingClientRect().top + window.scrollY - window.innerHeight;
                    }
                    if (0 < el.getBoundingClientRect().top + window.scrollY) {
                        settings.initialTop = el.getBoundingClientRect().top + window.scrollY - diff;
                    }
                } else {
                    var diff = 0,
                        parent = el.parentElement;
                    if (parent.getBoundingClientRect().top + window.scrollY > window.innerHeight) {
                        settings.topStart = parent.getBoundingClientRect().top + window.scrollY - window.innerHeight;
                        if ("down" == settings.direction) {
                            diff = parent.getBoundingClientRect().top + window.scrollY - window.innerHeight;
                        } else {
                            diff = parent.getBoundingClientRect().top + window.scrollY - window.innerHeight - 126;
                        }
                    }
                    if (0 < parent.getBoundingClientRect().top + window.scrollY) {
                        if ("down" == settings.direction) {
                            settings.initialTop = parent.getBoundingClientRect().top + window.scrollY - diff;
                        } else {
                            settings.initialTop = parent.getBoundingClientRect().top + window.scrollY + diff;
                        }
                    }
                }
            }
            if (!settings.topEnd) {
                if ("background" == settings.property) {
                    settings.topEnd = el.getBoundingClientRect().top + window.scrollY + el.offsetHeight;
                } else {
                    settings.topEnd = el.parentElement.getBoundingClientRect().top + window.scrollY + el.parentElement.offsetHeight;
                }
            }
            return settings;
        },
        _register(el, settings) {
            if (el.hasAttribute("aw-parallax")) {
                return !1;
            } else {
                el.setAttribute("aw-parallax", "");
            }
            var component = { el: el, settings: settings, animated: !1, scrollHandler: null };
            if ("onscroll" in document.documentElement) {
                component.scrollHandler = () => {
                    this._scrolling(component);
                };
                this._reset(component);
                this._scrolling(component);
                window.addEventListener("scroll", component.scrollHandler);
            }
        },
        _scrolling(component) {
            if (!document.body.contains(component.el)) {
                this._destroy(component);
                return !1;
            }
            if (window.scrollY <= component.settings.topStart) {
                if (component.animated) {
                    this._reset(component);
                }
                return !1;
            }
            if (component.settings.topEnd && window.scrollY > component.settings.topEnd) {
                return !1;
            }
            component.animated = !0;
            window.requestAnimationFrame(() => {
                this._animate(component);
            });
        },
        _animate(component) {
            if ("down" == component.settings.direction) {
                component.el.style.transform =
                    "translateY(" + (window.scrollY - component.settings.initialTop - component.settings.topStart) / component.settings.speed + "px)";
            }
            if ("up" == component.settings.direction) {
                component.el.style.transform =
                    "translateY(" +
                    -((window.scrollY - component.settings.initialTop - component.settings.topStart) / component.settings.speed) +
                    "px)";
            }
        },
        _reset(component) {
            component.animated = !1;
            if ("down" == component.settings.direction) {
                component.el.style.transform =
                    "translateY(" + (component.settings.topStart - component.settings.initialTop) / component.settings.speed + "px)";
            } else {
                component.el.style.transform =
                    "translateY(" + (component.settings.topStart + component.settings.initialTop) / component.settings.speed + "px)";
            }
        },
        _destroy(component) {
            window.removeEventListener("scroll", component.scrollHandler);
            return !1;
        },
    };
    Polymer.Parallax = Parallax;
})();
// Polymer.scroll
(function () {
    const Scroll = {
        to(to, duration = 500, element = window) {
            var start = element === window ? window.scrollY : element.scrollTop,
                change = to - start,
                currentTime = 0,
                increment = 20;
            this._animate(element, duration, start, change, currentTime, increment);
        },
        toElement(el, margin = 0, duration = 500, element = window) {
            var scrollTop = element === window ? window.scrollY : element.scrollTop;
            var top = el.getBoundingClientRect().top + scrollTop + margin;
            var start = element === window ? window.scrollY : element.scrollTop,
                change = top - start,
                currentTime = 0,
                increment = 20;
            this._animate(element, duration, start, change, currentTime, increment);
        },
        top(duration, element = window) {
            var start = element === window ? window.scrollY : element.scrollTop,
                change = 0 - start,
                currentTime = 0,
                increment = 20;
            this._animate(element, duration, start, change, currentTime, increment);
        },
        bottom(duration, element = window) {
            var start = element === window ? window.scrollY : element.scrollTop,
                change = element.offsetHeight - start,
                currentTime = 0,
                increment = 20;
            this._animate(element, duration, start, change, currentTime, increment);
        },
        _animate(element, duration, start, change, currentTime, increment) {
            var html = document.querySelector("html");
            currentTime += increment;
            var val = this._easeInOutQuad(currentTime, start, change, duration);
            if (element === window) {
                window.scroll(0, val);
            } else {
                element.scrollTop = val;
            }
            if (currentTime < duration) {
                setTimeout(
                    function () {
                        this._animate(element, duration, start, change, currentTime, increment);
                    }.bind(this),
                    increment
                );
            }
        },
        _easeInOutQuad(t, b, c, d) {
            t /= d / 2;
            if (t < 1) {
                return (c / 2) * t * t + b;
            }
            t--;
            return (-c / 2) * (t * (t - 2) - 1) + b;
        },
    };
    Polymer.scroll = Scroll;
})();
// Polymer.SliderElement
(function () {
    const SliderElement = {
        defaults() {
            return { headFixHeight: 0, footerFixHeight: 0, minWidth: null, marginStart: 20 };
        },
        _extend(objs) {
            var newObj = {};
            for (let i = 0; i < objs.length; i++) {
                for (var prop in objs[i]) {
                    newObj[prop] = objs[i][prop];
                }
            }
            return newObj;
        },
        init(el, settings, mainSlider = window) {
            this.register(el, settings, mainSlider);
        },
        register(el, settings, mainSlider) {
            if (el.hasAttribute("aw-sliderElement")) {
                return !1;
            }
            el.setAttribute("aw-sliderElement", "");
            var component = {
                element: el,
                elHeight: el.offsetHeight,
                elWidth: el.offsetWidth,
                contenedor: el.parentElement,
                settings: this._extend([this.defaults(), settings]),
                elStyle: null,
                topWinAnt: 0,
                scrollHandler: null,
            };
            if (component.element.getAttribute("style")) {
                component.elStyle = component.element.getAttribute("style");
            }
            component.scrollHandler = function () {
                this.scrolling(component, mainSlider);
            }.bind(this);
            this.scrolling(component, mainSlider);
            mainSlider.addEventListener("scroll", component.scrollHandler);
        },
        scrolling(component, mainSlider) {
            if (!document.body.contains(component.element)) {
                this.destroy(component, mainSlider);
                return !1;
            }
            if (component.elHeight !== component.element.offsetHeight) {
                component.elHeight = component.element.offsetHeight;
            }
            const marginTop = component.settings.headFixHeight + component.settings.marginStart,
                height = document.documentElement.clientHeight - marginTop - component.settings.footerFixHeight,
                topWindow = mainSlider == window ? window.scrollY + marginTop : mainSlider.scrollTop + marginTop,
                topContenedor =
                    mainSlider == window
                        ? window.scrollY + component.contenedor.getBoundingClientRect().top
                        : mainSlider.scrollTop + component.contenedor.getBoundingClientRect().top,
                contPaddingTop = parseInt(window.getComputedStyle(component.contenedor, "").paddingTop.replace("px", "")),
                contBorder =
                    parseInt(window.getComputedStyle(component.contenedor, "").borderTopWidth.replace("px", "")) +
                    parseInt(window.getComputedStyle(component.contenedor, "").borderBottomWidth.replace("px", ""));
            if (this.condition(component)) {
                var diferencia = null,
                    topeSup = 0,
                    topeInf = 0,
                    topElement = 0;
                if (height > component.elHeight) {
                    topeSup = topContenedor + contPaddingTop;
                    topeInf = topeSup + component.contenedor.offsetHeight - component.elHeight - contPaddingTop;
                    if ("baja" === this.getDirection(component, mainSlider)) {
                        if (topWindow > topeSup && "fixed" !== component.element.style.position) {
                            component.element.style.position = "fixed";
                            component.element.style.top = marginTop + "px";
                            component.element.style.width = this.getWidth(component) + "px";
                        }
                        if (topWindow > topeInf && "fixed" === component.element.style.position) {
                            component.element.style.position = "absolute";
                            component.element.style.top = topeInf - topeSup + contPaddingTop - contBorder + "px";
                            component.element.style.width = this.getWidth(component) + "px";
                        }
                    }
                    if ("sube" === this.getDirection(component, mainSlider)) {
                        if (topWindow <= topeSup && "relative" !== component.element.style.position) {
                            this.resetElement(component);
                        }
                        if (topWindow <= topeInf && "absolute" === component.element.style.position) {
                            component.element.style.position = "fixed";
                            component.element.style.top = marginTop + "px";
                            component.element.style.width = this.getWidth(component) + "px";
                        }
                    }
                }
                if (height < component.elHeight) {
                    diferencia = component.elHeight - height;
                    topeSup = topContenedor + diferencia + component.settings.marginStart;
                    topeInf = topeSup + component.contenedor.offsetHeight - component.elHeight;
                    topElement = this.getTop(component);
                    if ("baja" === this.getDirection(component, mainSlider)) {
                        if (topElement === marginTop && "fixed" === component.element.style.position) {
                            component.element.style.position = "absolute";
                            component.element.style.top = topWindow - topContenedor + "px";
                            component.element.style.width = this.getWidth(component) + "px";
                        }
                        if (topWindow > topeSup + contPaddingTop + this.getTop(component) && "fixed" !== component.element.style.position) {
                            component.element.style.position = "fixed";
                            component.element.style.top = marginTop - diferencia - component.settings.marginStart + "px";
                            component.element.style.width = this.getWidth(component) + "px";
                        }
                        if (topWindow > topeInf - contPaddingTop && "fixed" === component.element.style.position) {
                            component.element.style.position = "absolute";
                            component.element.style.top = topeInf - topeSup - contPaddingTop - contBorder + "px";
                            component.element.style.width = this.getWidth(component) + "px";
                        }
                    }
                    if ("sube" === this.getDirection(component, mainSlider)) {
                        if (topElement !== marginTop && "fixed" === component.element.style.position) {
                            component.element.style.position = "absolute";
                            component.element.style.top = topWindow - topContenedor - diferencia + "px";
                            component.element.style.width = this.getWidth(component) + "px";
                        }
                        if (topWindow < topContenedor + topElement && "absolute" === component.element.style.position) {
                            component.element.style.position = "fixed";
                            component.element.style.top = marginTop + "px";
                            component.element.style.width = this.getWidth(component) + "px";
                        }
                        if (topWindow < topContenedor + contPaddingTop && "relative" !== component.element.style.position) {
                            this.resetElement(component);
                        }
                    }
                }
            }
            if (!this.condition(component)) {
                this.resetElement(component);
            }
            component.topWinAnt = topWindow;
        },
        condition(component) {
            if (component.settings.minWidth && component.settings.minWidth > document.documentElement.clientWidth) {
                return !1;
            }
            if (component.contenedor.offsetHeight <= component.elHeight) {
                return !1;
            }
            return !0;
        },
        getTop(component) {
            var top = window.getComputedStyle(component.element, "").top;
            if ("auto" === top) {
                top = 0;
            } else {
                top = parseInt(top.replace("px", ""));
            }
            return top;
        },
        getWidth(component) {
            const paddingLeft = parseInt(window.getComputedStyle(component.element, "").paddingLeft.replace("px", "")),
                paddingRight = parseInt(window.getComputedStyle(component.element, "").paddingRight.replace("px", "")),
                marginLeft = parseInt(window.getComputedStyle(component.element, "").marginLeft.replace("px", "")),
                marginRight = parseInt(window.getComputedStyle(component.element, "").marginRight.replace("px", "")),
                borderLeft = parseInt(window.getComputedStyle(component.element, "").borderLeftWidth.replace("px", "")),
                borderRight = parseInt(window.getComputedStyle(component.element, "").borderRightWidth.replace("px", ""));
            var resta = paddingLeft + paddingRight + marginLeft + marginRight + borderLeft + borderRight;
            return component.elWidth;
        },
        getDirection(component, mainSlider) {
            let scrollTop = window == mainSlider ? window.scrollY : mainSlider.scrollTop;
            var topWindow = scrollTop + component.settings.headFixHeight + component.settings.marginStart;
            if (component.topWinAnt < topWindow) {
                return "baja";
            } else {
                return "sube";
            }
        },
        resetElement(component) {
            if (component.elStyle) {
                component.element.setAttribute("style", component.elStyle);
            } else {
                component.element.removeAttribute("style");
            }
        },
        destroy(component, mainSlider) {
            mainSlider.removeEventListener("scroll", component.scrollHandler);
            return !1;
        },
    };
    Polymer.SliderElement = SliderElement;
})();
// Polymer.TextareaAdjust
(function () {
    const TextareaAdjust = {
        defaults() {
            return { defHeight: null, height: null, padding: null, maxHeight: null };
        },
        _extend(objs) {
            var newObj = {};
            for (let i = 0; i < objs.length; i++) {
                for (var prop in objs[i]) {
                    newObj[prop] = objs[i][prop];
                }
            }
            return newObj;
        },
        init(el, settings) {
            this.register(el, settings);
        },
        register(el, settings) {
            var element = { textarea: el, settings: this._extend([this.defaults(), settings]), eventHandler: null, eventRemove: null };
            element.settings.defHeight = window.getComputedStyle(element.textarea, null).height;
            element.settings.height = element.textarea.offsetHeight;
            element.settings.padding = this.getPadding(element.textarea);
            element.textarea.style.overflow = "hidden";
            element.textarea.style.transition = "none";
            element.eventHandler = () => {
                this.adaptar(element);
            };
            element.eventRemove = (ev) => {
                this._remove(element, ev);
            };
            element.textarea.addEventListener("keyup", element.eventHandler);
            element.textarea.addEventListener("focus", element.eventHandler);
            let awTextarea = null;
            if (
                "LABEL" == element.textarea.parentElement.tagName &&
                "container" == element.textarea.parentElement.parentElement.id &&
                element.textarea.parentElement.parentElement.classList.contains("container") &&
                !element.textarea.parentElement.parentElement.parentElement
            ) {
                if (element.textarea.id) {
                    if (document.querySelector("aw-textarea-df[id=" + element.textarea.id + "]")) {
                        awTextarea = document.querySelector("aw-textarea-df[id=" + element.textarea.id + "]");
                    } else {
                        awTextarea = document.querySelector("aw-textarea[id=" + element.textarea.id + "]");
                    }
                } else if (element.textarea.name) {
                    if (document.querySelector("aw-textarea-df[name=" + element.textarea.name + "]")) {
                        awTextarea = document.querySelector("aw-textarea-df[name=" + element.textarea.name + "]");
                    } else {
                        awTextarea = document.querySelector("aw-textarea[name=" + element.textarea.name + "]");
                    }
                }
                if (awTextarea) {
                    awTextarea.addEventListener("DOMNodeRemoved", element.eventRemove);
                }
            } else {
                element.textarea.addEventListener("DOMNodeRemoved", element.eventRemove);
            }
            if (element.textarea.value) {
                setTimeout(() => {
                    this.adaptar(element, !0);
                }, 100);
            }
        },
        adaptar(element, load = !1) {
            const textarea = element.textarea;
            if (0 === element.settings.height) {
                element.settings.height = element.textarea.offsetHeight;
            }
            if (!textarea.value) {
                textarea.style.height = element.settings.defHeight;
                return !1;
            }
            var texto = textarea.value;
            texto = texto.replace(/\n/g, "<br/>");
            if ("<br/>" === texto) {
                textarea.value = "";
                textarea.style.height = element.settings.height + "px";
                return !1;
            }
            var ultChar = texto.substr(texto.length - 5, texto.length);
            if ("<br/>" === texto) {
                textarea.value = "";
            } else if ("<br/>" !== ultChar) {
                textarea.value = textarea.value + "\n";
                this.rango(textarea, textarea.value.length - 1);
            }
            if (load) {
                textarea.blur();
            }
            var altoInicial = element.settings.height,
                padding = element.settings.padding,
                altoExt = textarea.offsetHeight,
                altoInt = textarea.scrollHeight - padding / 2;
            if (altoInt > altoExt) {
                if (element.settings.maxHeight && altoInt > element.settings.maxHeight) {
                    textarea.style.overflow = "auto";
                    textarea.style.height = element.settings.maxHeight + "px";
                } else {
                    textarea.style.overflow = "hidden";
                    textarea.style.height = altoInt + "px";
                }
            } else if (altoExt > altoInicial) {
                if (element.settings.maxHeight && altoInt < element.settings.maxHeight) {
                    textarea.style.overflow = "hidden";
                }
                textarea.style.height = altoInicial + "px";
                altoInt = textarea.scrollHeight - padding / 2;
                textarea.style.height = altoInt + "px";
            }
        },
        getPadding(textarea) {
            const paddingTop = parseInt(window.getComputedStyle(textarea, "").paddingTop.replace("px", "")),
                paddingBottom = parseInt(window.getComputedStyle(textarea, "").paddingBottom.replace("px", ""));
            return paddingTop + paddingBottom;
        },
        rango(textarea, start, end) {
            if (!end) {
                end = start;
            }
            if (textarea.setSelectionRange) {
                textarea.focus();
                textarea.setSelectionRange(start, end);
            } else if (textarea.createTextRange) {
                var range = textarea.createTextRange();
                range.collapse(!0);
                range.moveEnd("character", end);
                range.moveStart("character", start);
                range.select();
            }
        },
        _remove(element, ev) {
            element.textarea.removeEventListener("keyup", element.eventHandler);
            element.textarea.removeEventListener("focus", element.eventHandler);
            ev.target.removeEventListener("DOMNodeRemoved", element.eventRemove);
        },
    };
    Polymer.TextareaAdjust = TextareaAdjust;
})();
// Polymer.Tactil
(function () {
    const Tactil = {
        callbackFuncs: [],
        direction: { top: false, right: false, bottom: false, left: false },
        tapCounter: 0,
        timestamp: null,
        timeoutcontrol: null,
        type: null,
        objDetail: {
            action: null,
            ddx: 0,
            ddy: 0,
            direction: { top: false, right: false, bottom: false, left: false },
            dx: 0,
            dx: 0,
            sourceEvent: null,
            state: null,
            target: null,
            type: null,
            typeEvent: null,
            x: 0,
            y: 0,
            zi: 0,
            zo: 0,
        },
        add(el, type, handler) {
            this.type = type;
            this.callbackFunc = handler;
            if (type == "doubletap" || type == "tripletap") {
                type = "tap";
            }
            if (type == "tap" || type == "down" || type == "up" || type == "track") {
                if (addListener(el, type, this._handler.bind(this))) {
                    this._register(el, this.type, handler);
                    return true;
                }
            }
            if (type == "pinch") {
                el.addEventListener("wheel", this._handler_pinch.bind(this));
                this._register(el, this.type, handler);
                return true;
            }
            console.error("[awTactil] Was an error adding listener to awTactil");
            return false;
        },
        remove(el, type) {
            if (type == "doubletap" || type == "tripletap") {
                type = "tap";
            }
            if (type == "tap" || type == "down" || type == "up" || type == "track") {
                if (removeListener(el, type, this._handler.bind(this))) {
                    return true;
                }
            }
            if (type == "pinch") {
                el.removeEventListener("wheel", this._handler_pinch.bind(this));
                return true;
            }
            console.error("[awTactil] Was an error removing listener to awTactil");
            return false;
        },
        _register(el, type, handler) {
            let exists = false;
            for (let i = 0; i < this.callbackFuncs.length; i++) {
                if (this.callbackFuncs[i].el == el && this.callbackFuncs[i].type == type) {
                    this.callbackFuncs[i].handler = handler;
                    exists = true;
                }
            }
            if (!exists) {
                this.callbackFuncs.push({ el: el, type: type, handler: handler });
            }
        },
        _handler(ev) {
            let detail = ev.detail;
            detail.type = this.type;
            detail.typeEvent = ev.type;
            detail.target = ev.currentTarget;
            detail.direction = this._get_direction(detail);
            detail.action = this._get_action(detail);
            this._fireCallback(detail);
        },
        _handler_pinch(ev) {
            ev.preventDefault();
            let state = "";
            if (!this.timestamp) {
                state = "start";
                this._reset_detail();
                this.timestamp = Date.now();
                this._delete_timestamp_in(500);
            } else {
                state = "zoom";
                this.timestamp = Date.now();
                this._clear_timeoutcontrol();
                this._delete_timestamp_in(500);
            }
            let zoom = ev.wheelDelta;
            this.objDetail.state = state;
            this.objDetail.type = this.type;
            this.objDetail.typeEvent = ev.type;
            this.objDetail.x = ev.x;
            this.objDetail.y = ev.y;
            this.objDetail.zi = ev.wheelDelta > 0 ? this.objDetail.zi + ev.wheelDelta : 0;
            this.objDetail.zo = ev.wheelDelta < 0 ? this.objDetail.zo + ev.wheelDelta : 0;
            this._fireCallback(this.objDetail);
        },
        _get_direction(detail) {
            if (this.type !== "track") {
                return { top: false, right: false, bottom: false, left: false };
            }
            let top = false;
            let right = false;
            let bottom = false;
            let left = false;
            if (detail.state != "track") {
                if (detail.dx > 0) {
                    right = true;
                } else if (detail.dx < 0) {
                    left = true;
                }
                if (detail.dy > 0) {
                    bottom = true;
                } else if (detail.dy < 0) {
                    top = true;
                }
            } else {
                if (detail.ddx > 0) {
                    right = true;
                } else if (detail.ddx < 0) {
                    left = true;
                }
                if (detail.ddy > 0) {
                    bottom = true;
                } else if (detail.ddy < 0) {
                    top = true;
                }
            }
            return { top: top, right: right, bottom: bottom, left: left };
        },
        _get_action(detail) {
            if (detail.type == "track") {
                if (detail.ddx > 40 || detail.ddx < -40 || detail.ddy < -40 || detail.ddy < -40) {
                    return "swipe";
                } else {
                    return "pan";
                }
            }
            return null;
        },
        _fireCallback(detail) {
            let callback = null;
            for (let i = 0; i < this.callbackFuncs.length; i++) {
                if (this.callbackFuncs[i].el == detail.target && this.callbackFuncs[i].type == detail.type) {
                    callback = this.callbackFuncs[i].handler;
                    break;
                }
            }
            if (this.type == "doubletap") {
                if (!this.timestamp) {
                    this.timestamp = Date.now();
                    setTimeout(() => {
                        this.timestamp = null;
                    }, 800);
                } else if (this.timestamp + 800 > Date.now()) {
                    callback(detail);
                    this.timestamp = null;
                }
            } else if (this.type == "tripletap") {
                if (!this.timestamp) {
                    this.timestamp = Date.now();
                    this.tapCounter++;
                    setTimeout(() => {
                        this.timestamp = null;
                        this.tapCounter = 0;
                    }, 1200);
                } else if (this.tapCounter < 2) {
                    this.tapCounter++;
                } else if (this.timestamp + 1200 > Date.now()) {
                    callback(detail);
                    this.timestamp = null;
                    this.tapCounter = 0;
                }
            } else {
                callback(detail);
            }
        },
        _delete_timestamp_in(time = 1000) {
            this.timeoutcontrol = setTimeout(() => {
                this.timestamp = null;
                this.timeoutcontrol = null;
            }, time);
        },
        _clear_timeoutcontrol() {
            clearTimeout(this.timeoutcontrol);
        },
        _reset_detail() {
            this.objDetail = {
                action: null,
                ddx: 0,
                ddy: 0,
                direction: { top: false, right: false, bottom: false, left: false },
                dx: 0,
                dx: 0,
                sourceEvent: null,
                state: null,
                target: null,
                type: null,
                typeEvent: null,
                zi: 0,
                zo: 0,
            };
        },
    };
    Polymer.Tactil = Tactil;
    Polymer.Gestures = { addListener: addListener, removeListener: removeListener };
})();
