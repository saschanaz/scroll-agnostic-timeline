import * as observer from "visible-children-observer";

interface InternalStatus<T> {
    compare: ((x: T, y: T) => number) | null;
}

export default class ScrollAgnosticTimeline<T extends Node> extends HTMLElement {
    private _status: InternalStatus<T> = {
        compare: null
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
        if (this._status.compare!((this.childNodes[left] as Node) as T, child) < 0) {
            left++;
        }
    
        return left;
    }

    appendChild(newChild: T) {
        if (!this._status.compare) {
            super.appendChild(newChild);
        }
        else {
            const index = this._findInsertionPositionBinary(newChild);
            super.insertBefore(newChild, this.childNodes[index]);
        }
        return newChild;
    }
}
