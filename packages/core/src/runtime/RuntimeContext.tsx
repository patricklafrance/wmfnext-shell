import { Runtime } from "./runtime";
import { createContext } from "react";

export interface RuntimeContextType {
    runtime?: Runtime;
}

export const RuntimeContext = createContext<RuntimeContextType>(undefined);
