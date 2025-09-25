using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace DashboardVerschuivingen.Services;

public static class FileChangeService
{
    public sealed record FileChange(string FullPath, DateTime LastWriteTime);

    public static IEnumerable<FileChange> ListChangedToday(string directory, IEnumerable<string>? extensionsFilter = null)
    {
        var today = DateTime.Today;
        var allowed = extensionsFilter?.Select(e => e.ToLowerInvariant()).ToHashSet() ?? new HashSet<string>();

        foreach (var file in Directory.EnumerateFiles(directory, "*", SearchOption.TopDirectoryOnly))
        {
            var ext = Path.GetExtension(file).ToLowerInvariant();
            if (allowed.Count > 0 && !allowed.Contains(ext)) continue;

            var info = new FileInfo(file);
            var last = info.LastWriteTime.Date;
            var created = info.CreationTime.Date;
            if (last == today || created == today)
            {
                yield return new FileChange(file, info.LastWriteTime);
            }
        }
    }
}
