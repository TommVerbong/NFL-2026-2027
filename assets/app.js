const STORAGE_KEY = "nfl-poule-data-v1";
const ADMIN_PIN = "1904";
const owners = ["Tom", "Sjoerd", "Nick", "Marco"];
const ownerStyles = {
  Tom: { bg: "#fce7f3", border: "#ec4899", dot: "#ec4899", text: "#500724" },
  Sjoerd: { bg: "#dbeafe", border: "#3b82f6", dot: "#3b82f6", text: "#172554" },
  Nick: { bg: "#d1fae5", border: "#10b981", dot: "#10b981", text: "#064e3b" },
  Marco: { bg: "#fef3c7", border: "#f59e0b", dot: "#f59e0b", text: "#78350f" },
  Vrij: { bg: "#f1f5f9", border: "#cbd5e1", dot: "#94a3b8", text: "#334155" },
};

let state = null;
let isAdmin = false;
let selectedWeek = 1;
let activeTab = "schedule";

const $ = (id) => document.getElementById(id);

async function init() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    state = JSON.parse(stored);
  } else {
    const response = await fetch("data.json", { cache: "no-store" });
    state = await response.json();
  }
  selectedWeek = getWeeks()[0] || 1;
  bindEvents();
  render();
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state, null, 2));
}

function getWeeks() {
  return [...new Set(state.schedule.map(game => game.week))].sort((a, b) => a - b);
}

function isCompleted(game) {
  return game.awayScore !== "" && game.homeScore !== "" && game.awayScore !== null && game.homeScore !== null && !Number.isNaN(Number(game.awayScore)) && !Number.isNaN(Number(game.homeScore));
}

function getWinner(game) {
  if (!isCompleted(game)) return null;
  const away = Number(game.awayScore);
  const home = Number(game.homeScore);
  if (away > home) return game.away;
  if (home > away) return game.home;
  return "Draw";
}

function getTeamResult(game, team) {
  const winner = getWinner(game);
  if (!winner) return "open";
  if (winner === "Draw") return "draw";
  return winner === team ? "win" : "loss";
}

function teamOwner(team) {
  return state.teamOwners[team] || "Vrij";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[char]));
}

function teamBadge(team) {
  const owner = teamOwner(team);
  const style = ownerStyles[owner] || ownerStyles.Vrij;
  return `<span class="team-badge" style="background:${style.bg};border-color:${style.border};color:${style.text}" title="${escapeHtml(team)} van ${escapeHtml(owner)}"><span class="dot" style="background:${style.dot}"></span>${escapeHtml(team)}</span>`;
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      render();
    });
  });
  $("loginBtn").addEventListener("click", () => {
    isAdmin = $("pinInput").value === ADMIN_PIN;
    $("pinInput").value = "";
    render();
  });
  $("logoutBtn").addEventListener("click", () => { isAdmin = false; render(); });
  $("weekSelect").addEventListener("change", e => { selectedWeek = Number(e.target.value); render(); });
  $("searchInput").addEventListener("input", renderScheduleList);
  $("lockWeekBtn").addEventListener("click", toggleWeekLock);
  $("downloadJsonBtn").addEventListener("click", downloadJson);
  $("importJsonInput").addEventListener("change", importJson);
  $("resetLocalBtn").addEventListener("click", () => {
    if (!confirm("Lokale invoer wissen en terug naar data.json uit de repository?")) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
}

function render() {
  document.querySelectorAll(".tab").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === activeTab));
  $("scheduleTab").classList.toggle("active", activeTab === "schedule");
  $("standingsTab").classList.toggle("active", activeTab === "standings");
  $("adminLogin").classList.toggle("hidden", isAdmin);
  $("adminStatus").classList.toggle("hidden", !isAdmin);
  renderLegend();
  renderWeekSelect();
  renderWeekStatus();
  renderDoublers();
  renderScheduleList();
  renderAuditLog();
  renderStandings();
}

function renderLegend() {
  $("ownerLegend").innerHTML = owners.map(owner => {
    const style = ownerStyles[owner];
    const count = Object.values(state.teamOwners).filter(value => value === owner).length;
    return `<div class="owner-card" style="background:${style.bg};border-color:${style.border}"><div class="owner-name" style="color:${style.text}"><span class="dot" style="background:${style.dot}"></span>${owner}</div><small>${count} teams</small></div>`;
  }).join("");
}

function renderWeekSelect() {
  const weeks = getWeeks();
  $("weekSelect").innerHTML = weeks.map(week => `<option value="${week}" ${week === selectedWeek ? "selected" : ""}>Week ${week}</option>`).join("");
}

function renderWeekStatus() {
  const locked = state.lockedWeeks.includes(selectedWeek);
  const status = $("weekStatus");
  status.className = `week-status ${locked ? "locked" : "open"}`;
  status.textContent = locked ? `Week ${selectedWeek} is vergrendeld.` : `Week ${selectedWeek} staat open. Alleen admin kan wijzigen.`;
  const btn = $("lockWeekBtn");
  btn.disabled = !isAdmin;
  btn.textContent = locked ? `Week ${selectedWeek} openen` : `Week ${selectedWeek} vergrendelen`;
}

function renderDoublers() {
  $("doublersTitle").textContent = `Verdubbelaars week ${selectedWeek}`;
  const locked = state.lockedWeeks.includes(selectedWeek);
  const editable = isAdmin && !locked;
  const teamsByOwner = Object.fromEntries(owners.map(owner => [owner, []]));
  state.schedule.filter(game => game.week === selectedWeek).forEach(game => {
    [game.away, game.home].forEach(team => {
      const owner = teamOwner(team);
      if (teamsByOwner[owner] && !teamsByOwner[owner].includes(team)) teamsByOwner[owner].push(team);
    });
  });
  const weekDoublers = state.doublers[selectedWeek] || {};
  $("doublersGrid").innerHTML = owners.map(owner => {
    const style = ownerStyles[owner];
    const options = [`<option value="">Kies verdubbelaar</option>`].concat((teamsByOwner[owner] || []).map(team => `<option value="${team}" ${weekDoublers[owner] === team ? "selected" : ""}>${team}</option>`));
    return `<div class="doubler-card" style="background:${style.bg};border-color:${style.border}"><div style="width:100%"><strong style="color:${style.text}">${owner}</strong><select data-owner="${owner}" class="doubler-select" ${editable ? "" : "disabled"}>${options.join("")}</select></div></div>`;
  }).join("");
  document.querySelectorAll(".doubler-select").forEach(select => {
    select.addEventListener("change", e => {
      if (!state.doublers[selectedWeek]) state.doublers[selectedWeek] = {};
      state.doublers[selectedWeek][e.target.dataset.owner] = e.target.value;
      saveLocal();
      render();
    });
  });
}

function renderScheduleList() {
  const q = ($("searchInput")?.value || "").trim().toLowerCase();
  const locked = state.lockedWeeks.includes(selectedWeek);
  const editable = isAdmin && !locked;
  const games = state.schedule.filter(game => game.week === selectedWeek && (!q || [game.away, game.home, game.date, game.time, game.tv].join(" ").toLowerCase().includes(q)));
  $("scheduleList").innerHTML = games.map(game => `
    <div class="grid-row data-row schedule-grid">
      <div><strong>${escapeHtml(game.date)}</strong><br><small>Week ${game.week}</small></div>
      <div>${escapeHtml(game.time)}</div>
      <div>${teamBadge(game.away)}</div>
      <div class="score-inputs"><input type="number" data-id="${game.id}" data-field="awayScore" value="${escapeHtml(game.awayScore)}" ${editable ? "" : "disabled"}><strong>-</strong><input type="number" data-id="${game.id}" data-field="homeScore" value="${escapeHtml(game.homeScore)}" ${editable ? "" : "disabled"}></div>
      <div>${teamBadge(game.home)}</div>
    </div>`).join("");
  document.querySelectorAll(".score-inputs input").forEach(input => {
    input.addEventListener("change", e => {
      const game = state.schedule.find(item => item.id === e.target.dataset.id);
      game[e.target.dataset.field] = e.target.value === "" ? "" : Number(e.target.value);
      saveLocal();
      render();
    });
  });
}

function renderAuditLog() {
  $("auditLog").innerHTML = (state.auditLog || []).map(item => `<div>${escapeHtml(item)}</div>`).join("") || `<div>Nog geen acties uitgevoerd.</div>`;
}

function toggleWeekLock() {
  if (!isAdmin) return;
  const idx = state.lockedWeeks.indexOf(selectedWeek);
  const time = new Date().toLocaleString("nl-NL");
  if (idx >= 0) {
    state.lockedWeeks.splice(idx, 1);
    state.auditLog.unshift(`${time}: Tom heeft week ${selectedWeek} geopend.`);
  } else {
    state.lockedWeeks.push(selectedWeek);
    state.lockedWeeks.sort((a, b) => a - b);
    state.auditLog.unshift(`${time}: Tom heeft week ${selectedWeek} vergrendeld.`);
  }
  saveLocal();
  render();
}

function calculateStats() {
  const weeks = getWeeks();
  const lockedSet = new Set(state.lockedWeeks);
  const completedWeeks = new Set(state.schedule.filter(isCompleted).map(game => game.week));
  const ownerRows = Object.fromEntries(owners.map(owner => [owner, { owner, points: 0, wins: 0, losses: 0, draws: 0, doublerHits: 0, weekly: Object.fromEntries(weeks.map(week => [week, 0])) }]));
  const teamRows = Object.fromEntries(Object.keys(state.teamOwners).map(team => [team, { team, owner: teamOwner(team), points: 0, wins: 0, losses: 0, draws: 0, played: 0, homeWins: 0, awayWins: 0 }]));
  const gameScores = [];
  const homeWins = {};
  const awayWins = {};
  const ownerHomeWins = Object.fromEntries(owners.map(owner => [owner, 0]));
  const ownerAwayWins = Object.fromEntries(owners.map(owner => [owner, 0]));

  state.schedule.forEach(game => {
    if (!isCompleted(game)) return;
    const winner = getWinner(game);
    gameScores.push({ label: `${game.away} @ ${game.home}`, totalScore: Number(game.awayScore) + Number(game.homeScore) });
    [game.away, game.home].forEach(team => {
      const owner = teamOwner(team);
      const result = getTeamResult(game, team);
      const isDoubler = (state.doublers[game.week] || {})[owner] === team;
      let points = 0;
      if (result === "win" || result === "draw") points = 1;
      if (isDoubler && points > 0) points += 1;
      if (isDoubler && result === "win") ownerRows[owner].doublerHits += 1;
      ownerRows[owner].points += points;
      ownerRows[owner].weekly[game.week] += points;
      teamRows[team].points += points;
      teamRows[team].played += 1;
      if (result === "win") { ownerRows[owner].wins += 1; teamRows[team].wins += 1; }
      if (result === "loss") { ownerRows[owner].losses += 1; teamRows[team].losses += 1; }
      if (result === "draw") { ownerRows[owner].draws += 1; teamRows[team].draws += 1; }
    });
    if (winner !== "Draw") {
      const winningOwner = teamOwner(winner);
      if (winner === game.home) {
        homeWins[winner] = (homeWins[winner] || 0) + 1;
        teamRows[winner].homeWins += 1;
        ownerHomeWins[winningOwner] += 1;
      } else {
        awayWins[winner] = (awayWins[winner] || 0) + 1;
        teamRows[winner].awayWins += 1;
        ownerAwayWins[winningOwner] += 1;
      }
    }
  });

  const rows = Object.values(ownerRows).sort((a, b) => b.points - a.points || a.owner.localeCompare(b.owner));
  const weeklyScores = rows.flatMap(row => Object.entries(row.weekly).map(([week, score]) => ({ owner: row.owner, week: Number(week), label: `${row.owner} week ${week}`, score, locked: lockedSet.has(Number(week)), completed: completedWeeks.has(Number(week)) })));
  const playedTeams = Object.values(teamRows).filter(team => team.played > 0);
  return {
    rows,
    highestWeek: leaders(weeklyScores.filter(item => item.completed), "score", "label"),
    lowestWeek: lows(weeklyScores.filter(item => item.locked && item.completed), "score", "label"),
    highestGame: leaders(gameScores, "totalScore", "label"),
    lowestGame: lows(gameScores, "totalScore", "label"),
    bestDoubler: leaders(rows, "doublerHits", "owner"),
    bestHomeTeams: leaders(Object.entries(homeWins).map(([label, count]) => ({ label, count })), "count", "label"),
    bestAwayTeams: leaders(Object.entries(awayWins).map(([label, count]) => ({ label, count })), "count", "label"),
    bestHomeOwners: leaders(Object.entries(ownerHomeWins).map(([label, count]) => ({ label, count })), "count", "label"),
    bestAwayOwners: leaders(Object.entries(ownerAwayWins).map(([label, count]) => ({ label, count })), "count", "label"),
    topTeams: [...playedTeams].sort((a, b) => b.points - a.points || b.wins - a.wins || a.team.localeCompare(b.team)).slice(0, 5),
    worstTeams: [...playedTeams].sort((a, b) => a.points - b.points || b.losses - a.losses || a.team.localeCompare(b.team)).slice(0, 5),
  };
}

function leaders(items, valueKey, labelKey) {
  if (!items.length) return { labels: [], value: 0 };
  const max = Math.max(...items.map(item => item[valueKey]));
  return { labels: items.filter(item => item[valueKey] === max).map(item => item[labelKey]), value: max };
}
function lows(items, valueKey, labelKey) {
  if (!items.length) return { labels: [], value: 0 };
  const min = Math.min(...items.map(item => item[valueKey]));
  return { labels: items.filter(item => item[valueKey] === min).map(item => item[labelKey]), value: min };
}

function renderStandings() {
  const stats = calculateStats();
  $("rankingList").innerHTML = stats.rows.map((row, index) => {
    const style = ownerStyles[row.owner];
    return `<div class="grid-row data-row standings-grid"><div><strong>${index + 1}</strong></div><div><span class="dot" style="background:${style.dot}"></span> <strong style="color:${style.text}">${row.owner}</strong></div><div class="right"><strong>${row.points}</strong></div><div class="right">${row.wins}-${row.losses}-${row.draws}</div><div class="right">${row.doublerHits}</div></div>`;
  }).join("");
  const cards = [
    ["Beste verdubbelaar", formatList(stats.bestDoubler.labels), `${stats.bestDoubler.value} verdubbelaar hit(s)`],
    ["Hoogste weekscore", formatList(stats.highestWeek.labels), `${stats.highestWeek.value} punten in die week`],
    ["Laagste weekscore", formatList(stats.lowestWeek.labels), stats.lowestWeek.labels.length ? `${stats.lowestWeek.value} punten in vergrendelde week` : "Nog geen vergrendelde ingevulde week"],
    ["Laagste wedstrijdscore", formatList(stats.lowestGame.labels), `${stats.lowestGame.value} totaalpunten`],
    ["Hoogste wedstrijdscore", formatList(stats.highestGame.labels), `${stats.highestGame.value} totaalpunten`],
    ["Meeste thuiswins team", formatList(stats.bestHomeTeams.labels), `${stats.bestHomeTeams.value} thuisoverwinning(en)`],
    ["Meeste uitwins team", formatList(stats.bestAwayTeams.labels), `${stats.bestAwayTeams.value} uitoverwinning(en)`],
    ["Thuis/uit per speler", `Thuis: ${formatList(stats.bestHomeOwners.labels)}`, `Uit: ${formatList(stats.bestAwayOwners.labels)}`],
  ];
  $("statCards").innerHTML = cards.map(([title, value, sub]) => `<section class="card stat-card"><h3>${title}</h3><strong>${value}</strong><p>${sub}</p></section>`).join("");
  $("playerStats").innerHTML = stats.rows.map((row, index) => {
    const style = ownerStyles[row.owner];
    return `<div class="grid-row data-row player-grid"><div><span class="dot" style="background:${style.dot}"></span> <strong style="color:${style.text}">${row.owner}</strong></div><div class="right"><strong>${row.points}</strong></div><div class="right">${row.wins}</div><div class="right">${row.losses}</div><div class="right">${row.draws}</div><div class="right">${row.doublerHits}</div></div>`;
  }).join("");
  renderTeamTable("topTeams", stats.topTeams);
  renderTeamTable("worstTeams", stats.worstTeams);
}

function renderTeamTable(id, rows) {
  $(id).innerHTML = rows.map((row, index) => `<div class="grid-row data-row team-row"><div><strong>${index + 1}</strong></div><div>${teamBadge(row.team)}</div><div class="right">${row.wins}-${row.losses}-${row.draws}</div><div class="right"><strong>${row.points} pt</strong></div></div>`).join("");
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.json";
  a.click();
  URL.revokeObjectURL(url);
}
function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state = JSON.parse(reader.result);
    saveLocal();
    render();
  };
  reader.readAsText(file);
}

init();
