import React, { useRef } from 'react';

const Terry: React.FC = () => {
  const imgRef = useRef<HTMLImageElement>(null);

  return (
    <img
      ref={imgRef}
      src="/img/terry.webp"
      alt="Terry"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        maxWidth: '80vh',
        maxHeight: '80vh',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
      draggable={false}
    />
  );
};

export default Terry;
