import React from 'react';

interface RadioCardProps {
    id: string;
    name: string;
    value: string;
    checked: boolean;
    onChange: (value: string) => void;
    label: string;
}

const RadioCard: React.FC<RadioCardProps> = ({ id, name, value, checked, onChange, label }) => {
    return (
        <div>
            {/* The input is now just for state representation and accessibility */}
            <input
                type="radio"
                id={id}
                name={name}
                value={value}
                className="hidden"
                checked={checked}
                readOnly // Prevent React warnings as we handle the click on the label
            />
            <label
                htmlFor={id}
                onClick={() => onChange(value)} // Use onClick on the label to capture every click
                className={`block p-2 text-center rounded-md cursor-pointer transition-all duration-200 text-sm
                    ${checked
                        ? 'bg-purple-600 text-white font-semibold ring-2 ring-purple-400'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
            >
                {label}
            </label>
        </div>
    );
};

export default RadioCard;
