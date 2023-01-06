import type { Logger } from "./Logger";

// TODO: use a type instead:
// export type LogLevel = "debug" | "information" | "warning" | "error" | "critical"
export enum LogLevel {
    debug = 0,
    information = 1,
    warning = 2,
    error = 3,
    critical = 4
}

export class ConsoleLogger implements Logger {
    private _logLevel: LogLevel;

    constructor(logLevel: LogLevel = LogLevel.critical) {
        this._logLevel = logLevel;
    }

    debug(log: string, ...rest: any[]): Promise<any> {
        if (this._logLevel >= LogLevel.debug) {
            console.log(log, ...rest);
        }

        return Promise.resolve();
    }

    information(log: string, ...rest: any[]): Promise<any> {
        if (this._logLevel >= LogLevel.information) {
            console.info(log, ...rest);
        }

        return Promise.resolve();
    }

    warning(log: string, ...rest: any[]): Promise<any> {
        if (this._logLevel >= LogLevel.warning) {
            console.warn(log, ...rest);
        }

        return Promise.resolve();
    }

    error(log: string, ...rest: any[]): Promise<any> {
        if (this._logLevel >= LogLevel.error) {
            console.error(log, ...rest);
        }

        return Promise.resolve();
    }

    critical(log: string, ...rest: any[]): Promise<any> {
        if (this._logLevel >= LogLevel.critical) {
            console.error(log, ...rest);
        }

        return Promise.resolve();
    }
}
