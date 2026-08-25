const config = window.FUKUSHUJI_CONFIG || {};
const hasSupabaseConfig =
  Boolean(config.SUPABASE_URL) &&
  Boolean(config.SUPABASE_ANON_KEY) &&
  Boolean(window.supabase);

const sampleExams = [
  { name: "英語 中間テスト" },
  { name: "日本史 小テスト" }
];

const sampleQuestions = [
  {
    examName: "英語 中間テスト",
    question: "次のうち、'important' に最も近い意味はどれ？",
    choices: ["重要な", "珍しい", "静かな", "複雑な"],
    correct_index: 0,
    is_favorite: true,
    memo: "important = 重要な。名詞形は importance。"
  },
  {
    examName: "英語 中間テスト",
    question: "次の文の空欄に入る語は？ I have lived here ___ 2020.",
    choices: ["for", "since", "during", "by"],
    correct_index: 1,
    is_favorite: false,
    memo: "起点の年を表すので since。期間なら for。"
  },
  {
    examName: "日本史 小テスト",
    question: "鎌倉幕府を開いた人物は誰？",
    choices: ["平清盛", "源頼朝", "足利尊氏", "徳川家康"],
    correct_index: 1,
    is_favorite: false,
    memo: "1192年ではなく、現在は1185年成立説も扱われることが多い。"
  }
];

const els = {
  syncBadge: document.querySelector("#sync-badge"),
  logoutButton: document.querySelector("#logout-button"),
  authPanel: document.querySelector("#auth-panel"),
  setupPanel: document.querySelector("#setup-panel"),
  appPanel: document.querySelector("#app-panel"),
  loginForm: document.querySelector("#login-form"),
  emailInput: document.querySelector("#email-input"),
  authMessage: document.querySelector("#auth-message"),
  resetLocalButton: document.querySelector("#reset-local-button"),
  tabButtons: document.querySelectorAll(".tab-button"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  studyExamSelect: document.querySelector("#study-exam-select"),
  shuffleToggle: document.querySelector("#shuffle-toggle"),
  sessionCorrect: document.querySelector("#session-correct"),
  sessionWrong: document.querySelector("#session-wrong"),
  sessionRate: document.querySelector("#session-rate"),
  questionCard: document.querySelector("#question-card"),
  examForm: document.querySelector("#exam-form"),
  examId: document.querySelector("#exam-id"),
  examName: document.querySelector("#exam-name"),
  examCancel: document.querySelector("#exam-cancel"),
  examList: document.querySelector("#exam-list"),
  questionForm: document.querySelector("#question-form"),
  questionId: document.querySelector("#question-id"),
  questionExam: document.querySelector("#question-exam"),
  questionText: document.querySelector("#question-text"),
  questionChoices: document.querySelector("#question-choices"),
  questionCorrect: document.querySelector("#question-correct"),
  questionMemo: document.querySelector("#question-memo"),
  questionFavorite: document.querySelector("#question-favorite"),
  questionFormMessage: document.querySelector("#question-form-message"),
  questionCancel: document.querySelector("#question-cancel"),
  questionList: document.querySelector("#question-list"),
  favoriteList: document.querySelector("#favorite-list"),
  pastExamFiles: document.querySelector("#past-exam-files"),
  pastExamFolder: document.querySelector("#past-exam-folder"),
  pastExamImport: document.querySelector("#past-exam-import"),
  pastExamImportMessage: document.querySelector("#past-exam-import-message")
};

const state = {
  mode: hasSupabaseConfig ? "supabase" : "local",
  client: null,
  store: null,
  user: null,
  exams: [],
  questions: [],
  activeTab: "study",
  selectedExamId: "all",
  currentQuestionId: null,
  answeredChoice: null,
  sessionCorrect: 0,
  sessionWrong: 0,
  loading: false
};

class LocalStore {
  constructor() {
    this.examKey = "fukushuji.exams";
    this.questionKey = "fukushuji.questions";
    this.resultKey = "fukushuji.study_results";
  }

  async getExams() {
    return this.read(this.examKey);
  }

  async getQuestions() {
    return this.read(this.questionKey);
  }

  async saveExam(exam) {
    const exams = await this.getExams();
    const now = new Date().toISOString();
    if (exam.id) {
      const next = exams.map((item) =>
        item.id === exam.id ? { ...item, name: exam.name, updated_at: now } : item
      );
      this.write(this.examKey, next);
      return next.find((item) => item.id === exam.id);
    }
    const created = {
      id: makeId(),
      name: exam.name,
      created_at: now,
      updated_at: now
    };
    this.write(this.examKey, [...exams, created]);
    return created;
  }

  async deleteExam(id) {
    const exams = await this.getExams();
    const questions = await this.getQuestions();
    this.write(
      this.examKey,
      exams.filter((exam) => exam.id !== id)
    );
    this.write(
      this.questionKey,
      questions.filter((question) => question.exam_id !== id)
    );
  }

  async saveQuestion(question) {
    const questions = await this.getQuestions();
    const now = new Date().toISOString();
    if (question.id) {
      const next = questions.map((item) =>
        item.id === question.id ? { ...item, ...question, updated_at: now } : item
      );
      this.write(this.questionKey, next);
      return next.find((item) => item.id === question.id);
    }
    const created = {
      ...question,
      id: makeId(),
      created_at: now,
      updated_at: now
    };
    this.write(this.questionKey, [created, ...questions]);
    return created;
  }

  async deleteQuestion(id) {
    const questions = await this.getQuestions();
    this.write(
      this.questionKey,
      questions.filter((question) => question.id !== id)
    );
  }

  async recordResult(result) {
    const results = this.read(this.resultKey);
    this.write(this.resultKey, [
      {
        id: makeId(),
        question_id: result.question_id,
        is_correct: result.is_correct,
        answered_at: new Date().toISOString()
      },
      ...results
    ]);
  }

  async seedIfEmpty() {
    const exams = await this.getExams();
    const questions = await this.getQuestions();
    if (exams.length || questions.length) return;
    const createdExams = sampleExams.map((exam) => ({
      id: makeId(),
      name: exam.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    const byName = new Map(createdExams.map((exam) => [exam.name, exam.id]));
    const createdQuestions = sampleQuestions.map((question) => ({
      id: makeId(),
      exam_id: byName.get(question.examName),
      question: question.question,
      choices: question.choices,
      correct_index: question.correct_index,
      is_favorite: question.is_favorite,
      memo: question.memo,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    this.write(this.examKey, createdExams);
    this.write(this.questionKey, createdQuestions);
  }

  read(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  clear() {
    localStorage.removeItem(this.examKey);
    localStorage.removeItem(this.questionKey);
    localStorage.removeItem(this.resultKey);
  }
}

class SupabaseStore {
  constructor(client, userId) {
    this.client = client;
    this.userId = userId;
  }

  async getExams() {
    const { data, error } = await this.client
      .from("exams")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async getQuestions() {
    const { data, error } = await this.client
      .from("questions")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async saveExam(exam) {
    const payload = {
      name: exam.name,
      updated_at: new Date().toISOString()
    };
    if (exam.id) {
      const { data, error } = await this.client
        .from("exams")
        .update(payload)
        .eq("id", exam.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await this.client
      .from("exams")
      .insert({ ...payload, user_id: this.userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteExam(id) {
    const { error } = await this.client.from("exams").delete().eq("id", id);
    if (error) throw error;
  }

  async saveQuestion(question) {
    const payload = {
      exam_id: question.exam_id,
      question: question.question,
      choices: question.choices,
      correct_index: question.correct_index,
      is_favorite: question.is_favorite,
      memo: question.memo,
      updated_at: new Date().toISOString()
    };
    if (question.id) {
      const { data, error } = await this.client
        .from("questions")
        .update(payload)
        .eq("id", question.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await this.client
      .from("questions")
      .insert({ ...payload, user_id: this.userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteQuestion(id) {
    const { error } = await this.client.from("questions").delete().eq("id", id);
    if (error) throw error;
  }

  async recordResult(result) {
    const { error } = await this.client.from("study_results").insert({
      user_id: this.userId,
      question_id: result.question_id,
      is_correct: result.is_correct
    });
    if (error) throw error;
  }

  async seedIfEmpty() {
    const exams = await this.getExams();
    const questions = await this.getQuestions();
    if (exams.length || questions.length) return;
    const createdExams = [];
    for (const exam of sampleExams) {
      createdExams.push(await this.saveExam({ name: exam.name }));
    }
    const byName = new Map(createdExams.map((exam) => [exam.name, exam.id]));
    for (const question of sampleQuestions) {
      await this.saveQuestion({
        exam_id: byName.get(question.examName),
        question: question.question,
        choices: question.choices,
        correct_index: question.correct_index,
        is_favorite: question.is_favorite,
        memo: question.memo
      });
    }
  }
}

init();

async function init() {
  bindEvents();
  updateShell();
  if (hasSupabaseConfig) {
    state.client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    state.client.auth.onAuthStateChange((_event, session) => {
      handleSession(session).catch(showError);
    });
    const { data, error } = await state.client.auth.getSession();
    if (error) {
      showError(error);
      return;
    }
    await handleSession(data.session);
    return;
  }

  state.store = new LocalStore();
  await loadData();
}

function bindEvents() {
  els.loginForm.addEventListener("submit", handleLogin);
  els.resetLocalButton.addEventListener("click", resetLocalDemo);
  els.logoutButton.addEventListener("click", handleLogout);
  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });
  els.studyExamSelect.addEventListener("change", () => {
    state.selectedExamId = els.studyExamSelect.value;
    state.currentQuestionId = null;
    state.answeredChoice = null;
    render();
  });
  els.shuffleToggle.addEventListener("change", () => {
    state.currentQuestionId = null;
    state.answeredChoice = null;
    render();
  });
  els.examForm.addEventListener("submit", handleExamSubmit);
  els.examCancel.addEventListener("click", resetExamForm);
  els.questionForm.addEventListener("submit", handleQuestionSubmit);
  els.questionCancel.addEventListener("click", resetQuestionForm);
  els.questionChoices.addEventListener("input", renderCorrectSelect);
  els.pastExamImport.addEventListener("click", handlePastExamImport);
  els.pastExamFiles.addEventListener("change", updatePastExamSelectionMessage);
  els.pastExamFolder.addEventListener("change", updatePastExamSelectionMessage);
}

async function handleSession(session) {
  state.user = session?.user || null;
  if (!state.user) {
    state.store = null;
    state.exams = [];
    state.questions = [];
    updateShell();
    return;
  }
  state.store = new SupabaseStore(state.client, state.user.id);
  await loadData();
}

async function handleLogin(event) {
  event.preventDefault();
  const email = els.emailInput.value.trim();
  if (!email || !state.client) return;
  els.authMessage.textContent = "送信中...";
  const { error } = await state.client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.href.split("#")[0]
    }
  });
  els.authMessage.textContent = error
    ? `送信できませんでした: ${error.message}`
    : "ログインリンクを送信しました。メールを確認してください。";
}

async function handleLogout() {
  if (state.client) {
    await state.client.auth.signOut();
  }
}

async function resetLocalDemo() {
  if (!(state.store instanceof LocalStore)) return;
  const confirmed = window.confirm("ローカル保存データを削除して、サンプルデータに戻します。よろしいですか？");
  if (!confirmed) return;
  state.store.clear();
  state.currentQuestionId = null;
  state.answeredChoice = null;
  state.sessionCorrect = 0;
  state.sessionWrong = 0;
  await loadData();
}

async function loadData() {
  if (!state.store) return;
  state.loading = true;
  updateShell();
  try {
    await state.store.seedIfEmpty();
    state.exams = normalizeExams(await state.store.getExams());
    state.questions = normalizeQuestions(await state.store.getQuestions());
    if (state.selectedExamId !== "all" && !state.exams.some((exam) => exam.id === state.selectedExamId)) {
      state.selectedExamId = "all";
    }
    if (!state.currentQuestionId || !state.questions.some((question) => question.id === state.currentQuestionId)) {
      state.currentQuestionId = null;
    }
    render();
  } catch (error) {
    showError(error);
  } finally {
    state.loading = false;
    updateShell();
  }
}

function updateShell() {
  els.syncBadge.textContent = state.loading
    ? "同期中"
    : state.mode === "supabase"
      ? state.user
        ? "Supabase同期"
        : "ログイン待ち"
      : "ローカル保存";
  els.syncBadge.className = `sync-badge ${state.mode === "supabase" && state.user ? "online" : "local"}`;
  els.authPanel.classList.toggle("hidden", state.mode !== "supabase" || Boolean(state.user));
  els.setupPanel.classList.toggle("hidden", state.mode !== "local");
  els.appPanel.classList.toggle("hidden", state.mode === "supabase" && !state.user);
  els.logoutButton.classList.toggle("hidden", state.mode !== "supabase" || !state.user);
}

function render() {
  updateShell();
  renderTabs();
  renderSelects();
  renderStats();
  renderQuestionCard();
  renderExamList();
  renderQuestionList();
  renderFavoriteList();
  renderCorrectSelect();
}

function renderTabs() {
  els.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.activeTab);
  });
  els.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${state.activeTab}-tab`);
  });
}

function setTab(tabName) {
  state.activeTab = tabName;
  renderTabs();
  if (tabName === "favorites") {
    renderFavoriteList();
  }
}

function renderSelects() {
  const examOptions = [
    `<option value="all">すべての試験</option>`,
    ...state.exams.map((exam) => `<option value="${escapeHtml(exam.id)}">${escapeHtml(exam.name)}</option>`)
  ];
  els.studyExamSelect.innerHTML = examOptions.join("");
  els.studyExamSelect.value = state.selectedExamId;

  const questionOptions = state.exams.map(
    (exam) => `<option value="${escapeHtml(exam.id)}">${escapeHtml(exam.name)}</option>`
  );
  els.questionExam.innerHTML = questionOptions.join("");
}

function renderStats() {
  const total = state.sessionCorrect + state.sessionWrong;
  const rate = total ? Math.round((state.sessionCorrect / total) * 100) : 0;
  els.sessionCorrect.textContent = String(state.sessionCorrect);
  els.sessionWrong.textContent = String(state.sessionWrong);
  els.sessionRate.textContent = `${rate}%`;
}

function renderQuestionCard() {
  const pool = getStudyQuestions();
  if (!pool.length) {
    state.currentQuestionId = null;
    state.answeredChoice = null;
    els.questionCard.className = "question-card empty";
    els.questionCard.innerHTML = `
      <p class="eyebrow">No Questions</p>
      <h3>この条件の問題がありません</h3>
      <p class="muted">試験/問題管理タブで問題を追加してください。</p>
      <button class="primary-button" type="button" data-action="open-manage">問題を追加</button>
    `;
    els.questionCard.querySelector("[data-action='open-manage']").addEventListener("click", () => setTab("manage"));
    return;
  }

  if (!state.currentQuestionId || !pool.some((question) => question.id === state.currentQuestionId)) {
    state.currentQuestionId = pool[0].id;
  }
  const question = pool.find((item) => item.id === state.currentQuestionId);
  const exam = state.exams.find((item) => item.id === question.exam_id);
  const answered = state.answeredChoice !== null;
  const isCorrect = answered && state.answeredChoice === question.correct_index;

  els.questionCard.className = "question-card";
  els.questionCard.innerHTML = `
    <div class="question-meta">
      <span>${escapeHtml(exam?.name || "未分類")}</span>
      <button class="favorite-toggle ${question.is_favorite ? "active" : ""}" type="button" title="お気に入り">
        ${question.is_favorite ? "★" : "☆"}
      </button>
    </div>
    <div class="question-text">${escapeHtml(question.question)}</div>
    <div class="choice-grid">
      ${question.choices
        .map((choice, index) => {
          const className = getChoiceClass(question, index);
          return `<button class="choice-button ${className}" type="button" data-choice="${index}" ${answered ? "disabled" : ""}>${escapeHtml(choice)}</button>`;
        })
        .join("")}
    </div>
    ${
      answered
        ? `<div class="result-panel">
            <strong class="${isCorrect ? "ok" : "bad"}">${isCorrect ? "正解" : "不正解"}</strong>
            <p>正解: ${escapeHtml(question.choices[question.correct_index])}</p>
            <label class="memo-box">
              <span>メモ</span>
              <textarea data-action="memo" rows="4" placeholder="正誤の理由、覚え方、補足など">${escapeHtml(question.memo || "")}</textarea>
            </label>
            <div class="button-row">
              <button class="primary-button" type="button" data-action="next">次の問題</button>
              <button class="secondary-button" type="button" data-action="save-memo">メモを保存</button>
            </div>
          </div>`
        : ""
    }
  `;

  els.questionCard.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => answerQuestion(Number(button.dataset.choice)));
  });
  els.questionCard.querySelector(".favorite-toggle").addEventListener("click", () => toggleFavorite(question.id));
  const next = els.questionCard.querySelector("[data-action='next']");
  if (next) next.addEventListener("click", nextQuestion);
  const saveMemo = els.questionCard.querySelector("[data-action='save-memo']");
  if (saveMemo) {
    saveMemo.addEventListener("click", () => {
      const memo = els.questionCard.querySelector("[data-action='memo']").value;
      updateQuestionMemo(question.id, memo);
    });
  }
}

function getChoiceClass(question, index) {
  if (state.answeredChoice === null) return "";
  if (index === question.correct_index) return "correct";
  if (index === state.answeredChoice) return "wrong";
  return "";
}

async function answerQuestion(choiceIndex) {
  const question = state.questions.find((item) => item.id === state.currentQuestionId);
  if (!question || state.answeredChoice !== null) return;
  state.answeredChoice = choiceIndex;
  const isCorrect = choiceIndex === question.correct_index;
  state.sessionCorrect += isCorrect ? 1 : 0;
  state.sessionWrong += isCorrect ? 0 : 1;
  render();
  try {
    await state.store.recordResult({
      question_id: question.id,
      is_correct: isCorrect
    });
  } catch (error) {
    showError(error);
  }
}

function nextQuestion() {
  const pool = getStudyQuestions();
  if (!pool.length) return;
  if (els.shuffleToggle.checked && pool.length > 1) {
    const candidates = pool.filter((question) => question.id !== state.currentQuestionId);
    state.currentQuestionId = candidates[Math.floor(Math.random() * candidates.length)].id;
  } else {
    const currentIndex = pool.findIndex((question) => question.id === state.currentQuestionId);
    state.currentQuestionId = pool[(currentIndex + 1) % pool.length].id;
  }
  state.answeredChoice = null;
  renderQuestionCard();
}

function getStudyQuestions() {
  const filtered =
    state.selectedExamId === "all"
      ? state.questions
      : state.questions.filter((question) => question.exam_id === state.selectedExamId);
  return [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

async function toggleFavorite(questionId) {
  const question = state.questions.find((item) => item.id === questionId);
  if (!question) return;
  await saveQuestion({ ...question, is_favorite: !question.is_favorite });
}

async function updateQuestionMemo(questionId, memo) {
  const question = state.questions.find((item) => item.id === questionId);
  if (!question) return;
  await saveQuestion({ ...question, memo });
}

async function handleExamSubmit(event) {
  event.preventDefault();
  const name = els.examName.value.trim();
  if (!name) return;
  try {
    await state.store.saveExam({
      id: els.examId.value || null,
      name
    });
    resetExamForm();
    await loadData();
  } catch (error) {
    showError(error);
  }
}

function renderExamList() {
  if (!state.exams.length) {
    els.examList.innerHTML = `<p class="muted">試験カテゴリがありません。</p>`;
    return;
  }
  els.examList.innerHTML = state.exams
    .map((exam) => {
      const count = state.questions.filter((question) => question.exam_id === exam.id).length;
      return `
        <article class="list-item">
          <div class="list-item-header">
            <div>
              <div class="list-item-title">${escapeHtml(exam.name)}</div>
              <div class="list-item-subtitle">${count}問</div>
            </div>
          </div>
          <div class="item-actions">
            <button class="secondary-button" type="button" data-exam-edit="${escapeHtml(exam.id)}">編集</button>
            <button class="danger-button" type="button" data-exam-delete="${escapeHtml(exam.id)}">削除</button>
          </div>
        </article>
      `;
    })
    .join("");
  els.examList.querySelectorAll("[data-exam-edit]").forEach((button) => {
    button.addEventListener("click", () => editExam(button.dataset.examEdit));
  });
  els.examList.querySelectorAll("[data-exam-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteExam(button.dataset.examDelete));
  });
}

function editExam(id) {
  const exam = state.exams.find((item) => item.id === id);
  if (!exam) return;
  els.examId.value = exam.id;
  els.examName.value = exam.name;
  els.examName.focus();
}

async function deleteExam(id) {
  const count = state.questions.filter((question) => question.exam_id === id).length;
  const confirmed = window.confirm(`この試験と所属する${count}問を削除します。よろしいですか？`);
  if (!confirmed) return;
  try {
    await state.store.deleteExam(id);
    resetExamForm();
    resetQuestionForm();
    await loadData();
  } catch (error) {
    showError(error);
  }
}

function resetExamForm() {
  els.examId.value = "";
  els.examName.value = "";
}

async function handleQuestionSubmit(event) {
  event.preventDefault();
  const payload = buildQuestionPayload();
  if (!payload) return;
  await saveQuestion(payload);
  resetQuestionForm();
}

async function handlePastExamImport() {
  els.pastExamImportMessage.textContent = "";
  if (state.mode !== "supabase" || !state.user || !(state.store instanceof SupabaseStore)) {
    els.pastExamImportMessage.textContent = "Supabaseにログインしてから取り込んでください。";
    return;
  }
  const files = getSelectedPastExamFiles();
  if (!files.length) {
    els.pastExamImportMessage.textContent = "過去問フォルダまたはMarkdownファイルを選択してください。";
    return;
  }

  els.pastExamImport.disabled = true;
  els.pastExamImportMessage.textContent = "Markdownを確認中...";
  try {
    const parsedExams = await parsePastExamFiles(files);
    const totalQuestions = parsedExams.reduce((sum, exam) => sum + exam.questions.length, 0);
    els.pastExamImportMessage.textContent = `${parsedExams.length}試験、${totalQuestions}問を登録中...`;
    const result = await importPastExams(parsedExams);
    els.pastExamFiles.value = "";
    els.pastExamFolder.value = "";
    await loadData();
    els.pastExamImportMessage.textContent =
      `取込完了: 試験${result.createdExams}件追加、問題${result.createdQuestions}問追加、${result.skippedQuestions}問スキップ`;
  } catch (error) {
    els.pastExamImportMessage.textContent = error?.message || "過去問を取り込めませんでした。";
  } finally {
    els.pastExamImport.disabled = false;
  }
}

function getSelectedPastExamFiles() {
  return [...Array.from(els.pastExamFiles.files || []), ...Array.from(els.pastExamFolder.files || [])];
}

function updatePastExamSelectionMessage() {
  const count = getSelectedPastExamFiles().filter((file) => file.name.toLowerCase().endsWith(".md")).length;
  els.pastExamImportMessage.textContent = count ? `${count}件のMarkdownファイルを選択中` : "";
}

async function importPastExams(parsedExams) {
  const existingExams = normalizeExams(await state.store.getExams());
  const existingQuestions = normalizeQuestions(await state.store.getQuestions());
  const examByName = new Map(existingExams.map((exam) => [exam.name, exam]));
  const questionKeys = new Set(
    existingQuestions.map((question) => `${question.exam_id}\n${normalizeQuestionKey(question.question)}`)
  );
  const result = {
    createdExams: 0,
    createdQuestions: 0,
    skippedQuestions: 0
  };

  for (const parsedExam of parsedExams) {
    let exam = examByName.get(parsedExam.name);
    if (!exam) {
      exam = await state.store.saveExam({ name: parsedExam.name });
      examByName.set(parsedExam.name, exam);
      result.createdExams += 1;
    }

    for (const question of parsedExam.questions) {
      const duplicateKey = `${exam.id}\n${normalizeQuestionKey(question.question)}`;
      if (questionKeys.has(duplicateKey)) {
        result.skippedQuestions += 1;
        continue;
      }
      await state.store.saveQuestion({
        exam_id: exam.id,
        question: question.question,
        choices: question.choices,
        correct_index: question.correct_index,
        memo: question.memo,
        is_favorite: false
      });
      questionKeys.add(duplicateKey);
      result.createdQuestions += 1;
    }
  }

  return result;
}

async function parsePastExamFiles(files) {
  const markdownFiles = files.filter((file) => file.name.toLowerCase().endsWith(".md"));
  const fileByName = new Map(markdownFiles.map((file) => [file.name, file]));
  const questionFiles = markdownFiles
    .filter((file) => isPastQuestionFile(file.name))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  if (!questionFiles.length) {
    throw new Error("問題Markdownが見つかりませんでした。");
  }

  const parsedExams = [];
  const errors = [];
  for (const questionFile of questionFiles) {
    const answerNames = getAnswerFileNames(questionFile.name);
    const answerFile = answerNames.map((answerName) => fileByName.get(answerName)).find(Boolean);
    if (!answerFile) {
      errors.push(`${questionFile.name}: 対応する解答Markdownがありません。候補: ${answerNames.join(", ")}`);
      continue;
    }

    const questionText = await questionFile.text();
    const answerText = await answerFile.text();
    try {
      const parsedExam = parsePastExamMarkdown(questionFile.name, questionText, answerText);
      parsedExams.push(parsedExam);
    } catch (error) {
      errors.push(`${questionFile.name}: ${error.message}`);
    }
  }

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }
  return parsedExams;
}

function parsePastExamMarkdown(fileName, questionMarkdown, answerMarkdown) {
  const title = extractMarkdownTitle(questionMarkdown);
  const questions = parseQuestionMarkdown(questionMarkdown);
  const answers = parseAnswerMarkdown(answerMarkdown);
  const answersByNumber = new Map(answers.map((answer) => [answer.number, answer]));

  const missingAnswers = questions
    .filter((question) => !answersByNumber.has(question.number))
    .map((question) => question.number);
  if (questions.length !== answers.length || missingAnswers.length) {
    throw new Error(
      `問題数と解答数が一致しません。問題${questions.length}件、解答${answers.length}件` +
        (missingAnswers.length ? `、未回答: ${missingAnswers.join(", ")}` : "")
    );
  }

  return {
    name: title || fileName.replace(/\.md$/i, ""),
    questions: questions.map((question) => {
      const answer = answersByNumber.get(question.number);
      if (!answer || answer.correctIndex < 0 || answer.correctIndex >= question.choices.length) {
        throw new Error(`問${question.number}の解答が選択肢の範囲外です。`);
      }
      return {
        question: question.question,
        choices: question.choices,
        correct_index: answer.correctIndex,
        memo: answer.reason
      };
    })
  };
}

function parseQuestionMarkdown(markdown) {
  const headings = [...markdown.matchAll(/^## 問(\d+)\s+(.+)$/gm)].map((match) => ({
    index: match.index,
    number: Number(match[1]),
    title: match[2].trim()
  }));
  if (!headings.length) {
    throw new Error("問見出しが見つかりません。");
  }

  return headings.map((heading, index) => {
    const nextIndex = headings[index + 1]?.index ?? markdown.length;
    const block = markdown.slice(heading.index, nextIndex);
    const lines = block.split("\n").slice(1);
    const firstChoiceIndex = lines.findIndex((line) => /^1\.\s+/.test(line));
    if (firstChoiceIndex === -1) {
      throw new Error(`問${heading.number}の選択肢が見つかりません。`);
    }
    const promptExtra = lines.slice(0, firstChoiceIndex).join("\n").trim();
    const choiceLines = lines.slice(firstChoiceIndex).filter((line) => /^\d+\.\s+/.test(line));
    const choices = choiceLines.map((line) => {
      const match = line.match(/^(\d+)\.\s+(.+)$/);
      return { label: Number(match[1]), text: match[2].trim() };
    });
    const expectedLabels = [1, 2, 3, 4];
    const isValidChoiceSet =
      choices.length === expectedLabels.length &&
      choices.every((choice, choiceIndex) => choice.label === expectedLabels[choiceIndex] && choice.text);
    if (!isValidChoiceSet) {
      throw new Error(`問${heading.number}の選択肢は1〜4の4件である必要があります。`);
    }

    return {
      number: heading.number,
      question: [heading.title, promptExtra].filter(Boolean).join("\n\n"),
      choices: choices.map((choice) => choice.text)
    };
  });
}

function parseAnswerMarkdown(markdown) {
  const answers = [];
  for (const line of markdown.split("\n")) {
    const match = line.match(/^\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([^|]*)\|/);
    if (!match) continue;
    const number = Number(match[1]);
    const answerNumber = Number(match[2]);
    if (answerNumber < 1 || answerNumber > 4) {
      throw new Error(`問${number}の解答が1〜4以外です。`);
    }
    answers.push({
      number,
      correctIndex: answerNumber - 1,
      reason: match[3].trim()
    });
  }
  if (!answers.length) {
    throw new Error("解答表が見つかりません。");
  }
  return answers;
}

function isPastQuestionFile(fileName) {
  return /^過去問\d{4}年?\.md$/.test(fileName) || /^予測問題\d{4}_第\d+回_問題\.md$/.test(fileName);
}

function getAnswerFileNames(questionFileName) {
  const pastExamMatch = questionFileName.match(/^過去問(\d{4})年?\.md$/);
  if (pastExamMatch) {
    const year = pastExamMatch[1];
    return [`解答${year}年.md`, `回答${year}年.md`, `解答${year}.md`, `回答${year}.md`];
  }
  return [
    questionFileName.replace(/_問題\.md$/i, "_解答.md"),
    questionFileName.replace(/_問題\.md$/i, "_回答.md")
  ];
}

function extractMarkdownTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function normalizeQuestionKey(question) {
  return String(question || "").replace(/\s+/g, " ").trim();
}

function buildQuestionPayload() {
  els.questionFormMessage.textContent = "";
  const choices = parseChoices(els.questionChoices.value);
  const correctIndex = Number(els.questionCorrect.value);
  if (!state.exams.length) {
    els.questionFormMessage.textContent = "先に試験カテゴリを作成してください。";
    return null;
  }
  if (!els.questionText.value.trim()) {
    els.questionFormMessage.textContent = "問題文を入力してください。";
    return null;
  }
  if (choices.length < 2) {
    els.questionFormMessage.textContent = "選択肢は2つ以上入力してください。";
    return null;
  }
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) {
    els.questionFormMessage.textContent = "正解を選択してください。";
    return null;
  }
  return {
    id: els.questionId.value || null,
    exam_id: els.questionExam.value,
    question: els.questionText.value.trim(),
    choices,
    correct_index: correctIndex,
    memo: els.questionMemo.value.trim(),
    is_favorite: els.questionFavorite.checked
  };
}

async function saveQuestion(question) {
  try {
    await state.store.saveQuestion(question);
    await loadData();
  } catch (error) {
    showError(error);
  }
}

function renderCorrectSelect() {
  const choices = parseChoices(els.questionChoices.value);
  const previous = els.questionCorrect.value;
  els.questionCorrect.innerHTML = choices
    .map((choice, index) => `<option value="${index}">${index + 1}. ${escapeHtml(choice)}</option>`)
    .join("");
  if (choices.length) {
    const previousIndex = Number(previous);
    els.questionCorrect.value =
      previous !== "" && Number.isInteger(previousIndex) && previousIndex >= 0 && previousIndex < choices.length
        ? previous
        : "0";
  }
}

function renderQuestionList() {
  if (!state.questions.length) {
    els.questionList.innerHTML = `<p class="muted">問題がありません。</p>`;
    return;
  }
  els.questionList.innerHTML = state.questions
    .map((question) => {
      const exam = state.exams.find((item) => item.id === question.exam_id);
      return `
        <article class="list-item">
          <div class="list-item-header">
            <div>
              <div class="list-item-title">${question.is_favorite ? "★ " : ""}${escapeHtml(question.question)}</div>
              <div class="list-item-subtitle">${escapeHtml(exam?.name || "未分類")} / 正解: ${escapeHtml(question.choices[question.correct_index] || "")}</div>
            </div>
          </div>
          ${question.memo ? `<p class="list-item-subtitle">${escapeHtml(question.memo)}</p>` : ""}
          <div class="item-actions">
            <button class="secondary-button" type="button" data-question-edit="${escapeHtml(question.id)}">編集</button>
            <button class="ghost-button" type="button" data-question-favorite="${escapeHtml(question.id)}">${question.is_favorite ? "お気に入り解除" : "お気に入り"}</button>
            <button class="danger-button" type="button" data-question-delete="${escapeHtml(question.id)}">削除</button>
          </div>
        </article>
      `;
    })
    .join("");
  els.questionList.querySelectorAll("[data-question-edit]").forEach((button) => {
    button.addEventListener("click", () => editQuestion(button.dataset.questionEdit));
  });
  els.questionList.querySelectorAll("[data-question-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteQuestion(button.dataset.questionDelete));
  });
  els.questionList.querySelectorAll("[data-question-favorite]").forEach((button) => {
    button.addEventListener("click", () => toggleFavorite(button.dataset.questionFavorite));
  });
}

function editQuestion(id) {
  const question = state.questions.find((item) => item.id === id);
  if (!question) return;
  els.questionId.value = question.id;
  els.questionExam.value = question.exam_id;
  els.questionText.value = question.question;
  els.questionChoices.value = question.choices.join("\n");
  renderCorrectSelect();
  els.questionCorrect.value = String(question.correct_index);
  els.questionMemo.value = question.memo || "";
  els.questionFavorite.checked = Boolean(question.is_favorite);
  els.questionText.focus();
}

async function deleteQuestion(id) {
  const confirmed = window.confirm("この問題を削除します。よろしいですか？");
  if (!confirmed) return;
  try {
    await state.store.deleteQuestion(id);
    resetQuestionForm();
    await loadData();
  } catch (error) {
    showError(error);
  }
}

function resetQuestionForm() {
  els.questionId.value = "";
  els.questionText.value = "";
  els.questionChoices.value = "";
  els.questionMemo.value = "";
  els.questionFavorite.checked = false;
  els.questionFormMessage.textContent = "";
  if (state.exams[0]) {
    els.questionExam.value = state.exams[0].id;
  }
  renderCorrectSelect();
}

function renderFavoriteList() {
  const favorites = state.questions.filter((question) => question.is_favorite);
  if (!favorites.length) {
    els.favoriteList.innerHTML = `<p class="muted">お気に入り登録された問題がありません。</p>`;
    return;
  }
  els.favoriteList.innerHTML = favorites
    .map((question) => {
      const exam = state.exams.find((item) => item.id === question.exam_id);
      return `
        <article class="favorite-card">
          <span class="pill">${escapeHtml(exam?.name || "未分類")}</span>
          <strong>${escapeHtml(question.question)}</strong>
          <p class="muted">正解: ${escapeHtml(question.choices[question.correct_index] || "")}</p>
          ${question.memo ? `<p>${escapeHtml(question.memo)}</p>` : `<p class="muted">メモなし</p>`}
          <div class="button-row">
            <button class="primary-button" type="button" data-favorite-study="${escapeHtml(question.exam_id)}">この試験を学習</button>
            <button class="secondary-button" type="button" data-favorite-edit="${escapeHtml(question.id)}">編集</button>
          </div>
        </article>
      `;
    })
    .join("");
  els.favoriteList.querySelectorAll("[data-favorite-study]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedExamId = button.dataset.favoriteStudy;
      state.currentQuestionId = null;
      state.answeredChoice = null;
      setTab("study");
      render();
    });
  });
  els.favoriteList.querySelectorAll("[data-favorite-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      editQuestion(button.dataset.favoriteEdit);
      setTab("manage");
    });
  });
}

function normalizeExams(exams) {
  return exams.map((exam) => ({
    id: String(exam.id),
    name: exam.name || "無題の試験",
    created_at: exam.created_at || new Date().toISOString(),
    updated_at: exam.updated_at || exam.created_at || new Date().toISOString()
  }));
}

function normalizeQuestions(questions) {
  return questions.map((question) => ({
    id: String(question.id),
    exam_id: String(question.exam_id),
    question: question.question || "",
    choices: Array.isArray(question.choices) ? question.choices : [],
    correct_index: Number(question.correct_index || 0),
    is_favorite: Boolean(question.is_favorite),
    memo: question.memo || "",
    created_at: question.created_at || new Date().toISOString(),
    updated_at: question.updated_at || question.created_at || new Date().toISOString()
  }));
}

function parseChoices(value) {
  return value
    .split("\n")
    .map((choice) => choice.trim())
    .filter(Boolean);
}

function makeId() {
  return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showError(error) {
  console.error(error);
  const message = error?.message || "処理中にエラーが発生しました。";
  if (state.mode === "supabase" && !state.user) {
    els.authMessage.textContent = message;
    return;
  }
  window.alert(message);
}
