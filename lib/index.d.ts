/// <reference path="workaround.d.ts" />
interface InternalStatus<T> {
    compare: ((x: T, y: T) => number) | null;
    max: number;
}
export default class ScrollAgnosticTimeline<T extends HTMLElement> extends HTMLElement {
    private _status;
    compare: InternalStatus<T>["compare"];
    max: number;
    private _removeByInvisibility;
    constructor();
    private _findInsertionPositionBinary;
    private _getVisibleFirstChild;
    appendChild(newChild: T): T;
}
export {};
export as namespace ScrollAgnosticTimeline;
