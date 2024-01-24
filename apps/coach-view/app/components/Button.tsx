'use client';

import { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
    text: string;
    onClick: () => void;
}

export function Button({ text, onClick } : ButtonProps): JSX.Element {
    return (
        <button
          type="button"
          onClick={onClick}
          className="p-2 rounded-md"
        >
          {text}
        </button>
      );
}