export function isNull(value: any): value is null {
    return value == null;
}

export function isUndefined(value: any): value is undefined {
    return typeof value === "undefined" || value === undefined;
}

export function isDefined(value: any) {
    return typeof value !== "undefined" && value !== undefined;
}

export function isNil(value: any): value is null | undefined {
    return isNull(value) || isUndefined(value);
}

export function isNilOrEmpty(value: any) {
    return isNil(value) || value === "";
}
