import { EventEmitter } from "eventemitter3";
import type { Logger } from "../logging";

export type EventName = string | symbol;

export type EventCallbackFunction = (data?: unknown) => void;

export interface EventBusOptions {
    logger?: Logger;
}

export interface AddListenerOptions {
    context?: unknown;
    once?: boolean;
}

export interface RemoveListenerOptions {
    context?: unknown;
    once?: boolean;
}

export class EventBus {
    private _eventEmitter: EventEmitter;
    private _logger: Logger;

    constructor({ logger }: EventBusOptions = {}) {
        this._eventEmitter = new EventEmitter();
        this._logger = logger;
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
        this._logger.debug(`[shell] - Dispatching event "${String(eventName)}"`, data);

        this._eventEmitter.emit(eventName, data);
    }
}
