// 今回のAI用GASのコード末尾へ追加し、エディタで diagnoseOpenAI を実行します。
// 説明生成・シート変更・APIキーの出力は行いません。
function diagnoseOpenAI() {
  const properties = PropertiesService.getScriptProperties();
  const key = String(properties.getProperty('OPENAI_API_KEY') || '').trim();
  console.log('AI有効化: ' + (properties.getProperty('CHEM_AI_ENABLED') === 'true'));
  console.log('APIキー設定: ' + /^sk-/.test(key));
  if (!/^sk-/.test(key)) return;
  try {
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/models', {
      method: 'get',
      headers: { Authorization: 'Bearer ' + key },
      muteHttpExceptions: true
    });
    console.log('OpenAI接続: HTTP ' + response.getResponseCode());
  } catch (error) {
    const message = String(error.message || error)
      .split(key).join('[APIキー非表示]')
      .replace(/sk-[A-Za-z0-9_-]+/g, '[APIキー非表示]');
    console.error('接続例外: ' + message);
  }
}
