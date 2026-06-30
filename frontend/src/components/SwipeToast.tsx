'use client';

import { useRef, useState } from 'react';
import toast, { Toast, ToastBar } from 'react-hot-toast';

/** Same look as website ToastBar, with swipe-to-dismiss on phone */
export default function SwipeToast({ t }: { t: Toast }) {
  const startX = useRef(0);
  const startY = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className="pointer-events-auto max-w-full touch-pan-y"
      style={{
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        opacity:
          dragging && (Math.abs(offsetX) > 32 || Math.abs(offsetY) > 32) ? 0.75 : 1,
        transition: dragging ? 'none' : 'transform 0.2s ease, opacity 0.2s ease',
      }}
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
        setDragging(true);
      }}
      onTouchMove={(e) => {
        setOffsetX(e.touches[0].clientX - startX.current);
        setOffsetY(e.touches[0].clientY - startY.current);
      }}
      onTouchEnd={() => {
        setDragging(false);
        if (Math.abs(offsetX) > 56 || Math.abs(offsetY) > 48) {
          toast.dismiss(t.id);
        } else {
          setOffsetX(0);
          setOffsetY(0);
        }
      }}
    >
      <ToastBar toast={t} />
    </div>
  );
}
