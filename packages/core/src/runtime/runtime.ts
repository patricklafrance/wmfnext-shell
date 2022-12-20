export interface Runtime {
    logDebug: (log: string, ...rest: any[]) => Promise<PromiseSettledResult<any>[]>;
    logInformation: (log: string, ...rest: any[]) => Promise<PromiseSettledResult<any>[]>;
    logWarning: (log: string, ...rest: any[]) => Promise<PromiseSettledResult<any>[]>;
    logError: (log: string, ...rest: any[]) => Promise<PromiseSettledResult<any>[]>;
    logCritical: (log: string, ...rest: any[]) => Promise<PromiseSettledResult<any>[]>;
}
