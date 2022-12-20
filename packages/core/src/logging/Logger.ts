// TODO:
// - add a scope feature?

export interface Logger {
    debug: (log: string, ...rest: any[]) => Promise<any>;
    information: (log: string, ...rest: any[]) => Promise<any>;
    warning: (log: string, ...rest: any[]) => Promise<any>;
    error: (log: string, ...rest: any[]) => Promise<any>;
    critical: (log: string, ...rest: any[]) => Promise<any>;
}
