const STORAGE_KEY = "my_bookshelf_data";

const state = {
  books: loadBooks(),
  status: "all",
  searchFilter: "all",
  activeBookId: null,
  activeRating: 0
};

function loadBooks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.books));
  renderAll();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAuthors(authors) {
  return Array.isArray(authors) && authors.length ? authors.join(", ") : "著者不明";
}

function placeholderCover(title) {
  const safeTitle = escapeHtml(title || "No Title");
  return `<div class="placeholder-cover">${safeTitle}</div>`;
}

function statusLabel(status) {
  return status === "reading" ? "読書中" : status === "completed" ? "読了" : "積読";
}

function stars(rating) {
  if (!rating) return "";
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function renderAll() {
  renderStats();
  renderTabs();
  renderShelf();
  renderSearchCards(document.querySelectorAll(".search-card").length ? window.lastSearchItems : null);
}

function renderStats() {
  const now = new Date();
  const completed = state.books.filter(book => book.status === "completed");
  const monthCompleted = completed.filter(book => {
    if (!book.completedDate) return false;
    const date = new Date(`${book.completedDate}T00:00:00`);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;

  document.getElementById("monthCompleted").textContent = monthCompleted;
  document.getElementById("totalCompleted").textContent = completed.length;
  document.getElementById("tsundokuCount").textContent = state.books.filter(book => book.status === "tsundoku").length;
}

function renderTabs() {
  const counts = {
    all: state.books.length,
    tsundoku: state.books.filter(book => book.status === "tsundoku").length,
    reading: state.books.filter(book => book.status === "reading").length,
    completed: state.books.filter(book => book.status === "completed").length
  };
  document.getElementById("countAll").textContent = counts.all;
  document.getElementById("countTsundoku").textContent = counts.tsundoku;
  document.getElementById("countReading").textContent = counts.reading;
  document.getElementById("countCompleted").textContent = counts.completed;
}

function sortedBooks() {
  const term = document.getElementById("shelfSearch").value.trim().toLowerCase();
  let books = state.books.filter(book => {
    const statusMatch = state.status === "all" || book.status === state.status;
    const textMatch = !term || book.title.toLowerCase().includes(term) || formatAuthors(book.authors).toLowerCase().includes(term);
    return statusMatch && textMatch;
  });

  const sort = document.getElementById("sortShelf").value;
  return books.sort((a, b) => {
    if (sort === "ratingDesc") return (b.rating || 0) - (a.rating || 0) || new Date(b.addedAt) - new Date(a.addedAt);
    if (sort === "completedDesc") return (b.completedDate || "").localeCompare(a.completedDate || "") || new Date(b.addedAt) - new Date(a.addedAt);
    return new Date(b.addedAt) - new Date(a.addedAt);
  });
}

function renderShelf() {
  const grid = document.getElementById("shelfGrid");
  const books = sortedBooks();
  if (!books.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div>
          <svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg>
          <h3>本棚に本がありません</h3>
          <p>「本を検索」から最初の1冊を登録しましょう。</p>
        </div>
      </div>`;
    return;
  }

  grid.innerHTML = books.map(book => `
    <article class="book-card clickable" data-book-id="${escapeHtml(book.id)}" tabindex="0">
      <div class="book-card-cover">
        ${book.thumbnail ? `<img src="${escapeHtml(book.thumbnail)}" alt="${escapeHtml(book.title)}" loading="lazy">` : placeholderCover(book.title)}
      </div>
      <div class="book-card-body">
        <span class="status-badge ${book.status === "reading" ? "reading" : book.status === "completed" ? "completed" : ""}">${statusLabel(book.status)}</span>
        <h3 title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h3>
        <p class="book-card-author">${escapeHtml(formatAuthors(book.authors))}</p>
        ${book.rating ? `<div class="card-rating">${stars(book.rating)}</div>` : ""}
      </div>
    </article>`).join("");
}

function switchView(view) {
  document.getElementById("shelfView").classList.toggle("hidden", view !== "shelf");
  document.getElementById("searchView").classList.toggle("hidden", view !== "search");
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.nav === view));
}

async function fetchGoogleBooks(query) {
  const hosts = [
    "https://www.googleapis.com",
    "https://books.googleapis.com"
  ];
  let lastError = null;

  for (const host of hosts) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(
          `${host}/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=18&printType=books`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          lastError = new Error(`Google Books API: HTTP ${response.status}`);
          throw lastError;
        } else {
          const data = await response.json();
          return data.items || [];
        }
      } catch (error) {
        lastError = error;
      } finally {
        window.clearTimeout(timeoutId);
      }
      await new Promise(resolve => window.setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError || new Error("Google Books APIへの接続に失敗しました");
}

async function fetchOpenLibrary(query, term) {
  const typePrefix = query !== term ? query.slice(0, query.indexOf(":") + 1) : "";
  let params = `q=${encodeURIComponent(term)}&limit=18&fields=key,title,author_name,first_publish_year,isbn,cover_i`;
  if (typePrefix === "inauthor:") params = `author=${encodeURIComponent(term)}&limit=18&fields=key,title,author_name,first_publish_year,isbn,cover_i`;
  if (typePrefix === "intitle:") params = `title=${encodeURIComponent(term)}&limit=18&fields=key,title,author_name,first_publish_year,isbn,cover_i`;
  if (typePrefix === "isbn:") params = `isbn=${encodeURIComponent(term)}&limit=18&fields=key,title,author_name,first_publish_year,isbn,cover_i`;

  const response = await fetch(`https://openlibrary.org/search.json?${params}`);
  if (!response.ok) throw new Error("代替検索サービスへの接続に失敗しました");
  const data = await response.json();
  return (data.docs || []).map(doc => ({
    id: doc.key?.replace("/works/", "") || `openlibrary-${doc.title}-${doc.isbn?.[0] || ""}`,
    volumeInfo: {
      title: doc.title || "タイトル不明",
      authors: doc.author_name || [],
      publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : "",
      imageLinks: doc.cover_i ? { thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` } : undefined
    }
  }));
}

async function searchBooks(event) {
  if (event) event.preventDefault();
  const input = document.getElementById("bookSearchInput");
  const term = input.value.trim();
  if (!term) {
    showToast("検索キーワードを入力してください");
    input.focus();
    return;
  }

  let query = term;
  if (state.searchFilter === "title") query = `intitle:${term}`;
  if (state.searchFilter === "author") query = `inauthor:${term}`;
  if (state.searchFilter === "isbn") query = `isbn:${term}`;

  const status = document.getElementById("searchStatus");
  const grid = document.getElementById("searchGrid");
  status.textContent = "検索中...";
  grid.innerHTML = "";

  try {
    let usedFallback = false;
    let items = [];
    try {
      items = await fetchGoogleBooks(query);
    } catch {
      usedFallback = true;
      items = await fetchOpenLibrary(query, term);
    }
    if (!items.length && !usedFallback) {
      items = await fetchOpenLibrary(query, term);
      usedFallback = true;
    }
    window.lastSearchItems = items;
    document.getElementById("searchResultLabel").textContent = "検索結果";
    status.textContent = `${window.lastSearchItems.length}件`;
    if (usedFallback) status.textContent += "（代替検索）";
    renderSearchCards(window.lastSearchItems);
  } catch (error) {
    status.textContent = "";
    const rateLimited = error.message.includes("429");
    grid.innerHTML = `
      <div class="empty-state">
        <div>
          <h3>検索できませんでした</h3>
          <p>${rateLimited ? "検索サービスが混雑しています。少し待ってから再試行してください。" : "通信環境を確認して、もう一度お試しください。"}</p>
          <button type="button" class="add-button" id="retrySearchButton" style="margin-top:14px">再試行</button>
        </div>
      </div>`;
    document.getElementById("retrySearchButton").addEventListener("click", () => searchBooks());
  }
}

function renderSearchCards(items) {
  if (!items) return;
  const grid = document.getElementById("searchGrid");
  if (!items.length) {
    grid.innerHTML = `<div class="empty-state"><div><h3>該当する本が見つかりませんでした</h3><p>キーワードを変更して再度検索してください。</p></div></div>`;
    return;
  }

  grid.innerHTML = items.map(item => {
    const info = item.volumeInfo || {};
    const isRegistered = state.books.some(book => book.id === item.id);
    const thumbnail = info.imageLinks?.thumbnail?.replace("http://", "https://") || "";
    const authors = formatAuthors(info.authors);
    const publishedDate = info.publishedDate ? info.publishedDate.slice(0, 10) : "";
    return `
      <article class="search-card">
        <div class="search-cover">
          ${thumbnail ? `<img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(info.title || "")}" loading="lazy">` : placeholderCover(info.title)}
        </div>
        <div class="search-card-content">
          <h3>${escapeHtml(info.title || "タイトル不明")}</h3>
          <p class="search-card-author">${escapeHtml(authors)}</p>
          ${publishedDate ? `<span class="search-card-date">${escapeHtml(publishedDate)}</span>` : ""}
          <button class="add-button ${isRegistered ? "registered" : ""}" data-add-id="${escapeHtml(item.id)}" ${isRegistered ? "disabled" : ""}>
            ${isRegistered ? "登録済み" : "+ 積読に追加"}
          </button>
        </div>
      </article>`;
  }).join("");
}

function addBook(itemId) {
  if (state.books.some(book => book.id === itemId)) return;
  const item = (window.lastSearchItems || []).find(entry => entry.id === itemId);
  if (!item) return;
  const info = item.volumeInfo || {};
  state.books.push({
    id: item.id,
    title: info.title || "タイトル不明",
    authors: info.authors || [],
    publishedDate: info.publishedDate || "",
    description: info.description || "",
    thumbnail: info.imageLinks?.thumbnail?.replace("http://", "https://") || "",
    status: "tsundoku",
    rating: 0,
    completedDate: "",
    memo: "",
    addedAt: new Date().toISOString()
  });
  saveBooks();
  showToast("本棚に追加しました");
  renderSearchCards(window.lastSearchItems);
}

function openBookModal(id) {
  const book = state.books.find(entry => entry.id === id);
  if (!book) return;
  state.activeBookId = id;
  state.activeRating = book.rating || 0;
  document.getElementById("modalTitle").textContent = book.title;
  document.getElementById("modalAuthor").textContent = formatAuthors(book.authors);
  document.getElementById("modalStatus").value = book.status;
  document.getElementById("completedDate").value = book.completedDate || "";
  document.getElementById("bookMemo").value = book.memo || "";
  document.getElementById("modalCover").innerHTML = book.thumbnail
    ? `<img src="${escapeHtml(book.thumbnail)}" alt="${escapeHtml(book.title)}">`
    : placeholderCover(book.title);
  renderRatingStars();
  document.getElementById("bookModal").classList.add("open");
  document.getElementById("bookModal").setAttribute("aria-hidden", "false");
}

function closeBookModal() {
  document.getElementById("bookModal").classList.remove("open");
  document.getElementById("bookModal").setAttribute("aria-hidden", "true");
  state.activeBookId = null;
}

function renderRatingStars() {
  const container = document.getElementById("ratingStars");
  container.innerHTML = [1, 2, 3, 4, 5].map(rating =>
    `<button type="button" class="star-button ${rating <= state.activeRating ? "active" : ""}" data-rating="${rating}" aria-label="${rating}">★</button>`
  ).join("");
}

function saveActiveBook() {
  const book = state.books.find(entry => entry.id === state.activeBookId);
  if (!book) return;
  book.status = document.getElementById("modalStatus").value;
  book.rating = state.activeRating;
  book.completedDate = book.status === "completed" ? document.getElementById("completedDate").value : "";
  book.memo = document.getElementById("bookMemo").value;
  saveBooks();
  closeBookModal();
  showToast("読書記録を保存しました");
}

function deleteActiveBook() {
  const book = state.books.find(entry => entry.id === state.activeBookId);
  if (!book) return;
  if (!window.confirm(`「${book.title}」を本棚から削除しますか？`)) return;
  state.books = state.books.filter(entry => entry.id !== book.id);
  saveBooks();
  closeBookModal();
  showToast("本棚から削除しました");
}

function showRandomBook() {
  const candidates = state.books.filter(book => book.status === "tsundoku");
  const content = document.getElementById("randomContent");
  if (!candidates.length) {
    document.getElementById("randomTitle").textContent = "次に読む1冊";
    content.innerHTML = `<div class="random-empty"><p>積読リストに本がありません</p></div>`;
  } else {
    const book = candidates[Math.floor(Math.random() * candidates.length)];
    document.getElementById("randomTitle").textContent = "次に読む1冊";
    content.innerHTML = `
      <div class="random-result">
        ${book.thumbnail ? `<img src="${escapeHtml(book.thumbnail)}" alt="${escapeHtml(book.title)}">` : placeholderCover(book.title)}
        <div>
          <h3>${escapeHtml(book.title)}</h3>
          <p>${escapeHtml(formatAuthors(book.authors))}</p>
          <button class="save-button" id="openRandomBook">この本の記録を見る</button>
        </div>
      </div>`;
    document.getElementById("openRandomBook").addEventListener("click", () => {
      document.getElementById("randomModal").classList.remove("open");
      openBookModal(book.id);
    });
  }
  document.getElementById("randomModal").classList.add("open");
  document.getElementById("randomModal").setAttribute("aria-hidden", "false");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => switchView(button.dataset.nav)));
document.querySelectorAll(".status-tab").forEach(button => button.addEventListener("click", () => {
  state.status = button.dataset.status;
  document.querySelectorAll(".status-tab").forEach(tab => tab.classList.toggle("active", tab === button));
  renderShelf();
}));
document.querySelectorAll(".type-button").forEach(button => button.addEventListener("click", () => {
  state.searchFilter = button.dataset.filter;
  document.querySelectorAll(".type-button").forEach(tab => tab.classList.toggle("active", tab === button));
}));

document.getElementById("bookSearchForm").addEventListener("submit", searchBooks);
document.getElementById("shelfSearch").addEventListener("input", renderShelf);
document.getElementById("sortShelf").addEventListener("change", renderShelf);

document.getElementById("searchGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-add-id]");
  if (button) addBook(button.dataset.addId);
});

document.getElementById("shelfGrid").addEventListener("click", event => {
  const card = event.target.closest("[data-book-id]");
  if (card) openBookModal(card.dataset.bookId);
});
document.getElementById("shelfGrid").addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest("[data-book-id]");
  if (card) openBookModal(card.dataset.bookId);
});

document.getElementById("closeBookModal").addEventListener("click", closeBookModal);
document.getElementById("saveBookButton").addEventListener("click", saveActiveBook);
document.getElementById("deleteBookButton").addEventListener("click", deleteActiveBook);
document.getElementById("ratingStars").addEventListener("click", event => {
  const button = event.target.closest("[data-rating]");
  if (!button) return;
  state.activeRating = Number(button.dataset.rating);
  renderRatingStars();
});

document.getElementById("randomBookButton").addEventListener("click", showRandomBook);
document.getElementById("closeRandomModal").addEventListener("click", () => {
  document.getElementById("randomModal").classList.remove("open");
  document.getElementById("randomModal").setAttribute("aria-hidden", "true");
});

document.querySelectorAll(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", event => {
  if (event.target !== backdrop) return;
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
}));

document.getElementById("settingsButton").addEventListener("click", () => {
  switchView("search");
  document.getElementById("bookSearchInput").focus();
});

renderAll();
