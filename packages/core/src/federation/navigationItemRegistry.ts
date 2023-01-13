import type { LinkProps } from "react-router-dom";
import type { ReactNode } from "react";
import { deepFreeze } from "../shared";

export interface NavigationItem extends Omit<LinkProps, "children"> {
    content: ReactNode;
    children?: NavigationItem[];
    additionalProps?: Record<string, any>;
}

export type RootNavigationItem = NavigationItem & {
    // Highest priority is rendered first.
    priority?: number;
};

export class NavigationItemRegistry {
    private _items: Readonly<RootNavigationItem[]>;

    constructor() {
        this._items = Object.freeze([]);
    }

    add(navigationItems: RootNavigationItem[]) {
        // Create a new array so the navigation items array is immutable.
        this._items = deepFreeze([...this._items, ...navigationItems.filter(x => x)]);
    }

    get items() {
        return this._items;
    }
}
