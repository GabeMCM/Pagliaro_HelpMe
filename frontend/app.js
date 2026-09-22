const state = {
  token: localStorage.getItem("support_token"),
  user: readStoredUser(),
  tickets: [],
  management_tickets: [],
  users: [],
  logs: [],
  filter: "all",
  search_query: "",
  management_view: "users",
  selected_id: null,
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (
  selector,
  parent = document,
) => [...parent.querySelectorAll(selector)];

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("support_user") ?? "null");
  } catch {
    return null;
  }
}

function element(tag, class_name, text) {
  const item = document.createElement(tag);
  if (class_name) item.className = class_name;
  if (text !== undefined) item.textContent = text;
  return item;
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (state.token) headers.set("Authorization", `Bearer ${state.token}`);

  const response = await fetch(path, { ...options, headers });
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    const error = new Error(
      result?.message ?? "Não foi possível concluir a operação",
    );
    error.status = response.status;
    throw error;
  }

  return result.data;
}

function setBusy(form, busy) {
  const button = $("button[type='submit']", form);
  if (!button) return;
  button.disabled = busy;
  button.dataset.label ??= button.textContent;
  button.textContent = busy ? "Aguarde..." : button.dataset.label;
}

function setFeedback(target, message = "", success = false) {
  target.textContent = message;
  target.classList.toggle("success", success);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

function digits(value) {
  return value.replace(/\D/g, "");
}

function cpfMask(value) {
  return digits(value).slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function phoneMask(value) {
  const number = digits(value).slice(0, 11);
  if (number.length <= 10) {
    return number.replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return number.replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatCode(value) {
  return String(value).replace(/(.{4})/g, "$1 ").trim();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function statusClass(status) {
  if (status === "EM ANDAMENTO") return "status in-progress";
  if (status === "FINALIZADO") return "status finished";
  return "status";
}

function statusElement(status) {
  return element("span", statusClass(status), status);
}

function switchMainView(view) {
  const staff = view === "staff";
  $("#client-view").hidden = staff;
  $("#staff-view").hidden = !staff;
  $$("[data-main-view]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.mainView === view &&
        button.classList.contains("nav-button"),
    );
  });

  if (staff) showStaffArea();
}

function switchClientView(view) {
  if (view === "open-ticket") {
    resetOpenTicket();
  }

  $("#open-ticket").hidden = view !== "open-ticket";
  $("#find-ticket").hidden = view !== "find-ticket";
  $$("[data-client-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.clientView === view);
  });
}

function resetOpenTicket() {
  const panel = $("#open-ticket");
  const form = $("#open-form");

  form.reset();
  form.hidden = false;
  $(".section-heading", panel).hidden = false;
  $("#ticket-created").hidden = true;
  setFeedback($("#open-feedback"));
}

function switchSearchMode(mode) {
  $("#code-search-form").hidden = mode !== "code";
  $("#cpf-search-form").hidden = mode !== "cpf";
  $("#public-ticket").hidden = true;
  setFeedback($("#search-feedback"));
  $$("[data-search-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.searchMode === mode);
  });
}

$$("[data-main-view]").forEach((button) => {
  button.addEventListener(
    "click",
    () => switchMainView(button.dataset.mainView),
  );
});

$$("[data-client-view]").forEach((button) => {
  button.addEventListener(
    "click",
    () => switchClientView(button.dataset.clientView),
  );
});

$$("[data-search-mode]").forEach((button) => {
  button.addEventListener(
    "click",
    () => switchSearchMode(button.dataset.searchMode),
  );
});

$$('input[name="cpf"]').forEach((input) => {
  input.addEventListener("input", () => {
    input.value = cpfMask(input.value);
  });
});

const phone_input = $('#open-form input[name="contact"]');
phone_input.addEventListener("input", () => {
  phone_input.value = phoneMask(phone_input.value);
});

$("#open-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = $("#open-feedback");
  const data = new FormData(form);
  setFeedback(feedback);
  setBusy(form, true);

  try {
    const result = await api("/chamado", {
      method: "POST",
      body: JSON.stringify({
        client: {
          name: data.get("name"),
          cpf: digits(data.get("cpf")),
          contact: digits(data.get("contact")),
        },
        message: data.get("message"),
      }),
    });

    form.hidden = true;
    $(".section-heading", $("#open-ticket")).hidden = true;
    $("#created-code").textContent = formatCode(result.codigo);
    $("#created-code").dataset.code = result.codigo;
    $("#ticket-created").hidden = false;
  } catch (error) {
    setFeedback(feedback, error.message);
  } finally {
    setBusy(form, false);
  }
});

$("#copy-code").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("#created-code").dataset.code);
  showToast("Número copiado");
});

$("#view-created-ticket").addEventListener("click", () => {
  const code = $("#created-code").dataset.code;
  switchClientView("find-ticket");
  switchSearchMode("code");
  $('#code-search-form input[name="code"]').value = code;
  $("#code-search-form").requestSubmit();
});

$("#code-search-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const code = digits(new FormData(form).get("code"));
  const feedback = $("#search-feedback");
  setFeedback(feedback);
  setBusy(form, true);

  try {
    const ticket = await api(`/chamado/public/${encodeURIComponent(code)}`);
    renderPublicTicket(ticket);
  } catch (error) {
    $("#public-ticket").hidden = true;
    setFeedback(feedback, error.message);
  } finally {
    setBusy(form, false);
  }
});

$("#cpf-search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  setFeedback(
    $("#search-feedback"),
    "A consulta por CPF será ativada com o serviço de envio por SMS.",
  );
});

function renderPublicTicket(ticket) {
  const container = $("#public-ticket");
  container.replaceChildren();

  const header = element("header");
  const eyebrow = element(
    "p",
    "eyebrow",
    `Chamado ${formatCode(ticket.codigo)}`,
  );
  const title = element("h2", "", ticket.client.name);
  const meta = element("div", "ticket-meta");
  meta.append(
    statusElement(ticket.status),
    element("span", "", `Aberto em ${formatDate(ticket.created)}`),
  );
  header.append(eyebrow, title, meta);

  const conversation = element("div", "conversation");
  renderMessages(conversation, ticket.messages);
  container.append(header, conversation);

  if (ticket.status !== "FINALIZADO") {
    container.append(createMessageForm(async (message) => {
      await api(
        `/chamado/public/${encodeURIComponent(ticket.codigo)}/mensagem`,
        {
          method: "POST",
          body: JSON.stringify({ message }),
        },
      );
      const updated = await api(
        `/chamado/public/${encodeURIComponent(ticket.codigo)}`,
      );
      renderPublicTicket(updated);
    }));
  } else {
    container.append(createFeedbackBox(ticket));
  }

  container.hidden = false;
}

function createFeedbackBox(ticket) {
  const box = element("section", "feedback-box");

  if (ticket.feedback !== null) {
    box.append(
      element("p", "eyebrow", "Avaliação enviada"),
      element("h3", "", `Nota ${ticket.feedback} de 5`),
    );
    return box;
  }

  box.append(element("h3", "", "Como foi o atendimento?"));
  const rating = element("div", "rating");

  for (let note = 0; note <= 5; note++) {
    const button = element("button", "", String(note));
    button.type = "button";
    button.setAttribute("aria-label", `Dar nota ${note} de 5`);
    button.addEventListener("click", async () => {
      $$("button", rating).forEach((item) => item.disabled = true);
      try {
        await api(
          `/chamado/public/${encodeURIComponent(ticket.codigo)}/feedback`,
          {
            method: "POST",
            body: JSON.stringify({ note }),
          },
        );
        const updated = await api(
          `/chamado/public/${encodeURIComponent(ticket.codigo)}`,
        );
        renderPublicTicket(updated);
        showToast("Avaliação enviada");
      } catch (error) {
        showToast(error.message);
        $$("button", rating).forEach((item) => item.disabled = false);
      }
    });
    rating.append(button);
  }

  box.append(rating);
  return box;
}

function renderMessages(container, messages = []) {
  container.replaceChildren();

  for (const message of messages) {
    const is_staff = Boolean(message.user?.level);
    const bubble = element(
      "article",
      `message${is_staff ? " staff-message" : ""}`,
    );
    bubble.append(
      element("p", "", message.message),
      element(
        "small",
        "",
        `${message.user?.name ?? "Cliente"} · ${formatDate(message.created)}`,
      ),
    );
    container.append(bubble);
  }
}

function createMessageForm(onSubmit) {
  const form = element("form", "message-form");
  const label = element("label", "field");
  const label_text = element("span", "", "Mensagem");
  const textarea = element("textarea");
  textarea.name = "message";
  textarea.required = true;
  textarea.maxLength = 3000;
  textarea.rows = 2;
  const button = element("button", "primary-button", "Enviar");
  button.type = "submit";
  label.append(label_text, textarea);
  form.append(label, button);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = textarea.value.trim();
    if (!message) return;
    setBusy(form, true);
    try {
      await onSubmit(message);
      textarea.value = "";
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusy(form, false);
    }
  });

  return form;
}

function showStaffArea() {
  const authenticated = Boolean(state.token && state.user);
  $("#login-panel").hidden = authenticated;
  $("#staff-workspace").hidden = !authenticated;
  if (authenticated) {
    $("#staff-name").textContent = state.user.name;
    $("#management-mode-button").hidden = state.user.level === "Basic";
    $('#create-user-form option[value="Dev"]').hidden =
      state.user.level !== "Dev";
    switchStaffMode("attendance");
    loadQueue();
  }
}

function switchStaffMode(mode) {
  if (mode === "management" && state.user?.level === "Basic") return;
  $("#attendance-workspace").hidden = mode !== "attendance";
  $("#management-workspace").hidden = mode !== "management";
  $$("[data-staff-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.staffMode === mode);
  });
  if (mode === "management") loadManagement();
}

$$("[data-staff-mode]").forEach((button) => {
  button.addEventListener(
    "click",
    () => switchStaffMode(button.dataset.staffMode),
  );
});

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const feedback = $("#login-feedback");
  setFeedback(feedback);
  setBusy(form, true);

  try {
    const result = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        contact: data.get("contact"),
        password: data.get("password"),
      }),
    });
    state.token = result.token;
    state.user = result.user;
    localStorage.setItem("support_token", result.token);
    localStorage.setItem("support_user", JSON.stringify(result.user));
    form.reset();
    showStaffArea();
  } catch (error) {
    setFeedback(feedback, error.message);
  } finally {
    setBusy(form, false);
  }
});

$("#logout-button").addEventListener("click", logout);

function logout() {
  state.token = null;
  state.user = null;
  state.tickets = [];
  state.management_tickets = [];
  state.users = [];
  state.logs = [];
  state.selected_id = null;
  state.search_query = "";
  localStorage.removeItem("support_token");
  localStorage.removeItem("support_user");
  $("#attendance-workspace").classList.remove("detail-open");
  showStaffArea();
}

async function loadQueue() {
  const feedback = $("#queue-feedback");
  setFeedback(feedback);

  try {
    const path = state.search_query
      ? `/chamado/search?q=${
        encodeURIComponent(state.search_query)
      }&limit=100&offset=0`
      : "/chamado?limit=100&offset=0";
    state.tickets = await api(path);
    renderQueue();
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      logout();
      setFeedback($("#login-feedback"), "Sua sessão expirou. Entre novamente.");
      return;
    }
    setFeedback(feedback, error.message);
  }
}

function renderQueue() {
  const list = $("#ticket-list");
  list.replaceChildren();
  const filtered = state.filter === "search"
    ? state.tickets
    : state.filter === "FINALIZADO"
    ? state.tickets.filter((ticket) =>
      ticket.status === "FINALIZADO" && ticket.user_resp?.id === state.user.id
    )
    : state.filter === "all"
    ? state.tickets.filter((ticket) => ticket.status !== "FINALIZADO")
    : state.tickets.filter((ticket) => ticket.status === state.filter);

  if (filtered.length === 0) {
    const empty = element(
      "p",
      "queue-feedback",
      state.search_query
        ? "Nenhum chamado encontrado."
        : "Nenhum chamado nesta fila.",
    );
    list.append(empty);
    return;
  }

  for (const ticket of filtered) {
    const button = element(
      "button",
      `ticket-item${ticket.id === state.selected_id ? " active" : ""}`,
    );
    button.type = "button";
    const top = element("div", "ticket-item-top");
    top.append(
      element("strong", "", ticket.client.name),
      statusElement(ticket.status),
    );
    const bottom = element("div", "ticket-item-bottom");
    bottom.append(
      element("span", "", `#${String(ticket.codigo).slice(-8)}`),
      element("time", "", formatDate(ticket.updated)),
    );
    button.append(top, bottom);
    button.addEventListener("click", () => openStaffTicket(ticket.id));
    list.append(button);
  }
}

$$("[data-queue-filter]").forEach((button) => {
  button.addEventListener("click", async () => {
    const had_search = Boolean(state.search_query);
    state.search_query = "";
    $('#ticket-search-form input[name="query"]').value = "";
    $("#clear-ticket-search").hidden = true;
    state.filter = button.dataset.queueFilter;
    $$("[data-queue-filter]").forEach((item) =>
      item.classList.toggle("active", item === button)
    );
    if (had_search) {
      await loadQueue();
    } else {
      renderQueue();
    }
  });
});

$("#ticket-search-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const query = String(new FormData(form).get("query") ?? "").trim();
  if (!query) return;

  state.search_query = query;
  state.filter = "search";
  $$("[data-queue-filter]").forEach((button) =>
    button.classList.remove("active")
  );
  $("#clear-ticket-search").hidden = false;
  setBusy(form, true);
  await loadQueue();
  setBusy(form, false);
});

$("#clear-ticket-search").addEventListener("click", async () => {
  state.search_query = "";
  state.filter = "all";
  $("#ticket-search-form").reset();
  $("#clear-ticket-search").hidden = true;
  $$("[data-queue-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.queueFilter === "all");
  });
  await loadQueue();
});

$("#refresh-queue").addEventListener("click", loadQueue);

async function openStaffTicket(id) {
  state.selected_id = id;
  renderQueue();
  $("#attendance-workspace").classList.add("detail-open");

  try {
    const ticket = await api(`/chamado/${encodeURIComponent(id)}`);
    renderStaffTicket(ticket);
  } catch (error) {
    showToast(error.message);
  }
}

function renderStaffTicket(ticket) {
  const container = $("#staff-ticket");
  container.className = "staff-ticket";
  container.replaceChildren();

  const content = element("div", "staff-ticket-content");
  const header = element("header", "ticket-header");
  const row = element("div", "ticket-header-row");
  const back = element("button", "back-button", "‹");
  back.type = "button";
  back.setAttribute("aria-label", "Voltar para a fila");
  back.addEventListener(
    "click",
    () => $("#attendance-workspace").classList.remove("detail-open"),
  );

  const heading = element("div", "ticket-heading-wrap");
  heading.append(
    element("p", "eyebrow", `Chamado ${formatCode(ticket.codigo)}`),
    element("h2", "", ticket.client.name),
  );
  const heading_meta = element("div", "ticket-meta");
  heading_meta.append(
    statusElement(ticket.status),
    element("span", "", formatDate(ticket.created)),
  );
  heading.append(heading_meta);
  row.append(back, heading);
  header.append(row);

  const actions = element("div", "ticket-actions");
  if (ticket.status === "AGUARDANDO") {
    actions.append(
      actionButton("Assumir chamado", () => updateTicket(ticket, "capturar")),
    );
  }
  if (ticket.status === "EM ANDAMENTO") {
    actions.append(
      actionButton(
        "Finalizar chamado",
        () => updateTicket(ticket, "finalizar"),
        true,
      ),
    );
  }
  if (actions.children.length) header.append(actions);

  const body = element("div", "ticket-body");
  const client_data = element("div", "client-data");
  client_data.append(
    element("span", "", `CPF ${cpfMask(ticket.client.cpf)}`),
    element("span", "", `Telefone ${phoneMask(ticket.client.contact)}`),
    element(
      "span",
      "",
      ticket.user_resp
        ? `Responsável: ${ticket.user_resp.name}`
        : "Sem responsável",
    ),
  );
  if (ticket.feedback !== null) {
    client_data.append(element("span", "", `Avaliação: ${ticket.feedback}/5`));
  }
  const conversation = element("div", "conversation");
  renderMessages(conversation, ticket.messages);
  body.append(client_data, conversation);
  content.append(header, body);

  if (ticket.status !== "FINALIZADO") {
    const composer = element("footer", "staff-composer");
    composer.append(createMessageForm(async (message) => {
      await api(`/chamado/${encodeURIComponent(ticket.id)}/mensagem`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      await openStaffTicket(ticket.id);
      await loadQueue();
    }));
    content.append(composer);
  }

  container.append(content);
  requestAnimationFrame(() => {
    body.scrollTop = body.scrollHeight;
  });
}

function actionButton(label, action, danger = false) {
  const button = element(
    "button",
    danger ? "secondary-button danger-button" : "primary-button",
    label,
  );
  button.type = "button";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await action();
    } catch (error) {
      showToast(error.message);
    } finally {
      button.disabled = false;
    }
  });
  return button;
}

async function updateTicket(ticket, action) {
  await api(`/chamado/${encodeURIComponent(ticket.id)}/${action}`, {
    method: "PATCH",
  });
  await loadQueue();
  await openStaffTicket(ticket.id);
  showToast(action === "capturar" ? "Chamado assumido" : "Chamado finalizado");
}

function switchManagementView(view) {
  state.management_view = view;
  $("#management-users").hidden = view !== "users";
  $("#management-tickets").hidden = view !== "tickets";
  $("#management-logs").hidden = view !== "logs";
  $$("[data-management-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.managementView === view);
  });
  loadManagement();
}

$$("[data-management-view]").forEach((button) => {
  button.addEventListener(
    "click",
    () => switchManagementView(button.dataset.managementView),
  );
});

$$(".management-refresh").forEach((button) => {
  button.addEventListener("click", loadManagement);
});

async function loadManagement() {
  if (state.user?.level === "Basic") return;
  if (state.management_view === "users") await loadUsers();
  if (state.management_view === "tickets") await loadManagementTickets();
  if (state.management_view === "logs") await loadLogs();
}

async function loadUsers() {
  const feedback = $("#user-feedback");
  setFeedback(feedback);
  try {
    state.users = await api("/user");
    renderUsers();
  } catch (error) {
    setFeedback(feedback, error.message);
  }
}

function renderUsers() {
  const list = $("#users-list");
  list.replaceChildren();

  for (const user of state.users) {
    const row = element("article", "management-row");
    const main = element("div", "management-row-main");
    main.append(
      element("strong", "", user.name),
      element("span", "", user.contact),
    );
    const meta = element(
      "div",
      "management-row-meta",
      `${user.level} · ${user.active ? "Ativo" : "Desativado"}`,
    );
    const actions = element("div", "management-actions");
    const can_change = user.id !== state.user.id &&
      !(state.user.level === "Gestor" && user.level === "Dev");

    if (can_change) {
      actions.append(
        managementButton(user.active ? "Desativar" : "Ativar", async () => {
          await api(`/user/${encodeURIComponent(user.id)}/active`, {
            method: "PATCH",
            body: JSON.stringify({ active: !user.active }),
          });
          await loadUsers();
        }),
      );
    }

    if (state.user.level === "Dev" && user.id !== state.user.id) {
      actions.append(managementButton("Apagar", async () => {
        if (!confirm(`Apagar o usuário ${user.name}?`)) return false;
        await api(`/user/${encodeURIComponent(user.id)}`, { method: "DELETE" });
        await loadUsers();
        return true;
      }, true));
    }

    row.append(main, meta, actions);
    list.append(row);
  }
}

$("#create-user-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const feedback = $("#user-feedback");
  setFeedback(feedback);
  setBusy(form, true);

  try {
    await api("/user", {
      method: "POST",
      body: JSON.stringify({
        name: data.get("name"),
        contact: data.get("contact"),
        password: data.get("password"),
        level: data.get("level"),
        active: true,
      }),
    });
    form.reset();
    setFeedback(feedback, "Usuário criado", true);
    await loadUsers();
  } catch (error) {
    setFeedback(feedback, error.message);
  } finally {
    setBusy(form, false);
  }
});

async function loadManagementTickets() {
  const feedback = $("#management-ticket-feedback");
  setFeedback(feedback);
  try {
    state.management_tickets = await api("/chamado?limit=100&offset=0");
    renderManagementTickets();
  } catch (error) {
    setFeedback(feedback, error.message);
  }
}

function renderManagementTickets() {
  const list = $("#management-ticket-list");
  list.replaceChildren();

  for (const ticket of state.management_tickets) {
    const row = element("article", "management-row");
    const main = element("div", "management-row-main");
    main.append(
      element("strong", "", ticket.client.name),
      element("span", "", `#${ticket.codigo} · ${ticket.status}`),
    );
    const meta = element(
      "div",
      "management-row-meta",
      ticket.active ? "Ativo" : "Desativado",
    );
    const actions = element("div", "management-actions");

    if (ticket.active) {
      actions.append(managementButton("Desativar", async () => {
        await api(`/chamado/${encodeURIComponent(ticket.id)}/desativar`, {
          method: "PATCH",
        });
        await loadManagementTickets();
      }));
    }

    if (state.user.level === "Dev") {
      actions.append(managementButton("Apagar", async () => {
        if (!confirm(`Apagar o chamado ${ticket.codigo}?`)) return false;
        await api(`/chamado/${encodeURIComponent(ticket.id)}`, {
          method: "DELETE",
        });
        await loadManagementTickets();
        return true;
      }, true));
    }

    row.append(main, meta, actions);
    list.append(row);
  }
}

async function loadLogs() {
  const feedback = $("#log-feedback");
  setFeedback(feedback);
  try {
    state.logs = await api("/chamado/logs?limit=200&offset=0");
    renderLogs();
  } catch (error) {
    setFeedback(feedback, error.message);
  }
}

function renderLogs() {
  const list = $("#logs-list");
  list.replaceChildren();

  for (const log of [...state.logs].reverse()) {
    const row = element("article", "management-row");
    const main = element("div", "management-row-main");
    main.append(
      element("strong", "", log.action),
      element("span", "", log.message),
    );
    row.append(
      main,
      element("div", "management-row-meta", `Chamado ${log.chamado_id}`),
      element(
        "div",
        "management-row-meta",
        `${log.user?.name ?? "Cliente"} · ${formatDate(log.created)}`,
      ),
    );
    list.append(row);
  }
}

function managementButton(label, action, danger = false) {
  const button = element("button", danger ? "danger-action" : "", label);
  button.type = "button";
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      const completed = await action();
      if (completed !== false) showToast("Operação realizada");
    } catch (error) {
      showToast(error.message);
    } finally {
      button.disabled = false;
    }
  });
  return button;
}
