import React, { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * 最小構成テスト：\ce{}が確実に表示されることを確認
 * データやGASは使わず、固定文字列で成功を確認
 * 
 * 方針：
 * 1. KaTeXの読み込みを1系統に統一（npm importのみ）
 * 2. mhchem拡張をCDNから読み込むが、KaTeXの同一インスタンスに対して適用
 * 3. react-katexは使わず、直接katex.render()を使用
 */
export const TeXTest: React.FC = () => {
  const [mhchemLoaded, setMhchemLoaded] = useState(false);
  const container1Ref = useRef<HTMLDivElement>(null);
  const container2Ref = useRef<HTMLDivElement>(null);

  // mhchem拡張をロード（一度だけ実行）
  useEffect(() => {
    // 既にロード済みの場合はスキップ
    if (mhchemLoaded) return;

    // KaTeXが既にロードされていることを確認
    if (typeof katex === 'undefined') {
      console.error('[TeXTest] KaTeX is not loaded');
      return;
    }

    // mhchem拡張スクリプトをロード
    // 重要: mhchem.min.jsは、window.katexに対してmhchemを登録する
    // npmからインポートしたkatexをwindow.katexに設定することで、
    // mhchem拡張が正しいKaTeXインスタンスに対して登録される
    (window as any).katex = katex;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/mhchem.min.js';
    script.async = true;
    script.onload = () => {
      console.log('[TeXTest] mhchem extension loaded');
      console.log('[TeXTest] katex instance:', katex);
      console.log('[TeXTest] window.katex:', (window as any).katex);
      console.log('[TeXTest] katex.__defineMacro:', typeof (katex as any).__defineMacro);
      setMhchemLoaded(true);
    };
    script.onerror = () => {
      console.error('[TeXTest] Failed to load mhchem extension');
    };
    document.head.appendChild(script);

    return () => {
      // クリーンアップ（必要に応じて）
    };
  }, [mhchemLoaded]);

  // 数式をレンダリング（mhchem拡張がロードされた後に実行）
  useEffect(() => {
    if (!mhchemLoaded) return;

    // テスト用の固定文字列
    const testEquation1 = '\\ce{CaCO3 + 2HCl -> CaCl2 + H2O + CO2 ^}';
    const testEquation2 = '\\ce{I2 + 2S2O3^{2-} -> 2I- + S4O6^{2-}}';

    // コンテナ1をレンダリング
    if (container1Ref.current) {
      try {
        container1Ref.current.innerHTML = '';
        katex.render(testEquation1, container1Ref.current, {
          displayMode: true,
          throwOnError: false,
          errorColor: '#cc0000',
        });
        console.log('[TeXTest] Successfully rendered testEquation1');
      } catch (error) {
        console.error('[TeXTest] Error rendering testEquation1:', error);
        if (container1Ref.current) {
          container1Ref.current.textContent = testEquation1;
        }
      }
    }

    // コンテナ2をレンダリング
    if (container2Ref.current) {
      try {
        container2Ref.current.innerHTML = '';
        katex.render(testEquation2, container2Ref.current, {
          displayMode: true,
          throwOnError: false,
          errorColor: '#cc0000',
        });
        console.log('[TeXTest] Successfully rendered testEquation2');
      } catch (error) {
        console.error('[TeXTest] Error rendering testEquation2:', error);
        if (container2Ref.current) {
          container2Ref.current.textContent = testEquation2;
        }
      }
    }
  }, [mhchemLoaded]);

  return (
    <div style={{ padding: '20px', color: '#ffffff', backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
      <h1 style={{ color: '#ffffff', marginBottom: '20px' }}>KaTeX + mhchem テスト（最小構成）</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#ffffff', marginBottom: '10px' }}>テスト1: CaCO3 + 2HCl</h2>
        <div 
          ref={container1Ref}
          style={{ 
            backgroundColor: '#2d3748', 
            padding: '15px', 
            borderRadius: '5px',
            minHeight: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        />
        <p style={{ color: '#aaaaaa', fontSize: '0.9rem', marginTop: '10px' }}>
          期待: 化学式として正しく表示される
        </p>
        <p style={{ color: '#888888', fontSize: '0.8rem', marginTop: '5px', fontFamily: 'monospace' }}>
          TeX: {'\\ce{CaCO3 + 2HCl -> CaCl2 + H2O + CO2 ^}'}
        </p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#ffffff', marginBottom: '10px' }}>テスト2: I2 + 2S2O3^&#123;2-&#125;</h2>
        <div 
          ref={container2Ref}
          style={{ 
            backgroundColor: '#2d3748', 
            padding: '15px', 
            borderRadius: '5px',
            minHeight: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        />
        <p style={{ color: '#aaaaaa', fontSize: '0.9rem', marginTop: '10px' }}>
          期待: イオンを含む化学式として正しく表示される
        </p>
        <p style={{ color: '#888888', fontSize: '0.8rem', marginTop: '5px', fontFamily: 'monospace' }}>
          TeX: {'\\ce{I2 + 2S2O3^{2-} -> 2I- + S4O6^{2-}}'}
        </p>
      </div>

      <div style={{ marginTop: '40px', padding: '15px', backgroundColor: '#2d3748', borderRadius: '5px' }}>
        <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>デバッグ情報</h3>
        <pre style={{ color: '#aaaaaa', fontSize: '0.85rem', overflow: 'auto' }}>
          {JSON.stringify({
            katexLoaded: typeof katex !== 'undefined',
            mhchemLoaded,
            katexVersion: katex?.version || 'unknown',
            windowKatex: !!(window as any).katex,
            windowMhchem: !!(window as any).mhchem,
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};
