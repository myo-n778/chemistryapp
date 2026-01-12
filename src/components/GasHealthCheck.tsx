import { useState, useEffect } from 'react';
import { PROBLEM_BASE_URL, REC_BASE_URL, STATS_BASE_URL } from '../config/gasUrls';
import './GasHealthCheck.css';

interface HealthCheckResult {
  url: string;
  name: string;
  status: 'checking' | 'ok' | 'error';
  message: string;
  responsePreview?: string;
}

export const GasHealthCheck = () => {
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkEndpoints = async () => {
      const checks: HealthCheckResult[] = [];

      // 1. REC_BASE_URL?action=rec のチェック
      if (!REC_BASE_URL || REC_BASE_URL.trim() === '') {
        checks.push({
          url: '（未設定）',
          name: 'REC (rec専用)',
          status: 'error',
          message: '✗ エラー: REC_BASE_URLが設定されていません。src/config/gasUrls.ts または環境変数 VITE_GAS_URL_REC を設定してください。',
        });
      } else {
        const recUrl = `${REC_BASE_URL}?action=rec`;
        checks.push({
          url: recUrl,
          name: 'REC (rec専用)',
          status: 'checking',
          message: 'チェック中...',
        });

        try {
          const recResponse = await fetch(recUrl, { method: 'GET', mode: 'cors' });
        const recText = await recResponse.text();
        const recPreview = recText.substring(0, 200);

        let recData: any;
        try {
          recData = JSON.parse(recText);
        } catch {
          recData = null;
        }

        if (Array.isArray(recData)) {
          checks[0] = {
            url: recUrl,
            name: 'REC (rec専用)',
            status: 'ok',
            message: `✓ 正しい（${recData.length}件のrecデータ）`,
            responsePreview: recPreview,
          };
        } else if (recData && typeof recData === 'object' && recData.error) {
          if (recData.error.includes('userStats')) {
            checks[0] = {
              url: recUrl,
              name: 'REC (rec専用)',
              status: 'error',
              message: '✗ エラー: userStats専用GASが設定されています',
              responsePreview: recPreview,
            };
          } else {
            checks[0] = {
              url: recUrl,
              name: 'REC (rec専用)',
              status: 'error',
              message: `✗ エラー: ${recData.error}`,
              responsePreview: recPreview,
            };
          }
        } else if (recText.includes('csv') || recText.includes('メタン')) {
          checks[0] = {
            url: recUrl,
            name: 'REC (rec専用)',
            status: 'error',
            message: '✗ エラー: 問題データ（CSV）が返っています',
            responsePreview: recPreview,
          };
        } else {
          checks[0] = {
            url: recUrl,
            name: 'REC (rec専用)',
            status: 'error',
            message: '✗ エラー: 期待される形式（JSON配列）ではありません',
            responsePreview: recPreview,
          };
        }
        } catch (error) {
          checks[0] = {
            url: recUrl,
            name: 'REC (rec専用)',
            status: 'error',
            message: `✗ エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      setResults([...checks]);

      // 2. STATS_BASE_URL?action=userStats のチェック
      const statsUrl = `${STATS_BASE_URL}?action=userStats`;
      checks.push({
        url: statsUrl,
        name: 'STATS (userStats専用)',
        status: 'checking',
        message: 'チェック中...',
      });

      try {
        const statsResponse = await fetch(statsUrl, { method: 'GET', mode: 'cors' });
        const statsText = await statsResponse.text();
        const statsPreview = statsText.substring(0, 200);

        let statsData: any;
        try {
          statsData = JSON.parse(statsText);
        } catch {
          statsData = null;
        }

        if (Array.isArray(statsData)) {
          checks[1] = {
            url: statsUrl,
            name: 'STATS (userStats専用)',
            status: 'ok',
            message: `✓ 正しい（${statsData.length}件のuserStatsデータ）`,
            responsePreview: statsPreview,
          };
        } else if (statsData && typeof statsData === 'object' && statsData.error) {
          checks[1] = {
            url: statsUrl,
            name: 'STATS (userStats専用)',
            status: 'error',
            message: `✗ エラー: ${statsData.error}`,
            responsePreview: statsPreview,
          };
        } else if (statsText.includes('csv') || statsText.includes('メタン')) {
          checks[1] = {
            url: statsUrl,
            name: 'STATS (userStats専用)',
            status: 'error',
            message: '✗ エラー: 問題データ（CSV）が返っています',
            responsePreview: statsPreview,
          };
        } else {
          checks[1] = {
            url: statsUrl,
            name: 'STATS (userStats専用)',
            status: 'error',
            message: '✗ エラー: 期待される形式（JSON配列）ではありません',
            responsePreview: statsPreview,
          };
        }
      } catch (error) {
        checks[1] = {
          url: statsUrl,
          name: 'STATS (userStats専用)',
          status: 'error',
          message: `✗ エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }

      setResults([...checks]);

      // 3. PROBLEM_BASE_URL?type=compounds のチェック
      if (!PROBLEM_BASE_URL || PROBLEM_BASE_URL.trim() === '') {
        checks.push({
          url: '（未設定）',
          name: 'PROBLEM (問題データ)',
          status: 'error',
          message: '✗ エラー: PROBLEM_BASE_URLが設定されていません。src/config/gasUrls.ts または環境変数 VITE_GAS_URL_PROBLEM を設定してください。',
        });
      } else {
        const problemUrl = `${PROBLEM_BASE_URL}?type=compounds&category=organic`;
        checks.push({
          url: problemUrl,
          name: 'PROBLEM (問題データ)',
          status: 'checking',
          message: 'チェック中...',
        });

        try {
          const problemResponse = await fetch(problemUrl, { method: 'GET', mode: 'cors' });
        const problemText = await problemResponse.text();
        const problemPreview = problemText.substring(0, 200);

        let problemData: any;
        try {
          problemData = JSON.parse(problemText);
        } catch {
          problemData = null;
        }

        if (problemData && problemData.csv) {
          checks[2] = {
            url: problemUrl,
            name: 'PROBLEM (問題データ)',
            status: 'ok',
            message: '✓ 正しい（CSVデータが返っています）',
            responsePreview: problemPreview,
          };
        } else if (Array.isArray(problemData)) {
          checks[2] = {
            url: problemUrl,
            name: 'PROBLEM (問題データ)',
            status: 'error',
            message: '✗ エラー: rec/userStatsデータ（JSON配列）が返っています',
            responsePreview: problemPreview,
          };
        } else if (problemData && typeof problemData === 'object' && problemData.error) {
          checks[2] = {
            url: problemUrl,
            name: 'PROBLEM (問題データ)',
            status: 'error',
            message: `✗ エラー: ${problemData.error}`,
            responsePreview: problemPreview,
          };
        } else if (problemText.includes('メタン') || problemText.includes('CH4')) {
          // CSV文字列として直接返っている場合
          checks[2] = {
            url: problemUrl,
            name: 'PROBLEM (問題データ)',
            status: 'ok',
            message: '✓ 正しい（CSV文字列が返っています）',
            responsePreview: problemPreview,
          };
        } else {
          checks[2] = {
            url: problemUrl,
            name: 'PROBLEM (問題データ)',
            status: 'error',
            message: '✗ エラー: 期待される形式（CSV）ではありません',
            responsePreview: problemPreview,
          };
        }
        } catch (error) {
          checks[2] = {
            url: problemUrl,
            name: 'PROBLEM (問題データ)',
            status: 'error',
            message: `✗ エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      setResults([...checks]);

      // エラーがある場合は表示を維持
      const hasError = checks.some(r => r.status === 'error');
      if (hasError || import.meta.env.DEV) {
        setIsVisible(true);
      }
    };

    checkEndpoints();
  }, []);

  if (!isVisible && results.every(r => r.status === 'ok')) {
    return null;
  }

  const hasError = results.some(r => r.status === 'error');
  const allChecked = results.length === 3 && results.every(r => r.status !== 'checking');

  return (
    <div className={`gas-health-check ${hasError ? 'has-error' : ''}`}>
      <div className="health-check-header">
        <h3>GAS エンドポイント ヘルスチェック</h3>
        <button
          className="health-check-toggle"
          onClick={() => setIsVisible(!isVisible)}
          aria-label={isVisible ? 'ヘルスチェックを非表示' : 'ヘルスチェックを表示'}
        >
          {isVisible ? '−' : '+'}
        </button>
      </div>
      {isVisible && (
        <div className="health-check-content">
          {results.map((result, index) => (
            <div key={index} className={`health-check-item ${result.status}`}>
              <div className="health-check-name">{result.name}</div>
              <div className="health-check-message">{result.message}</div>
              {result.responsePreview && (
                <details className="health-check-details">
                  <summary>レスポンスプレビュー</summary>
                  <pre className="health-check-preview">{result.responsePreview}</pre>
                </details>
              )}
              <div className="health-check-url">{result.url}</div>
            </div>
          ))}
          {!allChecked && (
            <div className="health-check-loading">チェック中...</div>
          )}
        </div>
      )}
    </div>
  );
};
