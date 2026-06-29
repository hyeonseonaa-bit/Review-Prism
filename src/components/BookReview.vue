<template>
  <div class="app">
    <!-- Left Panel -->
    <div class="left-panel">
      <div class="brand">
        <h1>Review Prism</h1>
        <p>내 감상을 다른 사람들의 시각으로</p>
      </div>

      <div class="media-selector">
        <button
          v-for="type in mediaTypes"
          :key="type.value"
          :class="['media-btn', { active: mediaType === type.value }]"
          @click="mediaType = type.value"
        >
          <span class="media-icon">{{ type.icon }}</span>
          <span>{{ type.label }}</span>
        </button>
      </div>

      <div class="fields">
        <div class="field">
          <label>{{ current.titleLabel }}</label>
          <input v-model="title" :placeholder="current.titlePlaceholder" :disabled="loading" />
        </div>

        <div class="field grow">
          <label>나의 감상</label>
          <textarea v-model="review" :placeholder="current.reviewPlaceholder" :disabled="loading" />
        </div>
      </div>

      <button @click="analyze" :disabled="loading || !title || !review" class="btn-analyze">
        <span v-if="loading">🔍 분석 중...</span>
        <span v-else>✨ 분석하기</span>
      </button>
    </div>

    <!-- Right Panel -->
    <div class="right-panel">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>다른 사람들의 감상을 검색하고<br>비교 분석 중입니다...</p>
      </div>

      <div v-else-if="result" class="result-wrap">
        <div class="result-header">
          <span class="result-badge">{{ current.icon }} {{ title }}</span>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['tab-btn', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            <span>{{ tab.emoji }}</span>
            <span>{{ tab.label }}</span>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content" v-html="formattedTab"></div>

        <!-- Sources -->
        <div v-if="sources.length" class="sources">
          <h4>📎 출처</h4>
          <ul>
            <li v-for="source in sources" :key="source.url">
              <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}</a>
            </li>
          </ul>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">🔮</div>
        <p>작품 정보와 감상을 입력하면<br>다양한 시각을 담은 분석이 여기에 나타납니다</p>
      </div>

      <div v-if="error" class="error-section">
        <p>⚠️ {{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const mediaTypes = [
  {
    value: 'book',
    icon: '📚',
    label: '책',
    titleLabel: '책 제목',
    titlePlaceholder: '예: 채식주의자, 82년생 김지영...',
    reviewPlaceholder: '읽고 느낀 점, 인상 깊었던 부분을 자유롭게 써주세요...',
  },
  {
    value: 'movie',
    icon: '🎬',
    label: '영화',
    titleLabel: '영화 제목',
    titlePlaceholder: '예: 기생충, 올드보이, 버닝...',
    reviewPlaceholder: '보고 느낀 점, 인상 깊었던 장면을 자유롭게 써주세요...',
  },
  {
    value: 'drama',
    icon: '📺',
    label: '드라마',
    titleLabel: '드라마 제목',
    titlePlaceholder: '예: 오징어 게임, 이상한 변호사 우영우...',
    reviewPlaceholder: '보고 느낀 점, 인상 깊었던 에피소드를 자유롭게 써주세요...',
  },
  {
    value: 'anime',
    icon: '✨',
    label: '애니',
    titleLabel: '애니메이션 제목',
    titlePlaceholder: '예: 센과 치히로, 너의 이름은...',
    reviewPlaceholder: '보고 느낀 점, 인상 깊었던 장면을 자유롭게 써주세요...',
  },
];

const tabs = [
  { key: 'similar',   emoji: '✅', label: '비슷한 시각' },
  { key: 'different', emoji: '🔄', label: '다른 시각' },
  { key: 'missed',    emoji: '💡', label: '놓친 관점' },
];

const mediaType = ref('book');
const title = ref('');
const review = ref('');
const result = ref(null);
const sources = ref([]);
const loading = ref(false);
const error = ref('');
const activeTab = ref('similar');

const current = computed(() => mediaTypes.find((t) => t.value === mediaType.value));

function formatMarkdown(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let html = '';
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) { html += '</ul>'; inList = false; }
      continue;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${renderInline(trimmed.slice(2))}</li>`;
    } else if (trimmed.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3>${renderInline(trimmed.slice(4))}</h3>`;
    } else if (trimmed.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h2>${renderInline(trimmed.slice(3))}</h2>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p>${renderInline(trimmed)}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

function renderInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

const formattedTab = computed(() => {
  if (!result.value) return '';
  return formatMarkdown(result.value[activeTab.value] || '');
});

async function analyze() {
  if (!title.value || !review.value) return;
  loading.value = true;
  error.value = '';
  result.value = null;
  sources.value = [];
  activeTab.value = 'similar';

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaType: mediaType.value,
        title: title.value,
        review: review.value,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '분석 중 오류가 발생했습니다.');
    result.value = data.result;
    sources.value = data.sources || [];
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.app {
  display: grid;
  grid-template-columns: 400px 1fr;
  height: 100vh;
  overflow: hidden;
  font-family: 'Pretendard', 'Apple SD Gothic Neo', sans-serif;
}

/* ── Left Panel ── */
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 32px 28px;
  background: #fff;
  border-right: 1px solid #ebebf5;
  overflow-y: auto;
}

.brand h1 {
  font-size: 1.6rem;
  font-weight: 800;
  color: #1a1a2e;
  letter-spacing: -0.5px;
}

.brand p {
  font-size: 0.875rem;
  color: #888;
  margin-top: 4px;
}

.media-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.media-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border: 2px solid #ebebf5;
  border-radius: 12px;
  background: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  color: #888;
  cursor: pointer;
  transition: all 0.15s;
}

.media-btn:hover { border-color: #c5c0f5; color: #6c63ff; }
.media-btn.active { border-color: #6c63ff; background: #f0efff; color: #6c63ff; }

.media-icon { font-size: 1.3rem; }

.fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field.grow { flex: 1; }
.field.grow textarea { flex: 1; resize: none; min-height: 180px; }

label { font-size: 0.85rem; font-weight: 600; color: #444; }

input, textarea {
  padding: 11px 14px;
  border: 2px solid #ebebf5;
  border-radius: 10px;
  font-size: 0.95rem;
  font-family: inherit;
  color: #1a1a2e;
  transition: border-color 0.15s;
}

input:focus, textarea:focus { outline: none; border-color: #6c63ff; }
input:disabled, textarea:disabled { background: #fafafa; color: #aaa; }

.btn-analyze {
  padding: 13px;
  background: #6c63ff;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  flex-shrink: 0;
}

.btn-analyze:hover:not(:disabled) { background: #574fd6; transform: translateY(-1px); }
.btn-analyze:disabled { background: #ddd; cursor: not-allowed; }

/* ── Right Panel ── */
.right-panel {
  background: #f7f7fb;
  padding: 32px 36px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #aaa;
  text-align: center;
  line-height: 1.7;
}

.empty-icon { font-size: 3rem; opacity: 0.5; }

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: #888;
  text-align: center;
  line-height: 1.8;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e0e0f0;
  border-top-color: #6c63ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Result */
.result-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.result-header { display: flex; align-items: center; }

.result-badge {
  display: inline-block;
  background: #6c63ff;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 20px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #ebebf5;
  padding-bottom: 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-size: 0.9rem;
  font-weight: 600;
  color: #aaa;
  cursor: pointer;
  margin-bottom: -2px;
  transition: all 0.15s;
  border-radius: 8px 8px 0 0;
}

.tab-btn:hover { color: #6c63ff; background: #f0efff; }
.tab-btn.active { color: #6c63ff; border-bottom-color: #6c63ff; background: transparent; }

/* Tab Content */
.tab-content {
  background: #fff;
  border-radius: 0 12px 12px 12px;
  padding: 24px 28px;
  border: 1px solid #ebebf5;
  line-height: 1.85;
  color: #333;
  font-size: 0.95rem;
  flex: 1;
  overflow-y: auto;
  text-align: left;
}

.tab-content :deep(h2) {
  font-size: 1.05rem;
  color: #1a1a2e;
  font-weight: 700;
  margin: 20px 0 10px;
  text-align: left;
}

.tab-content :deep(h3) {
  font-size: 0.95rem;
  color: #6c63ff;
  font-weight: 700;
  margin: 16px 0 8px;
  text-align: left;
}

.tab-content :deep(p) {
  margin: 0 0 12px;
  text-align: left;
}

.tab-content :deep(ul) {
  list-style: none;
  padding: 0;
  margin: 6px 0 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tab-content :deep(li) {
  padding: 12px 16px;
  background: #f9f9ff;
  border-left: 3px solid #6c63ff;
  border-radius: 0 8px 8px 0;
  line-height: 1.75;
  text-align: left;
}

.tab-content :deep(strong) { color: #1a1a2e; font-weight: 700; }
.tab-content :deep(em) { color: #555; }

/* Sources */
.sources {
  padding: 16px 20px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #ebebf5;
}

.sources h4 {
  font-size: 0.85rem;
  font-weight: 700;
  color: #888;
  margin-bottom: 10px;
}

.sources ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sources a {
  font-size: 0.85rem;
  color: #6c63ff;
  text-decoration: none;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sources a:hover { text-decoration: underline; }

.error-section {
  margin-top: 16px;
  padding: 14px 18px;
  background: #fff0f0;
  border-radius: 10px;
  color: #cc0000;
  font-size: 0.9rem;
}
</style>
