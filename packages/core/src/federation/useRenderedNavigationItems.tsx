// TODO: Create a snapshot test to validate the ouput of different scenarios

import type { NavigationItem, RootNavigationItem } from "./navigationItemRegistry";
import type { ReactElement, ReactNode } from "react";
import { cloneElement, useMemo } from "react";

import type { LinkProps } from "react-router-dom";

export interface NavigationItemProps {
    content: ReactNode;
    linkProps: Omit<LinkProps, "children">;
    additionalProps: Record<string, any>;
}

export type RenderItemFunction = (item: NavigationItemProps, index: number, level: number) => ReactElement;

export type RenderSectionFunction = (itemElements: ReactElement[], index: number, level: number) => ReactElement;

function toRenderItem(item: NavigationItem) {
    // children is intentionally omitted.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { children, content, additionalProps, ...linkProps } = item;

    return {
        content,
        linkProps,
        additionalProps: additionalProps ?? {}
    } as NavigationItemProps;
}

function renderItems(navigationItems: NavigationItem[], renderItem: RenderItemFunction, renderSection: RenderSectionFunction, index: number, level: number) {
    const itemElements = navigationItems.map((x: (NavigationItem), itemIndex: number) => {
        const itemElement = renderItem(toRenderItem(x), itemIndex, level);

        if (x.children) {
            const childrenElement = renderItems(x.children, renderItem, renderSection, 0, level + 1);

            return cloneElement(itemElement, {
                children: (
                    <>
                        {itemElement.props.children}
                        {childrenElement}
                    </>
                )
            });
        }

        return itemElement;
    });

    const section = renderSection(itemElements, index, level);

    return section;
}

export function useRenderedNavigationItems(
    navigationItems: Readonly<RootNavigationItem[]>,
    renderItem: RenderItemFunction,
    renderSection: RenderSectionFunction
) {
    return useMemo(() => {
        // Highest priority is rendered first.
        const sortedItems = [...navigationItems]
            .sort((x, y) => {
                if (x.priority === y.priority) {
                    return 0;
                }

                if (!x.priority && y.priority) {
                    return 1;
                }

                if (x.priority && !y.priority) {
                    return -1;
                }

                return x.priority > y.priority ? -1 : 1;
            })
            // priority is intentionally omitted.
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .map(({ priority, ...itemProps }) => ({
                ...itemProps
            }));

        return renderItems(sortedItems, renderItem, renderSection, 0, 0);
    }, [navigationItems, renderItem, renderSection]);
}
