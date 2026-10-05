import React, { useEffect, useRef, useState } from 'react';

/*
  An <img> that only starts downloading when it is about to scroll into view.

  The browser's own loading="lazy" starts anything within ~1,250–2,500px of
  the screen, which on a phone pulls the photo galleries in during the first
  load and slows the first screen. This waits until the image is within
  `margin` of the viewport. Pre-rendered without a src, so the server HTML and
  the first client render match.
*/
export default function LazyImage({ src, margin = '300px', alt = '', ...rest }) {
  const ref = useRef(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return undefined;
    if (!('IntersectionObserver' in window)) { setNear(true); return undefined; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); }
    }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [near, margin]);

  return <img ref={ref} src={near ? src : undefined} alt={alt} decoding="async" {...rest} />;
}
