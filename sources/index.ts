/// <reference path="../lib/workaround.d.ts" />

import * as observer from "visible-children-observer";

interface InternalStatus<T> {
  compare: ((x: T, y: T) => number) | null;
  max: number;
}

export default class ScrollAgnosticTimeline<T extends HTMLElement> extends HTMLElement {
  private _status: InternalStatus<T> = {
    compare: null,
    max: Infinity
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
      let removed = false;
      if (this.lastElementChild && !visibles.includes(this.lastElementChild)) {
        this.lastElementChild.remove();
        removed = true;
      }
      if (this.firstElementChild && !visibles.includes(this.firstElementChild)) {
        this.firstElementChild.remove();
        removed = true;
      }
      if (!removed) {
        break; // no more possible removal
      }
      count--;
    }
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
    const first = this._getVisibleFirstChild();
    const offset = first && first.offsetTop;
    if (!this.childNodes.length || !this._status.compare) {
      super.insertBefore(newChild, this.childNodes[0]);
    } else {
      const index = this._findInsertionPositionBinary(newChild);
      super.insertBefore(newChild, this.childNodes[index]);
    }
    if (this.childNodes.length > this._status.max) {
      this._removeByInvisibility(1);
    }
    if (!("overflow-anchor" in this.style) && first && this.scrollTop > 0) {
      this.scrollTop += first.offsetTop - offset!;
    }
    return newChild;
  }
}
