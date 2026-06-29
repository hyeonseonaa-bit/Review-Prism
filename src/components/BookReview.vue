<template>
  <div class="container">
    <header>
      <h1>📚 독서 기록 에이전트</h1>
      <p>책 감상을 쓰면 AI가 다른 독자들의 시각을 찾아 노트를 풍성하게 만들어줍니다</p>
    </header>

    <div class="form-section">
      <div class="field">
        <label>책 제목</label>
        <input v-model="bookTitle" type="text" placeholder="예: 채식주의자, 82년생 김지영..." :disabled="loading" />
      </div>

      <div class="field">
        <label>나의 감상평</label>
        <textarea
          v-model="myReview"
          placeholder="이 책을 읽고 느낀 점, 인상 깊었던 부분, 생각들을 자유롭게 써주세요..."
          rows="8"
          :disabled="loading"
        />
      </div>

      <button @click="analyze" :disabled="loading || !bookTitle || !myReview" class="btn-analyze">
        <span v-if="loading">🔍 분석 중...</span>
        <span v-else>✨ 독서 노트 풍성하게 만들기</span>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>다른 독자들의 감상을 검색하고 비교 분석 중입니다...</p>
    </div>

    <div v-if="result" class="result-section">
      <h2>📖 풍성해진 독서 노트</h2>
      <div class="result-content" v-html="formattedResult"></div>
    </div>

    <div v-if="error" class="error-section">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const bookTitle = ref('');
const myReview = ref('');
const result = ref('');
const loading = ref(false);
const error = ref('');

const formattedResult = computed(() => {
  return result.value
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/### (.+)/g, '<h3>$1</h3>')
    .replace(/## (.+)/g, '<h2>$1</h2>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
});

async function analyze() {
  if (!bookTitle.value || !myReview.value) return;
  loading.value = true;
  error.value = '';
  result.value = '';

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookTitle: bookTitle.value, myReview: myReview.value }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '분석 중 오류가 발생했습니다.');
    result.value = data.result;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px;
  font-family: 'Pretendard', 'Apple SD Gothic Neo', sans-serif;
}

header {
  text-align: center;
  margin-bottom: 48px;
}

header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 8px;
}

header p {
  color: #666;
  font-size: 1rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

input, textarea {
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1rem;
  transition: border-color 0.2s;
  resize: vertical;
  font-family: inherit;
}

input:focus, textarea:focus {
  outline: none;
  border-color: #6c63ff;
}

input:disabled, textarea:disabled {
  background: #f5f5f5;
}

.btn-analyze {
  padding: 14px;
  background: #6c63ff;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.btn-analyze:hover:not(:disabled) {
  background: #574fd6;
  transform: translateY(-1px);
}

.btn-analyze:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.loading-state {
  text-align: center;
  padding: 48px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #6c63ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.result-section {
  margin-top: 48px;
  padding: 32px;
  background: #f9f9ff;
  border-radius: 16px;
  border: 1px solid #e8e5ff;
}

.result-section h2 {
  font-size: 1.3rem;
  color: #1a1a2e;
  margin-bottom: 20px;
}

.result-content {
  line-height: 1.8;
  color: #333;
}

.result-content :deep(h3) {
  font-size: 1.1rem;
  color: #6c63ff;
  margin: 20px 0 8px;
}

.result-content :deep(strong) {
  color: #1a1a2e;
}

.error-section {
  margin-top: 24px;
  padding: 16px;
  background: #fff0f0;
  border-radius: 10px;
  color: #cc0000;
  text-align: center;
}
</style>
