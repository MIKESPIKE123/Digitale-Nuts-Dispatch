using System.Globalization;
using DashboardVerschuivingen.Services;

namespace DashboardVerschuivingen;

internal static class Program
{
    private static int Main(string[] args)
    {
        try
        {
            return Run(args);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Fout: {ex.Message}");
            return 1;
        }
    }

    private static int Run(string[] args)
    {
        if (args.Length == 0 || args.Contains("--help") || args.Contains("-h"))
        {
            PrintHelp();
            return 0;
        }

        string dataDir = Environment.CurrentDirectory;
        int keyCol = -1; // 1-based; -1 = geen sleutel
        bool doToday = false;
        bool doDiff = false;

        for (int i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--data":
                    if (i + 1 >= args.Length) throw new ArgumentException("Ontbrekende waarde voor --data");
                    dataDir = args[++i];
                    break;
                case "--key-col":
                    if (i + 1 >= args.Length) throw new ArgumentException("Ontbrekende waarde voor --key-col");
                    if (!int.TryParse(args[++i], out keyCol) || keyCol == 0)
                        throw new ArgumentException("--key-col moet een positief getal zijn");
                    break;
                case "--today":
                    doToday = true;
                    break;
                case "--diff":
                    doDiff = true;
                    break;
                default:
                    throw new ArgumentException($"Onbekende optie: {args[i]}");
            }
        }

        if (!Directory.Exists(dataDir))
            throw new DirectoryNotFoundException($"Map niet gevonden: {dataDir}");

        if (!doToday && !doDiff)
        {
            Console.WriteLine("Geen actie opgegeven. Gebruik --today en/of --diff (zie --help).");
            return 1;
        }

        if (doToday)
        {
            Console.WriteLine("\n== Bestanden gewijzigd vandaag ==");
            var changes = FileChangeService.ListChangedToday(dataDir, new[] { ".xlsx", ".xlsm" });
            if (!changes.Any())
            {
                Console.WriteLine("Geen wijzigingen gevonden vandaag (op basis van bestandsdatum).");
            }
            else
            {
                foreach (var c in changes.OrderBy(c => c.LastWriteTime))
                {
                    Console.WriteLine($"{c.LastWriteTime:yyyy-MM-dd HH:mm}  {c.FullPath}");
                }
            }
        }

        if (doDiff)
        {
            Console.WriteLine("\n== Vergelijk laatste twee planningen ==");
            var planFiles = Directory.EnumerateFiles(dataDir, "*.xlsx", SearchOption.TopDirectoryOnly)
                .Select(p => new { Path = p, Date = TryParseDatePrefix(Path.GetFileName(p)) })
                .Where(x => x.Date != null)
                .OrderBy(x => x.Date)
                .Select(x => x.Path)
                .ToList();

            if (planFiles.Count < 2)
            {
                Console.WriteLine("Minder dan twee planning-bestanden met datum-prefix (yyyyMMdd_) gevonden.");
            }
            else
            {
                var fileA = planFiles[^2];
                var fileB = planFiles[^1];
                Console.WriteLine($"Vergelijk: \n A: {Path.GetFileName(fileA)}\n B: {Path.GetFileName(fileB)}\n");

                var reader = new ExcelBasicReader();
                var rowsA = reader.ReadFirstWorksheetRows(fileA);
                var rowsB = reader.ReadFirstWorksheetRows(fileB);

                var diff = DiffService.DiffRows(rowsA, rowsB, keyColIndex1Based: keyCol);

                Console.WriteLine($"Toegevoegd: {diff.AddedCount}, Verwijderd: {diff.RemovedCount}, Gewijzigd (op sleutel): {diff.ModifiedCount}");

                if (diff.Added.Any())
                {
                    Console.WriteLine("\n-- Voorbeelden: Toegevoegd (max 10) --");
                    foreach (var r in diff.Added.Take(10)) Console.WriteLine(RowPreview(r));
                }
                if (diff.Removed.Any())
                {
                    Console.WriteLine("\n-- Voorbeelden: Verwijderd (max 10) --");
                    foreach (var r in diff.Removed.Take(10)) Console.WriteLine(RowPreview(r));
                }
                if (diff.Modified.Any())
                {
                    Console.WriteLine("\n-- Voorbeelden: Gewijzigd (max 10) --");
                    foreach (var m in diff.Modified.Take(10))
                    {
                        Console.WriteLine($"Sleutel={m.Key} | Oud={RowPreview(m.OldRow)} | Nieuw={RowPreview(m.NewRow)}");
                    }
                }
            }
        }

        return 0;
    }

    private static DateTime? TryParseDatePrefix(string? fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName)) return null;
        var underscore = fileName.IndexOf('_');
        if (underscore <= 0) return null;
        var datePart = fileName[..underscore];
        if (DateTime.TryParseExact(datePart, "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            return dt.Date;
        return null;
    }

    private static string RowPreview(IReadOnlyList<string> row)
    {
        var cols = row.Take(8).Select(c => (c ?? string.Empty).Replace('\n', ' ').Replace('\r', ' '));
        return string.Join(" | ", cols);
    }

    private static void PrintHelp()
    {
        Console.WriteLine(@"DashboardVerschuivingen - eenvoudige tool voor dagwijzigingen en Excel-vergelijking

Gebruik:
  DashboardVerschuivingen --data <pad> [--today] [--diff] [--key-col N]

Opties:
  --data <pad>    Map waar de planning-bestanden (*.xlsx) staan.
  --today         Toon bestanden die vandaag gemaakt/aangepast zijn (filesystem-tijd).
  --diff          Vergelijk de laatste twee bestanden met datum-prefix (yyyyMMdd_...).
  --key-col N     1-based index van sleutelkolom voor rij-vergelijking (optioneel).

Voorbeeld:
  DashboardVerschuivingen --data . --today --diff --key-col 1

Notities:
  - Excel wordt ingelezen zonder externe packages (zip+XML). Alleen het eerste werkblad.
  - Zonder sleutelkolom worden rijen vergeleken op volledige inhoud (multiset).

");
    }
}

