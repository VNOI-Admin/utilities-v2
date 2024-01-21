import React from "react";

export const useDebounce = (value: string, delay: number): string => {
    const [debouncedValue, setDebouncedValue] = React.useState<string>(value);
    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return (): void => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};