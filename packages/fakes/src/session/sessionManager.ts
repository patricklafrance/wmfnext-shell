import { deepFreeze, isNil, isNilOrEmpty } from "wmfnext-shell";

export interface SessionManagerOptions {
    key?: string;
}

export class SessionManager<T = unknown> {
    private _key: string;
    private _cache: Readonly<T> = undefined;

    constructor({ key = "app-session" }: SessionManagerOptions = {}) {
        this._key = key;
    }

    setSession(session: T) {
        if (isNil(session)) {
            window.localStorage.removeItem(this._key);
        } else {
            window.localStorage.setItem(this._key, JSON.stringify(session));
        }

        this._cache = undefined;
    }

    getSession() {
        if (this._cache) {
            return this._cache;
        }

        const rawSession = window.localStorage.getItem(this._key);

        if (!isNilOrEmpty(rawSession)) {
            const session = JSON.parse(rawSession);

            if (session) {
                this._cache = deepFreeze(session);

                return this._cache;
            }
        }

        return undefined;
    }

    clearSession() {
        this._cache = undefined;

        window.localStorage.removeItem(this._key);
    }
}
