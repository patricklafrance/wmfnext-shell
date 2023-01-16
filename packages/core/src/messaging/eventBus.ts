import { EventEmitter } from "eventemitter3";

export type EventName = string | symbol;

export type EventCallbackFunction = (data?: unknown) => void;

export interface AddListenerOptions {
    context?: unknown;
    once?: boolean;
}

export interface RemoveListenerOptions {
    context?: unknown;
    once?: boolean;
}

export class EventBus {
    private _eventEmitter;

    constructor() {
        this._eventEmitter = new EventEmitter();
    }

    addListener(eventName: EventName, callback: EventCallbackFunction, { context, once }: AddListenerOptions = {}) {
        if (once === true) {
            this._eventEmitter.once(eventName, callback, context);
        } else {
            this._eventEmitter.addListener(eventName, callback, context);
        }
    }

    removeListener(eventName: EventName, callback: EventCallbackFunction, { context, once }: RemoveListenerOptions = {}) {
        this._eventEmitter.removeListener(eventName, callback, context, once);
    }

    dispatch(eventName: EventName, data?: unknown) {
        this._eventEmitter.emit(eventName, data);
    }
}
