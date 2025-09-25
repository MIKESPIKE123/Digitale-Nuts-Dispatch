namespace DashboardVerschuivingen.Services;

public static class DiffService
{
    public sealed record ModifiedRow(string Key, IReadOnlyList<string> OldRow, IReadOnlyList<string> NewRow);

    public sealed record DiffResult(
        IReadOnlyList<IReadOnlyList<string>> Added,
        IReadOnlyList<IReadOnlyList<string>> Removed,
        IReadOnlyList<ModifiedRow> Modified)
    {
        public int AddedCount => Added.Count;
        public int RemovedCount => Removed.Count;
        public int ModifiedCount => Modified.Count;
    }

    public static DiffResult DiffRows(IReadOnlyList<IReadOnlyList<string>> a,
                                      IReadOnlyList<IReadOnlyList<string>> b,
                                      int keyColIndex1Based = -1)
    {
        if (keyColIndex1Based > 0)
        {
            return DiffByKey(a, b, keyColIndex1Based - 1);
        }
        else
        {
            return DiffByMultiset(a, b);
        }
    }

    private static DiffResult DiffByKey(IReadOnlyList<IReadOnlyList<string>> a,
                                        IReadOnlyList<IReadOnlyList<string>> b,
                                        int keyIdx)
    {
        var mapA = a.Skip(1).Where(r => keyIdx < r.Count).ToDictionary(r => r[keyIdx], r => r);
        var mapB = b.Skip(1).Where(r => keyIdx < r.Count).ToDictionary(r => r[keyIdx], r => r);

        var added = new List<IReadOnlyList<string>>();
        var removed = new List<IReadOnlyList<string>>();
        var modified = new List<ModifiedRow>();

        foreach (var (key, rowB) in mapB)
        {
            if (!mapA.TryGetValue(key, out var rowA))
            {
                added.Add(rowB);
            }
            else if (!RowsEqual(rowA, rowB))
            {
                modified.Add(new ModifiedRow(key, rowA, rowB));
            }
        }

        foreach (var (key, rowA) in mapA)
        {
            if (!mapB.ContainsKey(key))
            {
                removed.Add(rowA);
            }
        }

        return new DiffResult(added, removed, modified);
    }

    private static DiffResult DiffByMultiset(IReadOnlyList<IReadOnlyList<string>> a,
                                             IReadOnlyList<IReadOnlyList<string>> b)
    {
        static string KeyForRow(IReadOnlyList<string> row) => string.Join("\u001F", row);

        var multA = new Dictionary<string, int>();
        foreach (var r in a.Skip(1))
        {
            var k = KeyForRow(r);
            multA[k] = multA.TryGetValue(k, out var c) ? c + 1 : 1;
        }

        var multB = new Dictionary<string, int>();
        foreach (var r in b.Skip(1))
        {
            var k = KeyForRow(r);
            multB[k] = multB.TryGetValue(k, out var c) ? c + 1 : 1;
        }

        var added = new List<IReadOnlyList<string>>();
        var removed = new List<IReadOnlyList<string>>();

        foreach (var (k, cB) in multB)
        {
            var cA = multA.TryGetValue(k, out var c) ? c : 0;
            for (int i = 0; i < Math.Max(0, cB - cA); i++)
            {
                added.Add(k.Split('\u001F'));
            }
        }
        foreach (var (k, cA) in multA)
        {
            var cB = multB.TryGetValue(k, out var c) ? c : 0;
            for (int i = 0; i < Math.Max(0, cA - cB); i++)
            {
                removed.Add(k.Split('\u001F'));
            }
        }

        return new DiffResult(added, removed, new List<ModifiedRow>());
    }

    private static bool RowsEqual(IReadOnlyList<string> a, IReadOnlyList<string> b)
    {
        if (a.Count != b.Count) return false;
        for (int i = 0; i < a.Count; i++)
        {
            if (!string.Equals(a[i], b[i], StringComparison.Ordinal)) return false;
        }
        return true;
    }
}
