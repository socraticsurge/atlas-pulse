import { useCallback, useRef } from 'react';

export default function ResizableHandle({ onResize, className = '' }) {
  const startXRef = useRef(0);
  const isDragging = useRef(false);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    startXRef.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handle = e.currentTarget;
    handle.classList.add('active');

    const handlePointerMove = (moveEvent) => {
      if (!isDragging.current) return;
      const delta = moveEvent.clientX - startXRef.current;
      startXRef.current = moveEvent.clientX;
      onResize(delta);
    };

    const handlePointerUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      handle.classList.remove('active');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [onResize]);

  return (
    <div
      className={`resize-handle ${className}`}
      onPointerDown={handlePointerDown}
    >
      <div className="resize-handle-grip" />
    </div>
  );
}
