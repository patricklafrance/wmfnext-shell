import { ReactNode } from "react";

export interface ButtonProps {
    variant?: "solid" | "outline";
    children: ReactNode;
}

export function Button(props: ButtonProps) {
    const {
        children,
        variant = "outline"
    } = props;

    return (
        <button type="button" className={variant}>
            {children}
        </button>
    );
}
