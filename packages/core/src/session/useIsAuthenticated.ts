import { isNil } from "../shared";
import { useSession } from "../runtime";

export function useIsAuthenticated() {
    const session = useSession();

    return !isNil(session);
}
