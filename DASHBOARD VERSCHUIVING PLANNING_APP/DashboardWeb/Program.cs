using System.Globalization;
using System.Net;
using DashboardVerschuivingen.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

// Optioneel: kies een vaste poort voor duidelijkheid
app.Urls.Add("http://localhost:5174
// ");

app.UseCors();

// Klein HTML-frontje
app.MapGet("/", () =>
{
    var defaultDir = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, ".."));
    var html = IndexHtml.Replace("__DEFAULT_DIR__", WebUtility.HtmlEncode(defaultDir));
    return Results.Content(html, "text/html");
});

// Bestanden gewijzigd vandaag
app.MapGet("/api/today", (string? dir) =>
{
    var folder = string.IsNullOrWhiteSpace(dir) ? Directory.GetCurrentDirectory() : dir;
    if (!Directory.Exists(folder)) return Results.BadRequest(new { error = $"Map niet gevonden: {folder}" });

    var list = FileChangeService.ListChangedToday(folder, new[] { ".xlsx", ".xlsm" })
        .OrderBy(c => c.LastWriteTime)
        .Select(c => new { c.FullPath, lastWriteTime = c.LastWriteTime.ToString("yyyy-MM-dd HH:mm") })
        .ToList();
    return Results.Ok(list);
});

// Vergelijk de laatste twee bestanden met datum-prefix
app.MapGet("/api/diff", (string? dir, int? keyCol) =>
{
    var folder = string.IsNullOrWhiteSpace(dir) ? Directory.GetCurrentDirectory() : dir;
    if (!Directory.Exists(folder)) return Results.BadRequest(new { error = $"Map niet gevonden: {folder}" });

    var planFiles = Directory.EnumerateFiles(folder, "*.xlsx", SearchOption.TopDirectoryOnly)
        .Select(p => new { Path = p, Date = TryParseDatePrefix(Path.GetFileName(p)) })
        .Where(x => x.Date != null)
        .OrderBy(x => x.Date)
        .Select(x => x.Path)
        .ToList();

    if (planFiles.Count < 2)
        return Results.Ok(new { error = "Minstens twee planning-bestanden met prefix yyyyMMdd_ nodig." });

    var fileA = planFiles[^2];
    var fileB = planFiles[^1];

    var reader = new ExcelBasicReader();
    var rowsA = reader.ReadFirstWorksheetRows(fileA);
    var rowsB = reader.ReadFirstWorksheetRows(fileB);

    var diff = DiffService.DiffRows(rowsA, rowsB, keyColIndex1Based: keyCol ?? -1);

    var result = new
    {
        a = Path.GetFileName(fileA),
        b = Path.GetFileName(fileB),
        added = diff.Added.Take(10).Select(RowPreview).ToList(),
        removed = diff.Removed.Take(10).Select(RowPreview).ToList(),
        modified = diff.Modified.Take(10).Select(m => new
        {
            key = m.Key,
            oldRow = RowPreview(m.OldRow),
            newRow = RowPreview(m.NewRow)
        }).ToList(),
        counts = new { diff.AddedCount, diff.RemovedCount, diff.ModifiedCount }
    };
    return Results.Ok(result);
});

app.Run();

static DateTime? TryParseDatePrefix(string? fileName)
{
    if (string.IsNullOrWhiteSpace(fileName)) return null;
    var underscore = fileName.IndexOf('_');
    if (underscore <= 0) return null;
    var datePart = fileName[..underscore];
    if (DateTime.TryParseExact(datePart, "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
        return dt.Date;
    return null;
}

static string RowPreview(IReadOnlyList<string> row)
{
    var cols = row.Take(8).Select(c => (c ?? string.Empty).Replace('\n', ' ').Replace('\r', ' '));
    return string.Join(" | ", cols);
}

const string IndexHtml = @"<!doctype html>
<html lang=\"nl\"><head>
  <meta charset=\"utf-8\"/>
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>
  <title>Dashboard Verschuivingen</title>
  <style>
    body{font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:980px;margin:2rem auto;padding:0 1rem}
    input,button{font-size:1rem;padding:.5rem;margin:.25rem}
    code,pre{background:#f5f5f5;padding:.5rem;border-radius:.25rem;display:block}
    .row{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
    table{border-collapse:collapse;width:100%;margin:.5rem 0}
    th,td{border:1px solid #ddd;padding:.5rem;text-align:left}
    th{background:#fafafa}
  </style>
</head><body>
  <h1>Dashboard Verschuivingen</h1>
  <div class=\"row\">
    <label>Map (dir): <input id=\"dir\" size=\"60\" value=\"__DEFAULT_DIR__\" placeholder=\"C:\\...\\DASHBOARD VERSCHUIVING PLANNING\"/></label>
    <label>Sleutelkolom: <input id=\"keyCol\" type=\"number\" min=\"1\" style=\"width:6rem\"/></label>
  </div>
  <div class=\"row\">
    <button id=\"btnToday\">Vandaag</button>
    <button id=\"btnDiff\">Diff</button>
  </div>

  <h2>Resultaat</h2>
  <div id=\"out\"><em>Nog geen resultaat</em></div>

  <script>
  const $ = (id) => document.getElementById(id);
  const out = $('out');
  function escapeHtml(s){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  function showRaw(obj){ out.innerHTML = '<pre>' + escapeHtml(typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2)) + '</pre>'; }
  function showMessage(msg){ out.innerHTML = '<em>' + escapeHtml(msg) + '</em>'; }
  function table(headers, rowsHtml){
    const head = '<tr>' + headers.map(h => '<th>' + escapeHtml(h) + '</th>').join('') + '</tr>';
    return '<table>' + head + rowsHtml.join('') + '</table>';
  }
  function renderToday(list){
    if (!Array.isArray(list)) { showRaw(list); return; }
    if (list.length === 0){ showMessage('Geen wijzigingen gevonden vandaag.'); return; }
    const rows = list.map(it => '<tr><td>' + escapeHtml(it.lastWriteTime) + '</td><td>' + escapeHtml(it.FullPath || it.fullPath || '') + '</td></tr>');
    out.innerHTML = table(['Tijd','Bestand'], rows);
  }
  function renderDiff(res){
    if (res && res.error){ showRaw(res); return; }
    if (!res){ showMessage('Geen data.'); return; }
    let html = '';
    html += '<p><strong>Vergelijk</strong>: ' + escapeHtml(res.a || '') + ' ⟶ ' + escapeHtml(res.b || '') + '</p>';
    if (res.counts){
      html += '<p><strong>Tellingen</strong>: Toegevoegd ' + (res.counts.AddedCount ?? res.counts.addedCount ?? 0) + ', Verwijderd ' + (res.counts.RemovedCount ?? res.counts.removedCount ?? 0) + ', Gewijzigd ' + (res.counts.ModifiedCount ?? res.counts.modifiedCount ?? 0) + '</p>';
    }
    if (Array.isArray(res.added)){
      const rows = res.added.map(r => '<tr><td>' + escapeHtml(r) + '</td></tr>');
      html += '<h3>Toegevoegd (voorbeeld)</h3>' + table(['Rij'], rows);
    }
    if (Array.isArray(res.removed)){
      const rows = res.removed.map(r => '<tr><td>' + escapeHtml(r) + '</td></tr>');
      html += '<h3>Verwijderd (voorbeeld)</h3>' + table(['Rij'], rows);
    }
    if (Array.isArray(res.modified)){
      const rows = res.modified.map(m => '<tr><td>' + escapeHtml(m.key) + '</td><td>' + escapeHtml(m.oldRow) + '</td><td>' + escapeHtml(m.newRow) + '</td></tr>');
      html += '<h3>Gewijzigd (voorbeeld)</h3>' + table(['Sleutel','Oud','Nieuw'], rows);
    }
    out.innerHTML = html;
  }

  $('btnToday').onclick = async () => {
    const dir = encodeURIComponent($('dir').value.trim());
    const url = '/api/today' + (dir? ('?dir=' + dir):'');
    showMessage('Laden…');
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.error) showRaw(data); else renderToday(data);
    } catch (e) { showRaw(String(e)); }
  };

  $('btnDiff').onclick = async () => {
    const dir = encodeURIComponent($('dir').value.trim());
    const keyCol = $('keyCol').value.trim();
    const qp = [];
    if (dir) qp.push('dir=' + dir);
    if (keyCol) qp.push('keyCol=' + encodeURIComponent(keyCol));
    const url = '/api/diff' + (qp.length? '?' + qp.join('&'):'');
    showMessage('Laden…');
    try {
      const res = await fetch(url);
      const data = await res.json();
      renderDiff(data);
    } catch (e) { showRaw(String(e)); }
  };
  </script>
</body></html>";
