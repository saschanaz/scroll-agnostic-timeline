/// <reference path="workaround.d.ts" />
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
export declare class BeforeAutoRemoveEvent<T extends HTMLElement> extends Event {
    oldChild: T;
    constructor(typeArg: string, eventInit: BeforeAutoRemoveEventInit<T>);
}
export interface ScrollAgnosticTimelineEventMap extends HTMLElementEventMap {
    "beforeautoremove": Event;
}
export default class ScrollAgnosticTimeline<T extends HTMLElement> extends HTMLElement {
    private _status;
    compare: InternalStatus<T>["compare"];
    identify: InternalStatus<T>["identify"];
    max: number;
    private _removeByInvisibility;
    private _isGuarded;
    constructor();
    private _findInsertionPositionBinary;
    private _getVisibleFirstChild;
    appendChild(newChild: T): T;
    private _autoRemove;
    private _checkDupe;
    find(id: string | number): T | undefined;
}
export {};
export as namespace ScrollAgnosticTimeline;
