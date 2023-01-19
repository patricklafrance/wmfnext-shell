import { createContext, useContext } from "react";

import { Runtime } from "./runtime";

export const RuntimeContext = createContext<Runtime>(undefined);

export function useRuntime() {
    return useContext(RuntimeContext);
}
