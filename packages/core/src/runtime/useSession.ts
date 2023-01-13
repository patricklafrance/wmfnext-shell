import { Session } from "../session";
import { useRuntime } from "./RuntimeContext";

export function useSession<T = Session>() {
    const runtime = useRuntime();

    return runtime.getSession() as T;
}
