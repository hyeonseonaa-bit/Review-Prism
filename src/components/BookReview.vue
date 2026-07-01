<template>
  <div class="app">
    <!-- Left Panel -->
    <div class="left-panel">
      <div class="brand">
        <h1>Review Prism</h1>
        <p>다양한 시각으로 감상하기</p>
      </div>

      <div class="divider"></div>

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
          <label>나의 감상 <span class="label-sub">— 자유롭게 써주세요</span></label>
          <textarea class="textarea-journal" v-model="review" :placeholder="current.reviewPlaceholder" :disabled="loading" />
        </div>
      </div>

      <button @click="analyze" :disabled="loading || !title || !review" class="btn-analyze">
        {{ loading ? '분석 중...' : '분석하기' }}
      </button>
    </div>

    <!-- Right Panel -->
    <div class="right-panel">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>다른 사람들의 감상을 검색하고<br>비교 분석 중입니다</p>
      </div>

      <div v-else-if="result" class="result-wrap">
        <div class="result-header">
          <h2 class="result-title">{{ title }}</h2>
          <span class="result-type">{{ current.label }}</span>
        </div>

        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['tab-btn', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            <span class="tab-label">{{ tab.label }}</span>
            <span v-if="tab.sub" class="tab-sub">{{ tab.sub }}</span>
          </button>
        </div>

        <div class="tab-content" v-html="formattedTab"></div>

        <div v-if="tabSources.length" class="sources">
          <h4>참고 출처</h4>
          <ol>
            <li v-for="source in tabSources" :key="source.url">
              <span class="src-num">[{{ source.n }}]</span>
              <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}</a>
            </li>
          </ol>
        </div>
      </div>

      <div v-else class="empty-state">
        <p class="empty-headline">당신의 감상을 분석해 드립니다</p>
        <p class="empty-sub">작품 정보와 감상을 입력하면<br>다양한 시각을 담은 분석이 여기에 나타납니다</p>
      </div>

      <div v-if="error" class="error-section">
        <p>{{ error }}</p>
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
    reviewPlaceholder: '읽으면서 어떤 감정이 들었나요? 인상 깊었던 문장이나 장면, 나에게 남은 것들을 자유롭게 적어주세요.',
  },
  {
    value: 'movie',
    icon: '🎬',
    label: '영화',
    titleLabel: '영화 제목',
    titlePlaceholder: '예: 기생충, 올드보이, 버닝...',
    reviewPlaceholder: '영화를 보고 난 후 어떤 생각이 남았나요? 장면, 대사, 여운 등 떠오르는 것을 자유롭게 적어주세요.',
  },
  {
    value: 'drama',
    icon: '📺',
    label: '드라마',
    titleLabel: '드라마 제목',
    titlePlaceholder: '예: 오징어 게임, 이상한 변호사 우영우...',
    reviewPlaceholder: '인상 깊었던 에피소드나 캐릭터, 전체적인 감상을 자유롭게 적어주세요.',
  },
  {
    value: 'anime',
    icon: '✨',
    label: '애니',
    titleLabel: '애니메이션 제목',
    titlePlaceholder: '예: 센과 치히로, 너의 이름은...',
    reviewPlaceholder: '보고 난 후 남은 감정이나 인상 깊었던 장면, 생각들을 자유롭게 적어주세요.',
  },
];

const tabs = [
  { key: 'similar',   label: '비슷한 시각',  sub: '' },
  { key: 'different', label: '다른 시각',    sub: '' },
  { key: 'missed',    label: '놓친 관점',    sub: '내가 생각 못 했던 해석' },
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
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(\d+)\]/g, (_, n) => {
      const src = sources.value.find((s) => s.n === Number(n));
      if (!src) return `<sup class="cite-num">[${n}]</sup>`;
      return `<sup class="cite-num"><a href="${src.url}" target="_blank" rel="noopener noreferrer">[${n}]</a></sup>`;
    });
}

const formattedTab = computed(() => {
  if (!result.value) return '';
  return formatMarkdown(result.value[activeTab.value] || '');
});

const tabSources = computed(() => {
  if (!result.value || !sources.value.length) return [];
  const text = result.value[activeTab.value] || '';
  const cited = new Set([...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
  return sources.value.filter((s) => cited.has(s.n)).sort((a, b) => a.n - b.n);
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
  grid-template-columns: 480px 1fr;
  height: 100vh;
  overflow: hidden;
}

/* ── Left Panel ── */
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 40px 30px;
  background: #fff;
  border-right: 1px solid #DDD9D0;
  overflow-y: auto;
}

.brand h1 {
  font-size: 1.4rem;
  font-weight: 700;
  color: #18181B;
  letter-spacing: -0.3px;
  font-family: Georgia, 'Batang', serif;
}

.brand p {
  font-size: 0.78rem;
  color: #9C9890;
  margin-top: 6px;
  letter-spacing: 0.02em;
}

.divider {
  height: 1px;
  background: #EDEAE4;
}

/* Media Selector */
.media-selector {
  display: flex;
  gap: 8px;
}

.media-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px 4px;
  border: 1px solid #DDD9D0;
  border-radius: 2px;
  background: #fff;
  font-size: 0.8rem;
  font-weight: 500;
  color: #9C9890;
  cursor: pointer;
  transition: all 0.12s;
  letter-spacing: 0.01em;
}

.media-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.media-btn:hover {
  border-color: #1C2B4B;
  color: #1C2B4B;
}

.media-btn.active {
  border-color: #1C2B4B;
  background: #1C2B4B;
  color: #fff;
}

/* Fields */
.fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.field.grow {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.field.grow textarea {
  flex: 1;
  resize: none;
  min-height: 150px;
}

label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #4A4742;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.label-sub {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0.01em;
  color: #ABA69F;
  font-size: 0.68rem;
}

input {
  padding: 11px 13px;
  border: 1px solid #DDD9D0;
  border-radius: 2px;
  font-size: 0.88rem;
  font-family: inherit;
  color: #18181B;
  background: #FDFCFA;
  transition: border-color 0.12s, background 0.12s;
  line-height: 1.65;
}

input::placeholder {
  color: #C4BFB8;
}

input:focus {
  outline: none;
  border-color: #1C2B4B;
  background: #fff;
}

input:disabled {
  background: #F4F2EE;
  color: #C4BFB8;
}

.textarea-journal {
  flex: 1;
  resize: none;
  min-height: 150px;
  padding: 18px 18px;
  border: 1px solid #DDD9D0;
  border-top: 3px solid #1C2B4B;
  border-radius: 0 0 2px 2px;
  font-size: 0.92rem;
  font-family: Georgia, 'Batang', serif;
  color: #2A2825;
  background: #FFFDF8;
  line-height: 2;
  transition: border-color 0.12s, box-shadow 0.12s;
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.03);
}

.textarea-journal::placeholder {
  color: #C4BFB8;
  font-style: italic;
  font-family: Georgia, 'Batang', serif;
  line-height: 2;
}

.textarea-journal:focus {
  outline: none;
  border-color: #DDD9D0;
  border-top-color: #1C2B4B;
  background: #FFFEFC;
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.04);
}

.textarea-journal:disabled {
  background: #F4F2EE;
  color: #C4BFB8;
}

/* Analyze Button */
.btn-analyze {
  padding: 14px;
  background: #1C2B4B;
  color: #fff;
  border: none;
  border-radius: 2px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}

.btn-analyze:hover:not(:disabled) {
  background: #243660;
}

.btn-analyze:disabled {
  background: #C8C4BC;
  cursor: not-allowed;
}

/* ── Right Panel ── */
.right-panel {
  background: #F7F5F0;
  padding: 40px 48px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
}

.empty-headline {
  font-size: 1.1rem;
  font-weight: 600;
  color: #4A4742;
  font-family: Georgia, 'Batang', serif;
  letter-spacing: -0.2px;
}

.empty-sub {
  font-size: 0.84rem;
  color: #ABA69F;
  line-height: 1.85;
}

/* Loading */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: #9C9890;
  text-align: center;
  line-height: 1.8;
  font-size: 0.88rem;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid #DDD9D0;
  border-top-color: #1C2B4B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Result */
.result-wrap {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 20px;
  margin-bottom: 0;
}

.result-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #18181B;
  font-family: Georgia, 'Batang', serif;
  letter-spacing: -0.5px;
}

.result-type {
  font-size: 0.7rem;
  font-weight: 600;
  color: #7A7469;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: #EDEAE4;
  padding: 3px 8px;
  border-radius: 2px;
  color: #7A7469;
}

/* Tabs */
.tabs {
  display: flex;
  border-bottom: 1px solid #DDD9D0;
  margin-bottom: 0;
}

.tab-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 12px 24px 10px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  margin-bottom: -1px;
  transition: all 0.12s;
}

.tab-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #B0ABA4;
  letter-spacing: 0.01em;
  transition: color 0.12s;
}

.tab-sub {
  font-size: 0.68rem;
  color: #C8C4BC;
  letter-spacing: 0.01em;
  transition: color 0.12s;
}

.tab-btn:hover .tab-label { color: #1C2B4B; }
.tab-btn:hover .tab-sub   { color: #9C9890; }

.tab-btn.active { border-bottom-color: #1C2B4B; }
.tab-btn.active .tab-label { color: #1C2B4B; font-weight: 700; }
.tab-btn.active .tab-sub   { color: #7A8FA8; }

/* Tab Content */
.tab-content {
  background: transparent;
  padding: 28px 0 20px;
  line-height: 1.95;
  color: #2A2825;
  font-size: 0.91rem;
  flex: 1;
  overflow-y: auto;
}

.tab-content :deep(h2) {
  font-size: 0.95rem;
  font-weight: 700;
  color: #18181B;
  margin: 24px 0 10px;
  font-family: Georgia, 'Batang', serif;
}

.tab-content :deep(h3) {
  font-size: 0.82rem;
  font-weight: 700;
  color: #7A7469;
  margin: 18px 0 8px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.tab-content :deep(p) {
  margin: 0 0 14px;
  color: #3A3733;
}

.tab-content :deep(ul) {
  list-style: none;
  padding: 0;
  margin: 0 0 8px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tab-content :deep(li) {
  padding: 16px 0 16px 20px;
  border-bottom: 1px solid #EDEAE4;
  line-height: 1.85;
  color: #2A2825;
  position: relative;
}

.tab-content :deep(li::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 24px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #C4BFB8;
}

.tab-content :deep(li:last-child) {
  border-bottom: none;
}

.tab-content :deep(strong) {
  color: #18181B;
  font-weight: 700;
}

.tab-content :deep(em) {
  color: #5A5652;
}

.tab-content :deep(.cite-num) {
  font-size: 0.68em;
  vertical-align: super;
  line-height: 0;
  margin-left: 2px;
}

.tab-content :deep(.cite-num a) {
  color: #1C2B4B;
  text-decoration: none;
  font-weight: 700;
}

.tab-content :deep(.cite-num a:hover) {
  text-decoration: underline;
}

/* Sources */
.sources {
  padding: 18px 0 0;
  border-top: 1px solid #EDEAE4;
  margin-top: 8px;
}

.sources h4 {
  font-size: 0.68rem;
  font-weight: 700;
  color: #B0ABA4;
  margin-bottom: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.sources ol {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sources li {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 0.78rem;
}

.src-num {
  color: #1C2B4B;
  font-weight: 700;
  font-size: 0.72rem;
  flex-shrink: 0;
  min-width: 20px;
}

.sources a {
  color: #7A7469;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  transition: color 0.1s;
}

.sources a:hover {
  color: #1C2B4B;
}

/* Error */
.error-section {
  margin-top: 16px;
  padding: 14px 18px;
  background: #FFF5F5;
  border-left: 2px solid #CC3333;
  color: #CC3333;
  font-size: 0.875rem;
}
</style>
