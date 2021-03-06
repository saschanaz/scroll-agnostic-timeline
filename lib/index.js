/// <reference path="../lib/workaround.d.ts" />
(function (global, factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "visible-children-observer"], factory);
    }
    else {
        global.ScrollAgnosticTimeline = global.ScrollAgnosticTimeline || {};
        var exports = global.ScrollAgnosticTimeline;
        factory(global.require, exports);
    }
})(this, function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const observer = require("visible-children-observer");
    class BeforeAutoRemoveEvent extends Event {
        constructor(typeArg, eventInit) {
            super(typeArg, eventInit);
            this.oldChild = eventInit.oldChild;
        }
    }
    exports.BeforeAutoRemoveEvent = BeforeAutoRemoveEvent;
    class ScrollAgnosticTimeline extends HTMLElement {
        constructor() {
            super();
            this._status = {
                compare: null,
                guard: new Set(),
                identify: null,
                map: new Map(),
                max: Infinity,
            };
            // this observation can be garbage collected automatically
            observer.observe(this);
        }
        get compare() {
            return this._status.compare;
        }
        set compare(compare) {
            if (!compare) {
                this._status.compare = compare;
                return; // no action needed, keep the current order
            }
            const childNodes = [...this.childNodes];
            childNodes.sort(compare);
            // assign only when everything goes well
            this._status.compare = compare;
            while (this.firstChild) {
                this.removeChild(this.firstChild);
            }
            for (const node of childNodes) {
                super.appendChild(node);
            }
        }
        get identify() {
            return this._status.identify;
        }
        set identify(identify) {
            if (!identify) {
                this._status.map.clear();
                return;
            }
            // NOTE: do not directly modify the current id map
            // to keep things atomic
            const map = new Map();
            const dupes = [];
            for (const child of this.childNodes) {
                const id = identify(child);
                if (map.has(id)) {
                    dupes.push(child);
                }
                map.set(id, child);
            }
            for (const dup of dupes) {
                this.removeChild(dup);
            }
            this._status.map = map;
            this._status.identify = identify;
        }
        get max() {
            return this._status.max;
        }
        set max(value) {
            this._status.max = value;
            const diff = this.childNodes.length - value;
            if (diff < 0) {
                return;
            }
            this._removeByInvisibility(diff);
        }
        _removeByInvisibility(count) {
            const visibles = observer.getVisibleChildren(this);
            while (this.childNodes.length && count > 0) {
                let removed = 0;
                if (this.lastElementChild && !this._isGuarded(visibles, this.lastElementChild)) {
                    this._autoRemove(this.lastElementChild);
                    removed++;
                }
                if (this.firstElementChild && !this._isGuarded(visibles, this.firstElementChild)) {
                    this._autoRemove(this.firstElementChild);
                    removed++;
                }
                if (!removed) {
                    break; // no more possible removal
                }
                count -= removed;
            }
        }
        _isGuarded(visibles, element) {
            return visibles.includes(element) || this._status.guard.has(element);
        }
        _findInsertionPositionBinary(child) {
            if (!this.childNodes.length) {
                return 0;
            }
            let left = 0;
            let right = this.childNodes.length - 1;
            while (left < right) {
                const middle = Math.floor((left + right) / 2);
                const item = this.childNodes[middle];
                const comparison = this._status.compare(child, item);
                if (comparison === 0) {
                    return middle;
                }
                else if (comparison < 0) {
                    right = middle - 1;
                }
                else {
                    left = middle + 1;
                }
            }
            // last condition
            /*
            low 0 2 4 6 8 high
            >> >> ^3^ << << <<
            */
            if (this._status.compare(this.childNodes[left], child) < 0) {
                left++;
            }
            return left;
        }
        _getVisibleFirstChild() {
            const visibles = observer.getVisibleChildren(this);
            if (!visibles.length) {
                return;
            }
            let previous = visibles[0];
            while (previous.previousElementSibling && visibles.includes(previous.previousElementSibling)) {
                previous = previous.previousElementSibling;
            }
            return previous;
        }
        appendChild(newChild) {
            const dupeCheck = this._checkDupe(newChild);
            if (dupeCheck && dupeCheck.isDupe) {
                return newChild; // silently ignore when duped
            }
            const first = this._getVisibleFirstChild();
            const offset = first && first.offsetTop;
            if (this.childNodes.length >= this._status.max) {
                // Children can be exceptionally more than the max value
                // when every children is visible
                const count = this.childNodes.length - this._status.max + 1;
                this._removeByInvisibility(count);
            }
            // Prevent removal until the next frame
            this._status.guard.add(newChild);
            if (!this.childNodes.length || !this._status.compare) {
                super.insertBefore(newChild, this.childNodes[0]);
            }
            else {
                const index = this._findInsertionPositionBinary(newChild);
                super.insertBefore(newChild, this.childNodes[index]);
            }
            if (dupeCheck) {
                this._status.map.set(dupeCheck.id, newChild);
            }
            if (!("overflow-anchor" in this.style) && first && this.scrollTop > 0) {
                this.scrollTop += first.offsetTop - offset;
            }
            // Remove from the guard when the browser updates painting
            requestAnimationFrame(() => this._status.guard.delete(newChild));
            return newChild;
        }
        removeChild(oldChild) {
            if (this._status.identify) {
                const id = this._status.identify(oldChild);
                this._status.map.delete(id);
            }
            super.removeChild(oldChild);
        }
        _autoRemove(oldChild) {
            const ev = new BeforeAutoRemoveEvent("beforeautoremove", { oldChild });
            this.dispatchEvent(ev);
            this.removeChild(oldChild);
        }
        _checkDupe(newChild) {
            if (!this._status.identify) {
                return;
            }
            const id = this._status.identify(newChild);
            return {
                id,
                isDupe: this._status.map.has(id)
            };
        }
        find(id) {
            if (!this._status.identify) {
                throw new Error("`identify` callback should exist to find by id");
            }
            return this._status.map.get(id);
        }
    }
    exports.default = ScrollAgnosticTimeline;
});
//# sourceMappingURL=index.js.map