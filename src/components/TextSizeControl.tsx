import { useLayoutEffect, useRef, useState } from 'react';
import './TextSizeControl.css';

const sizes = [
  { id: 'sm', label: '小', percent: 100 },
  { id: 'md', label: '中', percent: 125 },
  { id: 'lg', label: '大', percent: 150 },
] as const;
const storageKey = 'chem.textSize.v2';

export function TextSizeControl() {
  const barRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (sizes.some(size => size.id === saved)) return saved!;
      // 旧5段階の保存値は、近い実サイズへ移行する。
      const old = localStorage.getItem('chem.textSize');
      if (old === 'xs') return 'sm';
      if (old === 'sm') return 'md';
      if (old === 'md' || old === 'lg' || old === 'xl') return 'lg';
    } catch { /* 保存できない環境でも画面内の切替は利用できる。 */ }
    return 'md';
  });

  useLayoutEffect(() => {
    const size = sizes.find(item => item.id === selected)!;
    document.documentElement.style.fontSize = `${size.percent}%`;
    document.documentElement.dataset.textSize = selected;
    try { localStorage.setItem(storageKey, selected); } catch { /* 任意の端末内設定 */ }
  }, [selected]);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const measure = () => document.documentElement.style.setProperty(
      '--text-size-bar-height', `${bar.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={barRef} className="text-size-bar" role="group" aria-label="文字の大きさ">
      <span className="text-size-label">文字サイズ</span>
      <div className="text-size-options">
        {sizes.map(size => (
          <button key={size.id} type="button" aria-pressed={selected === size.id}
            onClick={() => setSelected(size.id)}>{size.label}</button>
        ))}
      </div>
    </div>
  );
}
