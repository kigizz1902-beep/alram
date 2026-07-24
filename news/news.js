function stripHtmlTags(str) {
  const withoutTags = str.replace(/<[^>]*>/g, "");
  const el = document.createElement("textarea");
  el.innerHTML = withoutTags;
  return el.textContent;
}

const newsBtn = document.getElementById("news-btn");
const newsListEl = document.getElementById("news-list");
const briefingListEl = document.getElementById("briefing-list");
const stopBriefingBtn = document.getElementById("stop-briefing-btn");

const ORDINAL_WORDS = ["첫번째", "두번째", "세번째", "네번째", "다섯번째"];

function buildNewsCard(item) {
  const card = document.createElement("article");
  card.className = "news-card";

  const title = document.createElement("h3");
  title.className = "news-card-title";
  title.textContent = stripHtmlTags(item.title);

  const desc = document.createElement("p");
  desc.className = "news-card-desc";
  desc.textContent = stripHtmlTags(item.description);

  const meta = document.createElement("div");
  meta.className = "news-card-meta";

  const date = document.createElement("span");
  date.className = "news-card-date";
  date.textContent = item.pubDate;

  const link = document.createElement("a");
  link.className = "news-card-link";
  link.href = item.link;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "원문보기";

  meta.appendChild(date);
  meta.appendChild(link);

  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(meta);

  return card;
}

function renderNewsList(items) {
  newsListEl.innerHTML = "";
  for (const item of items) {
    newsListEl.appendChild(buildNewsCard(item));
  }
}

function renderNewsLoading() {
  newsListEl.innerHTML = "";
  const loadingEl = document.createElement("p");
  loadingEl.className = "news-status";
  loadingEl.textContent = "불러오는 중...";
  newsListEl.appendChild(loadingEl);
}

function renderNewsError() {
  newsListEl.innerHTML = "";
  const errorEl = document.createElement("p");
  errorEl.className = "news-status";
  errorEl.textContent = "뉴스를 불러올 수 없습니다.";
  newsListEl.appendChild(errorEl);
}

function renderNewsEmpty() {
  newsListEl.innerHTML = "";
  const emptyEl = document.createElement("p");
  emptyEl.className = "news-status";
  emptyEl.textContent = "표시할 뉴스가 없습니다.";
  newsListEl.appendChild(emptyEl);
}

function renderNewsTimeout(onRetry) {
  newsListEl.innerHTML = "";
  const timeoutEl = document.createElement("p");
  timeoutEl.className = "news-status";
  timeoutEl.textContent = "뉴스를 불러올 수 없습니다.";
  newsListEl.appendChild(timeoutEl);

  const retryBtn = document.createElement("button");
  retryBtn.className = "news-retry-btn";
  retryBtn.textContent = "재시도";
  retryBtn.addEventListener("click", onRetry);
  newsListEl.appendChild(retryBtn);
}

async function fetchRecentNews(keyword, count = 5) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(SUPABASE_NEWS_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, count }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error("뉴스를 불러올 수 없습니다.");
    }

    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildBriefingText(items) {
  return items
    .map((item, index) => {
      const ordinal = ORDINAL_WORDS[index] ?? `${index + 1}번째`;
      return `${ordinal} 뉴스, ${stripHtmlTags(item.title)}.`;
    })
    .join(" ");
}

function renderNewsBriefing(items) {
  briefingListEl.innerHTML = "";
  for (const item of items) {
    const card = document.createElement("p");
    card.className = "briefing-card";
    card.textContent = stripHtmlTags(item.title);
    briefingListEl.appendChild(card);
  }
}

function speakBriefing(text) {
  if (!("speechSynthesis" in window)) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  speechSynthesis.speak(utterance);
}

function stopBriefing() {
  if (!("speechSynthesis" in window)) return;

  speechSynthesis.cancel();
}

stopBriefingBtn.addEventListener("click", stopBriefing);

const loadNews = async () => {
  renderNewsLoading();
  try {
    const data = await fetchRecentNews("최신 날씨 뉴스");
    const items = data.items ?? [];
    if (items.length === 0) {
      renderNewsEmpty();
    } else {
      renderNewsList(items);
    }
  } catch (err) {
    if (err.name === "AbortError") {
      renderNewsTimeout(loadNews);
    } else {
      renderNewsError();
    }
  }
};

newsBtn.addEventListener("click", loadNews);

loadNews();
