/**
 * Mullion Delete Button Component
 * 
 * Reusable delete button for mullions in SmartDrawCanvas.
 * Constitutional: Pure UI component, no ML/AI.
 */

// Removed unused React import - using new JSX transform

export interface MullionDeleteButtonProps {
  mullionId: string;
  x: number;
  y: number;
  onDelete: (id: string) => void;
}

/**
 * Mullion Delete Button
 * 
 * Renders a clickable delete button (×) for removing mullions.
 * Prevents event propagation to avoid triggering parent click handlers.
 */
export function MullionDeleteButton({
  mullionId,
  x,
  y,
  onDelete,
}: MullionDeleteButtonProps) {
  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onDelete(mullionId);
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      className="cursor-pointer"
    >
      <circle
        cx={x}
        cy={y}
        r="12"
        fill="#ef4444"
        stroke="#ffffff"
        strokeWidth="2"
        opacity="0.95"
        className="hover:fill-red-600 hover:scale-110 transition-transform"
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize="14"
        fontWeight="bold"
        pointerEvents="none"
      >
        ×
      </text>
    </g>
  );
}

