// This suppresses appendChild overridding error
// https://github.com/Microsoft/TypeScript/issues/23960

interface HTMLElement {
    appendChild<T extends Node>(newChild: T): T;
    appendChild<T extends Node>(newChild: T): T;
    removeChild<T extends Node>(oldChild: T): T;
    removeChild<T extends Node>(oldChild: T): T;
}
