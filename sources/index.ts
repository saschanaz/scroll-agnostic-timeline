/// <reference path="../lib/workaround.d.ts" />

import * as observer from "visible-children-observer";

interface InternalStatus<T> {
  compare: ((x: T, y: T) => number) | null;
  /** Childrens that won't be removed before the next frame */
  guard: Set<T>;
  identify: ((x: T) => string | number) | null;
  map: Map<string | number, T>;
  max: number;
}

interface BeforeAutoRemoveEventInit<T extends HTMLElement> extends EventInit {
  oldChild: T;
}

export class BeforeAutoRemoveEvent<T extends HTMLElement> extends Event {
  oldChild: T;
  constructor(typeArg: string, eventInit: BeforeAutoRemoveEventInit<T>) {
    super(typeArg, eventInit);
    this.oldChild = eventInit.oldChild;
  }
}

export interface ScrollAgnosticTimelineEventMap extends HTMLElementEventMap {
  "beforeautoremove": Event;
}

export default class ScrollAgnosticTimeline<T extends HTMLElement> extends HTMLElement {
  private _status: InternalStatus<T> = {
    compare: null,
    guard: new Set(),
    identify: null,
    map: new Map(),
    max: Infinity,
  };

  get compare() {
    return this._status.compare;
  }
  set compare(compare: InternalStatus<T>["compare"]) {
    if (!compare) {
      this._status.compare = compare;
      return; // no action needed, keep the current order
    }

    const childNodes = [...this.childNodes] as Node[] as T[];
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
  set identify(identify: InternalStatus<T>["identify"]) {
    if (!identify) {
      this._status.map.clear();
      return;
    }

    // NOTE: do not directly modify the current id map
    // to keep things atomic

    const map = new Map<string | number, T>();

    const dupes: Node[] = [];
    for (const child of this.childNodes) {
      const id = identify(child as T);
      if (map.has(id)) {
        dupes.push(child);
      }
      map.set(id, child as T);
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
  set max(value: number) {
    this._status.max = value;
    const diff = this.childNodes.length - value;
    if (diff < 0) {
      return;
    }
    this._removeByInvisibility(diff);
  }

  private _removeByInvisibility(count: number) {
    const visibles = observer.getVisibleChildren(this);
    while (this.childNodes.length && count > 0) {
      let removed = 0;
      if (this.lastElementChild && !this._isGuarded(visibles, this.lastElementChild)) {
        this._autoRemove(this.lastElementChild as T);
        removed++;
      }
      if (this.firstElementChild && !this._isGuarded(visibles, this.firstElementChild)) {
        this._autoRemove(this.firstElementChild as T);
        removed++;
      }
      if (!removed) {
        break; // no more possible removal
      }
      count -= removed;
    }
  }

  private _isGuarded(visibles: Element[], element: Element) {
    return visibles.includes(element) || this._status.guard.has(element as T);
  }

  constructor() {
    super();

    // this observation can be garbage collected automatically
    observer.observe(this);
  }

  private _findInsertionPositionBinary(child: T) {
    if (!this.childNodes.length) {
      return 0;
    }

    let left = 0;
    let right = this.childNodes.length - 1;
    while (left < right) {
      const middle = Math.floor((left + right) / 2);
      const item = this.childNodes[middle] as Node as T;
      const comparison = this._status.compare!(child, item);

      if (comparison === 0) {
        return middle;
      } else if (comparison < 0) {
        right = middle - 1;
      } else {
        left = middle + 1;
      }
    }

    // last condition
    /*
    low 0 2 4 6 8 high
    >> >> ^3^ << << <<
    */
    if (this._status.compare!((this.childNodes[left] as Node) as T, child) < 0) {
      left++;
    }

    return left;
  }

  private _getVisibleFirstChild() {
    const visibles = observer.getVisibleChildren(this);
    if (!visibles.length) {
      return;
    }
    let previous = visibles[0];
    while (previous.previousElementSibling && visibles.includes(previous.previousElementSibling)) {
      previous = previous.previousElementSibling;
    }
    return previous as HTMLElement;
  }

  appendChild(newChild: T) {
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
    } else {
      const index = this._findInsertionPositionBinary(newChild);
      super.insertBefore(newChild, this.childNodes[index]);
    }
    if (dupeCheck) {
      this._status.map.set(dupeCheck.id, newChild);
    }
    if (!("overflow-anchor" in this.style) && first && this.scrollTop > 0) {
      this.scrollTop += first.offsetTop - offset!;
    }
    // Remove from the guard when the browser updates painting
    requestAnimationFrame(() => this._status.guard.delete(newChild));
    return newChild;
  }

  private _autoRemove(oldChild: T) {
    const ev = new BeforeAutoRemoveEvent("beforeautoremove", { oldChild });
    this.dispatchEvent(ev);
    this.removeChild(oldChild);
  }

  private _checkDupe(newChild: T) {
    if (!this._status.identify) {
      return;
    }
    const id = this._status.identify(newChild);
    return {
      id,
      isDupe: this._status.map.has(id)
    }
  }

  find(id: string | number) {
    if (!this._status.identify) {
      throw new Error("`identify` callback should exist to find by id");
    }
    return this._status.map.get(id);
  }
}
