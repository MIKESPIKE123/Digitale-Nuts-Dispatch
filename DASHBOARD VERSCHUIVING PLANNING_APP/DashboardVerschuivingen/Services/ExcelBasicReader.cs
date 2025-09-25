using System.IO.Compression;
using System.Xml;

namespace DashboardVerschuivingen.Services;

public sealed class ExcelBasicReader
{
    public IReadOnlyList<IReadOnlyList<string>> ReadFirstWorksheetRows(string xlsxPath, int maxRows = 100000, int maxCols = 256)
    {
        if (!File.Exists(xlsxPath)) throw new FileNotFoundException("Excel bestand niet gevonden", xlsxPath);

        using var fs = File.OpenRead(xlsxPath);
        using var zip = new ZipArchive(fs, ZipArchiveMode.Read, leaveOpen: false);

        var sharedStrings = ReadSharedStrings(zip);
        var sheetEntry = zip.Entries
            .Where(e => e.FullName.StartsWith("xl/worksheets/sheet", StringComparison.OrdinalIgnoreCase) && e.FullName.EndsWith(".xml", StringComparison.OrdinalIgnoreCase))
            .OrderBy(e => SheetNumber(e.FullName))
            .FirstOrDefault();

        if (sheetEntry is null)
            return Array.Empty<IReadOnlyList<string>>();

        return ReadSheetRows(sheetEntry, sharedStrings, maxRows, maxCols);
    }

    private static int SheetNumber(string fullName)
    {
        // e.g. xl/worksheets/sheet1.xml -> 1
        var name = Path.GetFileNameWithoutExtension(fullName);
        var digits = new string(name.Where(char.IsDigit).ToArray());
        return int.TryParse(digits, out var n) ? n : int.MaxValue;
    }

    private static List<string> ReadSharedStrings(ZipArchive zip)
    {
        var list = new List<string>();
        var entry = zip.GetEntry("xl/sharedStrings.xml");
        if (entry is null) return list;

        using var s = entry.Open();
        using var reader = XmlReader.Create(s, new XmlReaderSettings { IgnoreWhitespace = true });
        while (reader.Read())
        {
            if (reader.NodeType == XmlNodeType.Element && reader.Name == "t")
            {
                var val = reader.ReadElementContentAsString();
                list.Add(val);
            }
        }
        return list;
    }

    private static IReadOnlyList<IReadOnlyList<string>> ReadSheetRows(ZipArchiveEntry sheetEntry, List<string> sharedStrings, int maxRows, int maxCols)
    {
        var rows = new List<IReadOnlyList<string>>();
        using var s = sheetEntry.Open();
        using var reader = XmlReader.Create(s, new XmlReaderSettings { IgnoreWhitespace = true });

        Dictionary<int, string> currentRow = new();
        int currentRowIndex = 0;
        int maxColIndex = 0;

        while (reader.Read())
        {
            if (reader.NodeType == XmlNodeType.Element && reader.Name == "row")
            {
                currentRow = new Dictionary<int, string>();
                currentRowIndex++;
            }
            else if (reader.NodeType == XmlNodeType.EndElement && reader.Name == "row")
            {
                if (currentRow.Count > 0)
                {
                    maxColIndex = Math.Max(maxColIndex, currentRow.Keys.DefaultIfEmpty(0).Max());
                    rows.Add(ToList(currentRow, Math.Min(maxCols, Math.Max(maxColIndex + 1, 1))));
                    if (rows.Count >= maxRows) break;
                }
            }
            else if (reader.NodeType == XmlNodeType.Element && reader.Name == "c")
            {
                var cellRef = reader.GetAttribute("r") ?? string.Empty; // e.g., A1
                var tAttr = reader.GetAttribute("t");
                var colIndex = ColumnIndexFromRef(cellRef);

                string? value = null;
                bool isEmpty = reader.IsEmptyElement;
                if (!isEmpty)
                {
                    while (reader.Read())
                    {
                        if (reader.NodeType == XmlNodeType.Element && reader.Name == "v")
                        {
                            var raw = reader.ReadElementContentAsString();
                            value = ConvertCellValue(raw, tAttr, sharedStrings);
                        }
                        else if (reader.NodeType == XmlNodeType.EndElement && reader.Name == "c")
                        {
                            break;
                        }
                    }
                }

                if (colIndex >= 0 && colIndex < maxCols)
                {
                    if (!string.IsNullOrEmpty(value))
                    {
                        currentRow[colIndex] = value;
                    }
                    else if (!currentRow.ContainsKey(colIndex))
                    {
                        currentRow[colIndex] = string.Empty;
                    }
                }
            }
        }

        return rows;
    }

    private static int ColumnIndexFromRef(string cellRef)
    {
        // Extract letters from reference and convert A->0, B->1, ..., AA->26
        var letters = new string(cellRef.TakeWhile(char.IsLetter).ToArray());
        if (string.IsNullOrEmpty(letters)) return -1;
        int idx = 0;
        foreach (var ch in letters)
        {
            idx = idx * 26 + (char.ToUpperInvariant(ch) - 'A' + 1);
        }
        return idx - 1;
    }

    private static string ConvertCellValue(string raw, string? type, List<string> sharedStrings)
    {
        if (type == "s") // shared string
        {
            if (int.TryParse(raw, out var i) && i >= 0 && i < sharedStrings.Count)
                return sharedStrings[i];
            return raw;
        }
        // default: return as-is (numeric, inlineStr, etc.)
        return raw;
    }

    private static IReadOnlyList<string> ToList(Dictionary<int, string> row, int width)
    {
        var list = new string[width];
        for (int i = 0; i < width; i++) list[i] = string.Empty;
        foreach (var kv in row)
        {
            if (kv.Key >= 0 && kv.Key < width) list[kv.Key] = kv.Value;
        }
        return list;
    }
}
