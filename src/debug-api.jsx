import React, { useState } from 'react';
import { translateWithGemini } from './services/GeminiApi';
import { getCachedWordDefinition } from './services/dictionaryApi';

const DebugApi = () => {
  const [translation, setTranslation] = useState('');
  const [wordDefinition, setWordDefinition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testTranslation = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await translateWithGemini('Hello world', 'en', 'zh-CN');
      setTranslation(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testWordDefinition = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCachedWordDefinition('hello');
      setWordDefinition(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>API调试页面</h1>

      <div style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #eee' }}>
        <h2>翻译API测试</h2>
        <button
          onClick={testTranslation}
          disabled={loading}
          style={{ padding: '0.5rem 1rem', marginRight: '1rem' }}
        >
          测试翻译 "Hello world"
        </button>
        {translation && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f0f0' }}>
            <strong>结果：</strong> {translation}
          </div>
        )}
      </div>

      <div style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #eee' }}>
        <h2>单词API测试</h2>
        <button
          onClick={testWordDefinition}
          disabled={loading}
          style={{ padding: '0.5rem 1rem', marginRight: '1rem' }}
        >
          测试单词 "hello"
        </button>
        {wordDefinition && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f0f0' }}>
            <strong>单词：</strong> {wordDefinition.word}<br />
            <strong>中文翻译：</strong> {wordDefinition.chineseTranslation}<br />
            <strong>数据：</strong> <pre>{JSON.stringify(wordDefinition, null, 2)}</pre>
          </div>
        )}
      </div>

      {error && (
        <div style={{ margin: '2rem 0', padding: '1rem', border: '1px solid red', color: 'red' }}>
          <strong>错误：</strong> {error}
        </div>
      )}
    </div>
  );
};

export default DebugApi;
