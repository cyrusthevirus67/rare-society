// Society admin: course content, live Q&A + community links, members, and the waitlist.
(() => {
  const { api, configured, DEMO, esc, fmtDate, toast } = window.RS;
  const root = document.getElementById("root");
  const S = { tab: "course", modules: [], members: [], waitlist: [], settings: {}, open: null };
  if (DEMO) document.getElementById("demo-bar").hidden = false;

  const val = (form, name) => form.elements[name].value.trim();
  const num = (v) => (v === "" || v == null ? null : Number(v));
  const fail = (err) => { console.error(err); toast(err && err.message ? err.message : "That didn’t save. Try again.", true); };

  function frame(body) {
    const tabs = [["course", "Course"], ["live", "Live & community"], ["members", "Members"], ["waitlist", "Waitlist"]];
    root.innerHTML = `
      <p class="kicker">Admin</p>
      <h1>The Rare Society</h1>
      <div class="tabs" role="tablist">${tabs.map(([k, t]) => `<button role="tab" data-tab="${k}" aria-selected="${S.tab === k}">${t}</button>`).join("")}</div>
      ${body}`;
    root.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { S.tab = b.dataset.tab; S.open = null; render(); }));
  }

  // ---------- Course ----------
  const moduleEditor = (m = {}) => `
    <form class="editor" data-form="module" data-id="${esc(m.id || "")}">
      <div class="row3">
        <label class="field">Module title<input name="title" value="${esc(m.title || "")}" required maxlength="200"></label>
        <label class="field">Order<input name="position" type="number" value="${esc(m.position ?? S.modules.length + 1)}"></label>
        <label class="field check" style="align-self:end"><input type="checkbox" name="published"${m.published !== false ? " checked" : ""}> Show on site</label>
      </div>
      <label class="field">Short description <small>(shown on the sales page)</small><input name="summary" value="${esc(m.summary || "")}" maxlength="300"></label>
      <div class="editor__actions">
        <button class="btn btn--red btn--sm">Save module</button>
        <button type="button" class="btn btn--line btn--sm" data-cancel>Cancel</button>
        ${m.id ? '<button type="button" class="btn btn--ghost btn--sm" data-delete-module style="margin-left:auto">Delete module</button>' : ""}
      </div>
    </form>`;
  const lessonEditor = (l, moduleId) => `
    <form class="editor" data-form="lesson" data-id="${esc(l.id || "")}">
      <div class="row3">
        <label class="field">Lesson title<input name="title" value="${esc(l.title || "")}" required maxlength="200"></label>
        <label class="field">Order<input name="position" type="number" value="${esc(l.position ?? "")}"></label>
        <label class="field">Minutes<input name="duration_min" type="number" min="0" value="${esc(l.duration_min ?? "")}"></label>
      </div>
      <label class="field">Module
        <select name="module_id">${S.modules.map((m) => `<option value="${esc(m.id)}"${m.id === (l.module_id || moduleId) ? " selected" : ""}>${esc(m.title)}</option>`).join("")}</select>
      </label>
      <label class="field">Video link <small>(YouTube, Vimeo, Loom, or an .mp4 link — use unlisted or private videos)</small><input name="video_url" value="${esc(l.video_url || "")}" placeholder="https://vimeo.com/…"></label>
      <label class="field">Lesson notes <small>(shown under the video; links become clickable)</small><textarea name="body" rows="6">${esc(l.body || "")}</textarea></label>
      <label class="field">Resource link <small>(optional worksheet or download)</small><input name="resource_url" value="${esc(l.resource_url || "")}" placeholder="https://…"></label>
      <label class="field check"><input type="checkbox" name="published"${l.published ? " checked" : ""}> Published — members can see it</label>
      <div class="editor__actions">
        <button class="btn btn--red btn--sm">Save lesson</button>
        <button type="button" class="btn btn--line btn--sm" data-cancel>Cancel</button>
        ${l.id ? '<button type="button" class="btn btn--ghost btn--sm" data-delete-lesson style="margin-left:auto">Delete lesson</button>' : ""}
      </div>
    </form>`;

  function renderCourse() {
    const o = S.open || {};
    frame(`
      <p class="stage__lede" style="margin-bottom:24px">Add modules, then lessons inside them. Only published lessons are visible to members; module titles and lesson titles also appear on the sales page.</p>
      ${S.modules.map((m, i) => `
        <section class="adm-mod">
          <div class="adm-mod__head">
            <span class="adm-pos">${String(i + 1).padStart(2, "0")}</span>
            <h3>${esc(m.title)}</h3>${m.published ? "" : '<span class="draft">Hidden</span>'}
            <span class="spacer"></span>
            <button class="btn btn--line btn--xs" data-edit-module="${esc(m.id)}">Edit module</button>
            <button class="btn btn--red btn--xs" data-add-lesson="${esc(m.id)}">+ Lesson</button>
          </div>
          ${o.kind === "module" && o.id === m.id ? moduleEditor(m) : ""}
          ${m.lessons.map((l) => `
            <div class="adm-row">
              <span class="adm-pos">${esc(l.position ?? "")}</span>
              <b>${esc(l.title)}</b>
              ${l.published ? "" : '<span class="draft">Draft</span>'}
              <small>${[l.duration_min ? `${l.duration_min} min` : "", l.video_url ? "video ✓" : "no video yet"].filter(Boolean).join(" · ")}</small>
              <span class="spacer"></span>
              <button class="btn btn--line btn--xs" data-edit-lesson="${esc(l.id)}">Edit</button>
            </div>
            ${o.kind === "lesson" && o.id === l.id ? lessonEditor(l) : ""}`).join("")}
          ${o.kind === "lesson" && !o.id && o.module === m.id ? lessonEditor({ position: m.lessons.length + 1 }, m.id) : ""}
          ${!m.lessons.length && !(o.kind === "lesson" && o.module === m.id) ? '<p class="empty">No lessons yet.</p>' : ""}
        </section>`).join("") || '<p class="empty">No modules yet. Add your first one below.</p>'}
      ${o.kind === "module" && !o.id ? `<section class="adm-mod">${moduleEditor()}</section>` : '<button class="btn btn--line" data-add-module>+ Add module</button>'}`);

    const reopen = (next) => { S.open = next; render(); };
    root.querySelectorAll("[data-edit-module]").forEach((b) => b.addEventListener("click", () => reopen({ kind: "module", id: b.dataset.editModule })));
    root.querySelectorAll("[data-add-lesson]").forEach((b) => b.addEventListener("click", () => reopen({ kind: "lesson", module: b.dataset.addLesson })));
    root.querySelectorAll("[data-edit-lesson]").forEach((b) => b.addEventListener("click", () => reopen({ kind: "lesson", id: b.dataset.editLesson })));
    const add = root.querySelector("[data-add-module]");
    if (add) add.addEventListener("click", () => reopen({ kind: "module" }));
    root.querySelectorAll("[data-cancel]").forEach((b) => b.addEventListener("click", () => reopen(null)));

    root.querySelectorAll('form[data-form="module"]').forEach((f) => {
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!val(f, "title")) return toast("Give the module a title.", true);
        const row = { title: val(f, "title"), summary: val(f, "summary") || null, position: num(val(f, "position")) ?? 0, published: f.elements.published.checked };
        if (f.dataset.id) row.id = f.dataset.id;
        try { await api.saveModule(row); toast("Module saved."); S.open = null; await refresh(); } catch (err) { fail(err); }
      });
      const del = f.querySelector("[data-delete-module]");
      if (del) del.addEventListener("click", async () => {
        if (!confirm("Delete this module and every lesson in it? This can’t be undone.")) return;
        try { await api.deleteModule(f.dataset.id); toast("Module deleted."); S.open = null; await refresh(); } catch (err) { fail(err); }
      });
    });
    root.querySelectorAll('form[data-form="lesson"]').forEach((f) => {
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!val(f, "title")) return toast("Give the lesson a title.", true);
        for (const k of ["video_url", "resource_url"]) if (val(f, k) && !/^https?:\/\//i.test(val(f, k))) return toast("Links must start with https://", true);
        const row = {
          title: val(f, "title"), module_id: f.elements.module_id.value, position: num(val(f, "position")) ?? 0,
          duration_min: num(val(f, "duration_min")), video_url: val(f, "video_url") || null, resource_url: val(f, "resource_url") || null,
          body: f.elements.body.value.trim() || null, published: f.elements.published.checked,
        };
        if (f.dataset.id) row.id = f.dataset.id;
        try { await api.saveLesson(row); toast(row.published ? "Lesson saved and published." : "Lesson saved as a draft."); S.open = null; await refresh(); } catch (err) { fail(err); }
      });
      const del = f.querySelector("[data-delete-lesson]");
      if (del) del.addEventListener("click", async () => {
        if (!confirm("Delete this lesson? This can’t be undone.")) return;
        try { await api.deleteLesson(f.dataset.id); toast("Lesson deleted."); S.open = null; await refresh(); } catch (err) { fail(err); }
      });
    });
  }

  // ---------- Live & community ----------
  function renderLive() {
    const st = S.settings;
    const local = st.qa_next_at ? new Date(new Date(st.qa_next_at).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : "";
    frame(`
      <form class="form" id="live-form" style="max-width:720px" novalidate>
        <h3>Monthly live Q&amp;A</h3>
        <p>Members see this on their home page. Update it after each session.</p>
        <div class="row2">
          <label class="field">Next session (your time)<input name="qa_next_at" type="datetime-local" value="${esc(local)}"></label>
          <label class="field">Join link <small>(Zoom, Google Meet…)</small><input name="qa_link" value="${esc(st.qa_link || "")}" placeholder="https://…"></label>
        </div>
        <label class="field">Note for members<input name="qa_note" value="${esc(st.qa_note || "")}" maxlength="300" placeholder="Bring your questions…"></label>
        <h3 style="margin-top:12px">Community</h3>
        <div class="row2">
          <label class="field">Name<input name="community_name" value="${esc(st.community_name || "")}" placeholder="The Rare Society group"></label>
          <label class="field">Invite link<input name="community_link" value="${esc(st.community_link || "")}" placeholder="https://…"></label>
        </div>
        <label class="field">Welcome message <small>(optional, top of members’ home page)</small><textarea name="welcome_note" rows="3" maxlength="600">${esc(st.welcome_note || "")}</textarea></label>
        <button class="btn btn--red">Save</button>
      </form>`);
    const f = document.getElementById("live-form");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      for (const k of ["qa_link", "community_link"]) if (val(f, k) && !/^https?:\/\//i.test(val(f, k))) return toast("Links must start with https://", true);
      const when = val(f, "qa_next_at");
      const obj = { qa_next_at: when ? new Date(when).toISOString() : "", qa_link: val(f, "qa_link"), qa_note: val(f, "qa_note"), community_name: val(f, "community_name"), community_link: val(f, "community_link"), welcome_note: f.elements.welcome_note.value.trim() };
      try { await api.saveSettings(obj); Object.assign(S.settings, obj); toast("Saved."); } catch (err) { fail(err); }
    });
  }

  // ---------- Members ----------
  const STATUS = { none: "No membership", active: "Active", past_due: "Payment issue", cancel_requested: "Cancel requested", cancelled: "Ended" };
  function renderMembers() {
    const active = S.members.filter((m) => ["active", "past_due", "cancel_requested"].includes(m.membership_status)).length;
    const owners = S.members.filter((m) => m.course_owned).length;
    frame(`
      <p class="stage__lede" style="margin-bottom:22px"><b style="color:#fff">${active}</b> active member${active === 1 ? "" : "s"} · <b style="color:#fff">${owners}</b> course owner${owners === 1 ? "" : "s"}. Purchases appear here automatically. Cancel memberships in Stripe (at period end) — this list updates when Stripe ends them.</p>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Member</th><th>Membership</th><th>Course</th><th>Joined</th><th>Renews</th></tr></thead>
          <tbody>${S.members.map((m) => `
            <tr>
              <td><b>${esc(m.name || "—")}</b><br><small style="color:var(--muted)">${esc(m.email)}</small></td>
              <td><select data-status="${esc(m.email)}">${Object.entries(STATUS).map(([k, t]) => `<option value="${k}"${k === m.membership_status ? " selected" : ""}>${t}</option>`).join("")}</select></td>
              <td><label class="check"><input type="checkbox" data-course="${esc(m.email)}"${m.course_owned ? " checked" : ""}> Owns</label></td>
              <td>${esc(fmtDate(m.joined_at, { month: "short", day: "numeric", year: "numeric" }))}</td>
              <td>${esc(fmtDate(m.current_period_end, { month: "short", day: "numeric" }) || "—")}</td>
            </tr>`).join("") || '<tr><td colspan="5" class="empty">No members yet.</td></tr>'}</tbody>
        </table>
      </div>
      <form class="form" id="add-member" style="max-width:720px;margin-top:28px" novalidate>
        <h3>Give someone access</h3>
        <p>For comps, partners, or anyone who paid another way. They sign in with this email.</p>
        <div class="row2">
          <label class="field">Email<input name="email" type="email" required></label>
          <label class="field">Name<input name="name"></label>
        </div>
        <label class="field">Access
          <select name="access"><option value="membership">Membership (course + live Q&amp;A + community)</option><option value="course">Course only, for good</option></select>
        </label>
        <button class="btn btn--red">Give access</button>
      </form>`);
    root.querySelectorAll("[data-status]").forEach((s) => s.addEventListener("change", async () => {
      try { await api.saveMember({ email: s.dataset.status, membership_status: s.value }); toast("Updated."); await refresh(); } catch (err) { fail(err); }
    }));
    root.querySelectorAll("[data-course]").forEach((c) => c.addEventListener("change", async () => {
      try { await api.saveMember({ email: c.dataset.course, course_owned: c.checked }); toast("Updated."); await refresh(); } catch (err) { fail(err); }
    }));
    const f = document.getElementById("add-member");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = val(f, "email").toLowerCase();
      if (!email || !f.elements.email.checkValidity()) return toast("Enter a valid email.", true);
      const row = { email, name: val(f, "name") || null, note: "Added in admin" };
      if (f.elements.access.value === "course") row.course_owned = true; else row.membership_status = "active";
      try { await api.saveMember(row); toast(`${email} now has access.`); await refresh(); } catch (err) { fail(err); }
    });
  }

  // ---------- Waitlist ----------
  function renderWaitlist() {
    frame(`
      <p class="stage__lede" style="margin-bottom:22px">${S.waitlist.length} ${S.waitlist.length === 1 ? "person is" : "people are"} waiting. Email them when doors open.</p>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Name</th><th>Email</th><th>Wants</th><th>Signed up</th></tr></thead>
          <tbody>${S.waitlist.map((w) => `<tr><td>${esc(w.name)}</td><td><a href="mailto:${esc(w.email)}" style="color:var(--text)">${esc(w.email)}</a></td><td>${esc((w.message || "").replace(/^Waitlist — /, "") || "—")}</td><td>${esc(fmtDate(w.created_at, { month: "short", day: "numeric" }))}</td></tr>`).join("") || '<tr><td colspan="4" class="empty">Nobody yet.</td></tr>'}</tbody>
        </table>
      </div>
      ${S.waitlist.length ? `<p style="margin-top:18px"><a class="btn btn--line btn--sm" href="mailto:?bcc=${encodeURIComponent(S.waitlist.map((w) => w.email).join(","))}&subject=${encodeURIComponent("The Rare Society is open")}">Email everyone (BCC)</a></p>` : ""}`);
  }

  function render() {
    ({ course: renderCourse, live: renderLive, members: renderMembers, waitlist: renderWaitlist })[S.tab]();
  }
  async function refresh() {
    const [modules, members, waitlist] = await Promise.all([api.course(), api.members(), api.waitlist()]);
    Object.assign(S, { modules, members, waitlist });
    S.settings = await api.settings().catch(() => ({}));
    render();
  }

  (async () => {
    if (!configured) { root.innerHTML = "<h1>Not available</h1>"; return; }
    try {
      const session = await api.session();
      if (!session) { location.replace("/login"); return; }
      const me = await api.me();
      if (!me.admin) { root.innerHTML = `<p class="kicker">Admin</p><h1>Admins only</h1><p class="stage__lede">You’re signed in as ${esc(me.email)}, which isn’t an admin account. <a href="/learn" style="color:#fff">Go to the course</a>.</p>`; return; }
      await refresh();
    } catch (err) {
      console.error(err);
      root.innerHTML = `<h1>Couldn’t load admin</h1><p class="stage__lede">${esc(err.message || "Refresh to try again.")}</p>`;
    }
  })();
})();
