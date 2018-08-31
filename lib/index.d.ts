/// <reference path="workaround.d.ts" />
interface InternalStatus<T> {
    compare: ((x: T, y: T) => number) | null;
    max: number;
    /** Childrens that won't be removed before the next frame */
    guard: Set<T>;
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
    max: number;
    private _removeByInvisibility;
    private _isGuarded;
    constructor();
    private _findInsertionPositionBinary;
    private _getVisibleFirstChild;
    appendChild(newChild: T): T;
    private _autoRemove;
}
export {};
export as namespace ScrollAgnosticTimeline;
