// TODO:
// - add a scope feature?

export enum LogLevel {
    debug = 0,
    information = 1,
    warning = 2,
    error = 3,
    critical = 4
}

export interface Logger {
    debug: (log: string, ...rest: any[]) => Promise<any>;
    information: (log: string, ...rest: any[]) => Promise<any>;
    warning: (log: string, ...rest: any[]) => Promise<any>;
    error: (log: string, ...rest: any[]) => Promise<any>;
    critical: (log: string, ...rest: any[]) => Promise<any>;
}
