import { Logger } from "../logging";

export class RuntimeLogger {
    private loggers: Logger[];

    constructor(loggers?: Logger[]) {
        this.loggers = loggers;
    }

    private log(action: (logger: Logger) => Promise<any>): Promise<PromiseSettledResult<any>[]> {
        return Promise.allSettled(this.loggers.map((x: Logger) => action(x)));
    }

    debug(log: string, ...rest: any[]): Promise<PromiseSettledResult<any>[]> {
        return this.log((x: Logger) => x.debug(log, ...rest));
    }

    information(log: string, ...rest: any[]): Promise<PromiseSettledResult<any>[]> {
        return this.log((x: Logger) => x.information(log, ...rest));
    }

    warning(log: string, ...rest: any[]): Promise<PromiseSettledResult<any>[]> {
        return this.log((x: Logger) => x.warning(log, ...rest));
    }

    error(log: string, ...rest: any[]): Promise<PromiseSettledResult<any>[]> {
        return this.log((x: Logger) => x.error(log, ...rest));
    }

    critical(log: string, ...rest: any[]): Promise<PromiseSettledResult<any>[]> {
        return this.log((x: Logger) => x.critical(log, ...rest));
    }
}
